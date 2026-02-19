import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    ArrowLeft, Send, Users, MoreVertical, Smile,
    ShieldCheck, Crown, Pin, X, ChevronRight,
    Settings, LogOut, Info, BadgeCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { GroupAdminPanel } from "@/components/chat/GroupAdminPanel";
import {
    DropdownMenu, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { format, isToday, isYesterday, isSameDay } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    is_pinned?: boolean;
    profiles?: { full_name: string; avatar_url: string | null };
}

interface Member {
    user_id: string;
    role: 'admin' | 'member';
    profiles: { full_name: string; avatar_url: string | null; username?: string };
}

interface Group {
    id: string;
    name: string;
    description: string;
    avatar_url: string | null;
    is_public: boolean;
    created_by: string;
    is_verified?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDateLabel(dateStr: string): string {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMMM d, yyyy');
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

const RoleBadge = memo(({ role }: { role: 'admin' | 'member' }) => {
    if (role === 'admin') return (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200/80">
            <Crown className="w-2 h-2" /> Admin
        </span>
    );
    return null;
});
RoleBadge.displayName = "RoleBadge";

// ─── Date Separator ───────────────────────────────────────────────────────────

const DateSeparator = memo(({ label }: { label: string }) => (
    <div className="flex items-center gap-3 my-4 px-2">
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest px-2 py-1 bg-muted/30 rounded-full">
            {label}
        </span>
        <div className="flex-1 h-px bg-border/50" />
    </div>
));
DateSeparator.displayName = "DateSeparator";

// ─── Message Bubble ───────────────────────────────────────────────────────────

const GroupMessage = memo(({ msg, isMe, showProfile, role }: {
    msg: Message;
    isMe: boolean;
    showProfile: boolean;
    role: 'admin' | 'member';
}) => (
    <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}
    >
        {/* Other user avatar */}
        {!isMe && (
            <div className="w-8 flex-shrink-0 self-end mb-0.5">
                {showProfile ? (
                    <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-card shadow-sm">
                        <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary font-bold">
                            {msg.profiles?.full_name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                ) : <div className="w-8" />}
            </div>
        )}

        <div className={`max-w-[75%] sm:max-w-[62%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
            {/* Sender name + role badge */}
            {showProfile && !isMe && (
                <div className="flex items-center gap-1.5 mb-1 ml-1">
                    <span className="text-[11px] font-bold text-primary/80">
                        {msg.profiles?.full_name}
                    </span>
                    <RoleBadge role={role} />
                </div>
            )}

            {/* Bubble */}
            <div className={`
                relative px-3.5 py-2.5 rounded-2xl text-sm shadow-sm group
                ${isMe
                    ? 'bg-gradient-to-br from-primary to-primary/85 text-white rounded-br-sm'
                    : 'bg-white dark:bg-card border border-border/40 rounded-bl-sm'
                }
                ${msg.is_pinned ? 'ring-1 ring-amber-400/60' : ''}
            `}>
                {msg.is_pinned && (
                    <span className="absolute -top-2 right-2 flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full border border-amber-200">
                        <Pin className="w-2 h-2" /> Pinned
                    </span>
                )}
                <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                <span className={`text-[9px] mt-1.5 block ${isMe ? 'text-white/50 text-right' : 'text-muted-foreground/50'}`}>
                    {format(new Date(msg.created_at), 'h:mm a')}
                </span>
            </div>
        </div>
    </motion.div>
));
GroupMessage.displayName = "GroupMessage";

// ─── Members Panel ────────────────────────────────────────────────────────────

const MemberRow = memo(({ member }: { member: Member }) => (
    <div className="flex items-center gap-2.5 py-2">
        <div className="relative flex-shrink-0">
            <Avatar className="h-8 w-8 ring-1 ring-border">
                <AvatarImage src={member.profiles.avatar_url || undefined} />
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary/15 to-violet-500/15 text-primary font-bold">
                    {member.profiles.full_name?.[0]?.toUpperCase()}
                </AvatarFallback>
            </Avatar>
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate">{member.profiles.full_name}</p>
        </div>
        <RoleBadge role={member.role} />
    </div>
));
MemberRow.displayName = "MemberRow";

// ─── Main Component ───────────────────────────────────────────────────────────

export function GroupChatWindow({ groupId, currentUserId }: { groupId: string; currentUserId: string }) {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [group, setGroup] = useState<Group | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    }, []);

    const markMessagesAsRead = useCallback(async () => {
        if (!currentUserId || !groupId) return;
        await supabase
            .from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('group_id', groupId)
            .neq('sender_id', currentUserId)
            .eq('is_read', false);
    }, [groupId, currentUserId]);

    const fetchGroupData = useCallback(async () => {
        try {
            // 1. Group info
            const { data: groupData, error: groupError } = await supabase
                .from('groups').select('*').eq('id', groupId).single();
            if (groupError) throw groupError;
            setGroup(groupData as Group);

            // 2. Messages (two-step: messages then profiles)
            const { data: messagesData, error: messagesError } = await supabase
                .from('messages')
                .select('id, content, sender_id, created_at, is_read, group_id')
                .eq('group_id', groupId)
                .order('created_at', { ascending: true });
            if (messagesError) throw messagesError;

            const senderIds = [...new Set((messagesData || []).map(m => m.sender_id))];
            let profilesMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
            if (senderIds.length > 0) {
                const { data: profilesData } = await supabase
                    .from('profiles').select('id, full_name, avatar_url').in('id', senderIds);
                (profilesData || []).forEach((p: any) => {
                    profilesMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
                });
            }
            setMessages((messagesData || []).map(m => ({
                ...m,
                profiles: profilesMap[m.sender_id] || { full_name: 'Unknown', avatar_url: null }
            })));

            // 3. Members with profiles
            const { data: membersData } = await supabase
                .from('group_members')
                .select('user_id, role')
                .eq('group_id', groupId);

            if (membersData && membersData.length > 0) {
                const memberIds = membersData.map((m: any) => m.user_id);
                const { data: memberProfiles } = await supabase
                    .from('profiles').select('id, full_name, avatar_url').in('id', memberIds);

                const profileMap: Record<string, any> = {};
                (memberProfiles || []).forEach((p: any) => { profileMap[p.id] = p; });

                const enrichedMembers: Member[] = membersData.map((m: any) => ({
                    user_id: m.user_id,
                    role: m.role,
                    profiles: profileMap[m.user_id] || { full_name: 'Unknown', avatar_url: null }
                }));

                // sort: admins first
                enrichedMembers.sort((a, b) => {
                    if (a.role === 'admin' && b.role !== 'admin') return -1;
                    if (b.role === 'admin' && a.role !== 'admin') return 1;
                    return 0;
                });

                setMembers(enrichedMembers);

                const me = membersData.find((m: any) => m.user_id === currentUserId);
                if (me) setUserRole(me.role as 'admin' | 'member');
            }

            markMessagesAsRead();
        } catch (error) {
            console.error("Error fetching group data:", error);
            toast.error("Failed to load group chat");
        } finally {
            setLoading(false);
            setTimeout(() => scrollToBottom("auto"), 120);
        }
    }, [groupId, markMessagesAsRead, currentUserId, scrollToBottom]);

    useEffect(() => {
        fetchGroupData();
        const channel = supabase
            .channel(`group-chat-${groupId}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'messages',
                filter: `group_id=eq.${groupId}`
            }, async (payload) => {
                const { data: profile } = await supabase
                    .from('profiles').select('full_name, avatar_url')
                    .eq('id', payload.new.sender_id).single();

                setMessages(prev => [...prev, {
                    ...(payload.new as any),
                    profiles: profile || { full_name: 'Unknown', avatar_url: null }
                }]);

                if (payload.new.sender_id !== currentUserId) {
                    markMessagesAsRead();
                    scrollToBottom();
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [groupId, fetchGroupData, currentUserId, markMessagesAsRead, scrollToBottom]);

    useEffect(() => { scrollToBottom(); }, [messages.length, scrollToBottom]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = newMessage.trim();
        if (!content || sending) return;

        setSending(true);
        setNewMessage("");
        inputRef.current?.focus();

        try {
            const { error } = await supabase.from('messages').insert({
                group_id: groupId,
                sender_id: currentUserId,
                content
            });
            if (error) throw error;
        } catch (err) {
            console.error("Error sending message:", err);
            toast.error("Failed to send message");
            setNewMessage(content);
        } finally {
            setSending(false);
        }
    };

    // Build role map for quick lookup
    const roleMap = useMemo(() => {
        const map: Record<string, 'admin' | 'member'> = {};
        members.forEach(m => { map[m.user_id] = m.role; });
        return map;
    }, [members]);

    // Group messages by date
    const messagesByDate = useMemo(() => {
        const groups: { label: string; messages: Message[] }[] = [];
        let currentLabel = '';
        let currentGroup: Message[] = [];

        messages.forEach(msg => {
            const label = getDateLabel(msg.created_at);
            if (label !== currentLabel) {
                if (currentGroup.length > 0) groups.push({ label: currentLabel, messages: currentGroup });
                currentLabel = label;
                currentGroup = [msg];
            } else {
                currentGroup.push(msg);
            }
        });
        if (currentGroup.length > 0) groups.push({ label: currentLabel, messages: currentGroup });
        return groups;
    }, [messages]);

    const pinnedMessages = useMemo(() => messages.filter(m => m.is_pinned), [messages]);

    if (loading) {
        return (
            <div className="flex flex-col h-[100dvh] items-center justify-center bg-background space-y-4">
                <div className="relative w-14 h-14">
                    <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <Users className="absolute inset-0 m-auto w-5 h-5 text-primary/60" />
                </div>
                <p className="text-sm text-muted-foreground font-medium animate-pulse">Loading group...</p>
            </div>
        );
    }

    return (
        <div className="flex h-[100dvh] bg-[#F0F2F5] dark:bg-background overflow-hidden">

            {/* ── Main Chat Column ─────────────────────────────────────────── */}
            <div className="flex flex-col flex-1 min-w-0">

                {/* Header */}
                <header className="flex items-center justify-between px-3 py-2 bg-white dark:bg-card border-b border-border/50 shadow-sm z-40 flex-shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/messages')}
                            className="rounded-full h-9 w-9 flex-shrink-0">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>

                        <div className="flex items-center gap-2.5 cursor-pointer min-w-0"
                            onClick={() => setShowMembers(s => !s)}>
                            <div className="relative flex-shrink-0">
                                <Avatar className="h-10 w-10 ring-2 ring-primary/20 shadow-sm">
                                    <AvatarImage src={group?.avatar_url || undefined} />
                                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary font-black">
                                        {group?.name?.[0]?.toUpperCase() || 'G'}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-card rounded-full" />
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <h3 className="font-bold text-[15px] truncate leading-tight max-w-[130px] sm:max-w-[200px]">
                                        {group?.name}
                                    </h3>
                                    {group?.is_verified && (
                                        <BadgeCheck className="w-4 h-4 text-violet-500 flex-shrink-0" />
                                    )}
                                </div>
                                <p className="text-[11px] text-muted-foreground font-medium">
                                    {members.length} members {group?.is_public ? '· Public' : '· Private'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => setShowMembers(s => !s)}
                            className={`rounded-full h-9 w-9 ${showMembers ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                        >
                            <Users className="h-4.5 w-4.5" />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full h-9 w-9">
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl">
                                <DropdownMenuItem className="gap-2">
                                    <Info className="h-4 w-4" /> Group Info
                                </DropdownMenuItem>
                                {userRole === 'admin' && (
                                    <DropdownMenuItem className="gap-2" onClick={() => setIsAdminPanelOpen(true)}>
                                        <Settings className="h-4 w-4" /> Edit Group
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                                    <LogOut className="h-4 w-4" /> Leave Group
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Pinned Messages Bar */}
                <AnimatePresence>
                    {pinnedMessages.length > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200/60 dark:border-amber-700/30 px-4 py-2 flex items-center gap-2 flex-shrink-0"
                        >
                            <Pin className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <p className="text-[12px] text-amber-800 dark:text-amber-300 font-medium truncate flex-1">
                                {pinnedMessages[0].content}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Messages Area */}
                <main className="flex-1 overflow-y-auto px-3 py-3 scrollbar-hide">
                    <div className="max-w-3xl mx-auto">

                        {/* Group join notice */}
                        <div className="flex flex-col items-center py-6 text-center space-y-1">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/10 to-violet-500/10 flex items-center justify-center shadow-inner mb-2">
                                <ShieldCheck className="w-6 h-6 text-primary/50" />
                            </div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{group?.name}</p>
                            <p className="text-[10px] text-muted-foreground/60">End-to-end encrypted · All messages are private</p>
                        </div>

                        {/* Date-grouped messages */}
                        {messagesByDate.map(({ label, messages: dayMsgs }) => (
                            <div key={label}>
                                <DateSeparator label={label} />
                                <div className="space-y-1.5">
                                    {dayMsgs.map((msg, idx) => {
                                        const isMe = msg.sender_id === currentUserId;
                                        const prevMsg = idx > 0 ? dayMsgs[idx - 1] : null;
                                        const showProfile = !isMe && (
                                            !prevMsg || prevMsg.sender_id !== msg.sender_id
                                        );
                                        const isLastInGroup = idx === dayMsgs.length - 1 ||
                                            dayMsgs[idx + 1].sender_id !== msg.sender_id;

                                        return (
                                            <div key={msg.id} className={isLastInGroup ? 'mb-3' : 'mb-0'}>
                                                <GroupMessage
                                                    msg={msg}
                                                    isMe={isMe}
                                                    showProfile={showProfile}
                                                    role={roleMap[msg.sender_id] || 'member'}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {messages.length === 0 && (
                            <div className="flex flex-col items-center py-10 text-center">
                                <p className="text-sm text-muted-foreground font-medium">No messages yet</p>
                                <p className="text-xs text-muted-foreground/60 mt-1">Be the first to say something! 👋</p>
                            </div>
                        )}

                        <div ref={messagesEndRef} className="h-2" />
                    </div>
                </main>

                {/* Input Bar */}
                <div className="bg-white dark:bg-card border-t border-border/40 px-3 py-2.5 flex-shrink-0">
                    <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center gap-2">
                        <Button type="button" variant="ghost" size="icon"
                            className="h-10 w-10 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0">
                            <Smile className="h-5 w-5" />
                        </Button>

                        <div className="flex-1 flex items-center bg-muted/40 border border-border/40 rounded-2xl px-4 min-w-0">
                            <Input
                                ref={inputRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Message the group..."
                                className="border-0 bg-transparent focus-visible:ring-0 px-0 py-3 text-[15px] placeholder:text-muted-foreground/40"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={!newMessage.trim() || sending}
                            className="h-10 w-10 p-0 rounded-full bg-gradient-to-br from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 shadow-md flex items-center justify-center transition-all active:scale-90 disabled:opacity-40 flex-shrink-0"
                        >
                            <Send className="h-4 w-4 text-white" />
                        </Button>
                    </form>
                </div>
            </div>

            {/* ── Members Sidebar ──────────────────────────────────────────── */}
            <AnimatePresence>
                {showMembers && (
                    <motion.aside
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 240, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                        className="h-full bg-white dark:bg-card border-l border-border/50 overflow-y-auto flex-shrink-0 z-30 scrollbar-hide"
                    >
                        <div className="p-4">
                            {/* Sidebar header */}
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[13px] font-black uppercase tracking-wider text-foreground/60">
                                    Members ({members.length})
                                </h3>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full"
                                    onClick={() => setShowMembers(false)}>
                                    <X className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </div>

                            {/* Admin section */}
                            {members.filter(m => m.role === 'admin').length > 0 && (
                                <div className="mb-4">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
                                        Admins
                                    </p>
                                    {members.filter(m => m.role === 'admin').map(member => (
                                        <MemberRow key={member.user_id} member={member} />
                                    ))}
                                </div>
                            )}

                            {/* Members section */}
                            {members.filter(m => m.role === 'member').length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
                                        Members
                                    </p>
                                    {members.filter(m => m.role === 'member').map(member => (
                                        <MemberRow key={member.user_id} member={member} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Edit Dialog */}
            {group && (
                <GroupAdminPanel
                    group={group}
                    open={isAdminPanelOpen}
                    onOpenChange={setIsAdminPanelOpen}
                    currentUserId={currentUserId}
                    onGroupUpdated={fetchGroupData}
                    onGroupDeleted={() => navigate('/messages')}
                />
            )}
        </div>
    );
}
