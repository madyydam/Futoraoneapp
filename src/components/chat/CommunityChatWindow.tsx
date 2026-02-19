import { useEffect, useState, useCallback, useRef, useMemo, memo } from "react";
import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Send, Hash, ShieldCheck, Shield,
    ChevronRight, ChevronLeft, Image as ImageIcon,
    Smile, Plus
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    profiles: { username: string; full_name: string; avatar_url: string };
}

interface Channel {
    id: string;
    name: string;
    description?: string;
}

interface Community {
    id: string;
    name: string;
    avatar_url?: string;
    is_verified?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDateLabel(dateStr: string): string {
    const d = new Date(dateStr);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMMM d, yyyy");
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

const CommunityRoleBadge = memo(({ role }: { role: string }) => {
    if (role === "admin") return (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            <ShieldCheck className="w-2 h-2" /> Admin
        </span>
    );
    if (role === "moderator") return (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200/60">
            <Shield className="w-2 h-2" /> Mod
        </span>
    );
    return null;
});
CommunityRoleBadge.displayName = "CommunityRoleBadge";

// ─── Date Separator ───────────────────────────────────────────────────────────

const DateSep = memo(({ label }: { label: string }) => (
    <div className="flex items-center gap-3 my-6 px-4">
        <div className="flex-1 h-px bg-border/20" />
        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] px-3 py-1 bg-muted/20 border border-border/10 rounded-full">
            {label}
        </span>
        <div className="flex-1 h-px bg-border/20" />
    </div>
));
DateSep.displayName = "DateSep";

// ─── Message Item ─────────────────────────────────────────────────────────────

const MessageItem = memo(({ msg, showHeader, roleMap }: {
    msg: Message;
    showHeader: boolean;
    roleMap: Record<string, string>;
}) => (
    <motion.div
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.15 }}
        className={`flex items-start gap-4 px-4 sm:px-6 py-0.5 group hover:bg-muted/10 transition-colors ${showHeader ? "mt-4" : "mt-0"}`}
    >
        {/* Avatar col */}
        <div className="w-10 flex-shrink-0">
            {showHeader ? (
                <Avatar className="h-10 w-10 rounded-[12px] border border-border/40 shadow-sm overflow-hidden">
                    <AvatarImage src={msg.profiles.avatar_url} className="object-cover" />
                    <AvatarFallback className="text-[11px] bg-gradient-to-br from-primary/10 to-violet-500/10 text-primary font-bold">
                        {msg.profiles.full_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                </Avatar>
            ) : (
                <div className="w-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] text-muted-foreground/30 font-bold">
                        {format(new Date(msg.created_at), "h:mm")}
                    </span>
                </div>
            )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col pt-0.5">
            {showHeader && (
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-black text-foreground/90 tracking-tight">
                        {msg.profiles.full_name}
                    </span>
                    <CommunityRoleBadge role={roleMap[msg.sender_id] || "member"} />
                    <span className="text-[10px] text-muted-foreground/40 font-medium">
                        {format(new Date(msg.created_at), "h:mm a")}
                    </span>
                </div>
            )}
            <p className="text-[14px] text-foreground/80 leading-[1.6] break-words whitespace-pre-wrap selection:bg-primary/20">
                {msg.content}
            </p>
        </div>
    </motion.div>
));
MessageItem.displayName = "MessageItem";

// ─── Main Component ───────────────────────────────────────────────────────────

export function CommunityChatWindow({
    community, channels, activeChannelId, currentUserId, memberRoles, hideSidebar = false
}: {
    community: Community;
    channels: Channel[];
    activeChannelId?: string;
    currentUserId?: string;
    memberRoles?: Record<string, string>;
    hideSidebar?: boolean;
}) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);

    // We only use this if hideSidebar is false (backward compatibility / direct use)
    const [internalSidebarOpen, setInternalSidebarOpen] = useState(true);
    const [internalChannelId, setInternalChannelId] = useState(activeChannelId || channels[0]?.id);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const effectiveChannelId = hideSidebar ? activeChannelId : internalChannelId;
    const currentChannel = channels.find(c => c.id === effectiveChannelId);
    const roleMap = memberRoles || {};

    const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    }, []);

    const fetchMessages = useCallback(async () => {
        if (!effectiveChannelId) return;
        setLoadingMessages(true);
        try {
            const { data, error } = await supabase
                .from("messages" as any)
                .select("id, content, created_at, sender_id")
                .eq("channel_id", effectiveChannelId)
                .order("created_at", { ascending: true });

            if (error) throw error;
            if (!data) {
                setMessages([]);
                return;
            }

            const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
            let profilesMap: Record<string, any> = {};
            if (senderIds.length) {
                const { data: profiles } = await supabase
                    .from("profiles").select("id, full_name, username, avatar_url").in("id", senderIds);
                (profiles || []).forEach((p: any) => (profilesMap[p.id] = p));
            }

            setMessages(data.map((m: any) => ({
                ...m,
                profiles: profilesMap[m.sender_id] || { full_name: "Unknown", username: "", avatar_url: "" }
            })));
        } catch (err) {
            console.error("Error fetching messages:", err);
            toast.error("Failed to load messages");
        } finally {
            setLoadingMessages(false);
        }
    }, [effectiveChannelId]);

    useEffect(() => { fetchMessages(); }, [fetchMessages]);
    useEffect(() => { scrollToBottom("instant"); }, [messages, scrollToBottom]);

    // Realtime subscription
    useEffect(() => {
        if (!effectiveChannelId) return;
        const channel = supabase
            .channel(`community-channel-${effectiveChannelId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: `channel_id=eq.${effectiveChannelId}`
            }, async (payload) => {
                const msg = payload.new as any;
                const { data: profile } = await supabase
                    .from("profiles").select("id, full_name, username, avatar_url").eq("id", msg.sender_id).single();
                setMessages(prev => [
                    ...prev,
                    { ...msg, profiles: profile || { full_name: "Unknown", username: "", avatar_url: "" } }
                ]);
                scrollToBottom();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [effectiveChannelId, scrollToBottom]);

    const handleSend = useCallback(async () => {
        const content = newMessage.trim();
        if (!content || !effectiveChannelId || !currentUserId) return;
        setSending(true);
        setNewMessage("");
        try {
            const { error } = await supabase.from("messages" as any).insert({
                channel_id: effectiveChannelId,
                sender_id: currentUserId,
                content
            });
            if (error) throw error;
        } catch (err) {
            console.error("Send error:", err);
            setNewMessage(content);
            toast.error("Failed to send message");
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    }, [newMessage, effectiveChannelId, currentUserId]);

    const groupedMessages = useMemo(() => {
        const groups: { label: string; msgs: Message[] }[] = [];
        messages.forEach(msg => {
            const label = getDateLabel(msg.created_at);
            const last = groups[groups.length - 1];
            if (!last || last.label !== label) {
                groups.push({ label, msgs: [msg] });
            } else {
                last.msgs.push(msg);
            }
        });
        return groups;
    }, [messages]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex h-full flex-1 overflow-hidden bg-background">
            <div className="flex-1 flex flex-col min-w-0 bg-transparent relative">

                {/* Messages List Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="min-h-full flex flex-col justify-end py-6">
                        {loadingMessages ? (
                            <div className="flex-1 flex items-center justify-center p-20">
                                <div className="h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                            </div>
                        ) : groupedMessages.length === 0 ? (
                            <div className="p-10 flex flex-col items-start gap-3">
                                <div className="h-20 w-20 rounded-[24px] bg-primary/5 border border-primary/10 flex items-center justify-center mb-2">
                                    <Hash className="h-10 w-10 text-primary opacity-30" />
                                </div>
                                <h2 className="text-3xl font-black tracking-tighter">Welcome to #{currentChannel?.name || "the channel"}!</h2>
                                <p className="text-muted-foreground/60 max-w-sm font-medium">
                                    This is the start of the <span className="text-primary font-black">#{currentChannel?.name}</span> channel.
                                    {currentChannel?.description ? ` ${currentChannel.description}` : " Get the conversation started!"}
                                </p>
                                <div className="h-px w-full bg-border/20 my-4" />
                            </div>
                        ) : (
                            groupedMessages.map(group => (
                                <div key={group.label}>
                                    <DateSep label={group.label} />
                                    {group.msgs.map((msg, i) => {
                                        const prev = group.msgs[i - 1];
                                        const showHeader = !prev || prev.sender_id !== msg.sender_id ||
                                            new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 10 * 60 * 1000;
                                        return (
                                            <MessageItem
                                                key={msg.id}
                                                msg={msg}
                                                showHeader={showHeader}
                                                roleMap={roleMap}
                                            />
                                        );
                                    })}
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Modern Integrated Input Area */}
                <div className="px-4 pb-4 pt-1 bg-gradient-to-t from-background via-background to-transparent">
                    <div className="flex flex-col gap-2 bg-card/60 border border-border/40 rounded-[24px] p-2 transition-all focus-within:shadow-lg focus-within:border-primary/30 focus-within:bg-card">
                        <textarea
                            ref={inputRef}
                            rows={1}
                            value={newMessage}
                            onChange={(e) => {
                                setNewMessage(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={`Message #${currentChannel?.name || "the lobby"}`}
                            disabled={!currentUserId || sending}
                            className="w-full bg-transparent border-0 resize-none px-4 py-2.5 text-sm focus:ring-0 placeholder:text-muted-foreground/30 font-medium selection:bg-primary/20 custom-scrollbar"
                            style={{ maxHeight: '200px' }}
                        />

                        <div className="flex items-center justify-between gap-2 px-2 pb-1">
                            <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-primary">
                                    <Plus className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-primary">
                                    <ImageIcon className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground/40 hover:text-primary">
                                    <Smile className="w-4 h-4" />
                                </Button>
                            </div>

                            <Button
                                onClick={handleSend}
                                disabled={!newMessage.trim() || sending}
                                className={`rounded-xl px-4 h-8 text-[11px] font-black uppercase tracking-wider transition-all ${newMessage.trim()
                                    ? 'bg-primary text-white shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-blue-600'
                                    : 'bg-muted text-muted-foreground opacity-50'
                                    }`}
                            >
                                {sending ? '...' : (
                                    <>
                                        Send
                                        <Send className="w-3 h-3 ml-2" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
