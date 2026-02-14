import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Users, MoreVertical, Image as ImageIcon, Smile, Phone, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { EditGroupDialog } from "@/components/chat/EditGroupDialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, Info } from "lucide-react";

interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    profiles?: {
        full_name: string;
        avatar_url: string | null;
    };
}

interface Group {
    id: string;
    name: string;
    description: string;
    avatar_url: string | null;
    is_public: boolean;
}

export function GroupChatWindow({ groupId, currentUserId }: { groupId: string; currentUserId: string }) {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [group, setGroup] = useState<Group | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    const fetchGroupData = useCallback(async () => {
        try {
            // 1. Fetch Group Details
            const { data: groupData, error: groupError } = await supabase
                .from('groups')
                .select('*')
                .eq('id', groupId)
                .single();

            if (groupError) throw groupError;
            setGroup(groupData as Group);

            // 2. Fetch Messages with Sender Profiles
            const { data: messagesData, error: messagesError } = await supabase
                .from('messages')
                .select(`
                    *,
                    profiles:sender_id (
                        full_name,
                        avatar_url
                    )
                `)
                .eq('group_id', groupId)
                .order('created_at', { ascending: true });

            if (messagesError) throw messagesError;
            setMessages(messagesData as Message[]);

            // 3. Fetch current user role
            const { data: memberData } = await supabase
                .from('group_members')
                .select('role')
                .eq('group_id', groupId)
                .eq('user_id', currentUserId)
                .single();

            if (memberData) {
                setUserRole(memberData.role as 'admin' | 'member');
            }
        } catch (error) {
            console.error("Error fetching group data:", error);
            toast.error("Failed to load group chat");
        } finally {
            setLoading(false);
            setTimeout(() => scrollToBottom("auto"), 100);
        }
    }, [groupId]);

    useEffect(() => {
        fetchGroupData();

        // 3. Subscribe to Real-time Messages
        const channel = supabase
            .channel(`group-${groupId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `group_id=eq.${groupId}`
                },
                async (payload) => {
                    // Fetch profile for the new message
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url')
                        .eq('id', payload.new.sender_id)
                        .single();

                    const enrichedMsg: Message = {
                        ...(payload.new as any),
                        profiles: profile as { full_name: string; avatar_url: string | null }
                    };

                    setMessages(prev => [...prev, enrichedMsg]);
                    if (payload.new.sender_id !== currentUserId) {
                        scrollToBottom();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [groupId, fetchGroupData, currentUserId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages.length]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        const content = newMessage.trim();
        setNewMessage("");

        try {
            const { error } = await supabase
                .from('messages')
                .insert({
                    group_id: groupId,
                    sender_id: currentUserId,
                    content: content
                });

            if (error) throw error;
            scrollToBottom();
            toast.error("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-screen items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground animate-pulse">Connecting to group...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-[#F3F4F6] dark:bg-background overflow-hidden">
            {/* Header - Fixed */}
            <header className="flex items-center justify-between p-3 sm:p-4 bg-white dark:bg-card border-b border-border shadow-sm z-50">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/messages')} className="rounded-full hover:bg-muted">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                            <Avatar className="h-10 w-10 border-2 border-primary/20 transition-transform group-hover:scale-105">
                                <AvatarImage src={group?.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">{group?.name?.[0] || 'G'}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-card rounded-full" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-[15px] leading-tight truncate max-w-[150px] sm:max-w-[250px]">
                                {group?.name}
                            </h3>
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                                {group?.description?.substring(0, 30) || 'Active community'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="hidden sm:flex text-muted-foreground rounded-full"><Video className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="icon" className="hidden sm:flex text-muted-foreground rounded-full"><Phone className="h-5 w-5" /></Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground rounded-full">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-border/50">
                            <DropdownMenuItem className="gap-2 focus:bg-primary/10">
                                <Info className="h-4 w-4" />
                                Group Info
                            </DropdownMenuItem>
                            {userRole === 'admin' && (
                                <DropdownMenuItem
                                    className="gap-2 focus:bg-primary/10"
                                    onClick={() => setIsEditDialogOpen(true)}
                                >
                                    <Settings className="h-4 w-4" />
                                    Edit Group
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                                <LogOut className="h-4 w-4" />
                                Leave Group
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Messages Area */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                <div className="max-w-3xl mx-auto space-y-4">
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 opacity-60">
                        <Users className="w-8 h-8 text-primary/40" />
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                            You joined {group?.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Encryption is active. All chats are private.</p>
                    </div>

                    <AnimatePresence initial={false}>
                        {messages.map((msg, idx) => {
                            const isMe = msg.sender_id === currentUserId;
                            const showProfile = !isMe && (idx === 0 || messages[idx - 1].sender_id !== msg.sender_id);

                            return (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2 mb-1`}
                                >
                                    {!isMe && (
                                        <div className="w-8 flex-shrink-0">
                                            {showProfile && (
                                                <Avatar className="h-8 w-8 border border-border shadow-sm">
                                                    <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                                                    <AvatarFallback className="text-[10px] bg-muted">{msg.profiles?.full_name?.[0]}</AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                    )}

                                    <div className={`max-w-[75%] sm:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                                        {showProfile && (
                                            <span className="text-[10px] font-bold text-primary/70 mb-1 ml-1 block">
                                                {msg.profiles?.full_name}
                                            </span>
                                        )}
                                        <div className={`
                                            px-4 py-2.5 rounded-2xl shadow-sm text-sm relative group
                                            ${isMe
                                                ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                : 'bg-white dark:bg-card border border-border/50 rounded-tl-none'}
                                        `}>
                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                            <div className={`
                                                absolute bottom-[-18px] ${isMe ? 'right-0' : 'left-0'} 
                                                text-[9px] text-muted-foreground font-medium opacity-0 group-hover:opacity-100 transition-opacity
                                            `}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </main>

            {/* Input Area */}
            <div className="bg-white dark:bg-card border-t border-border p-3 sm:p-4 pb-8 sm:pb-4">
                <form
                    onSubmit={handleSendMessage}
                    className="max-w-3xl mx-auto flex items-center gap-2 bg-muted/30 p-1.5 pl-4 rounded-2xl border border-border/50 shadow-inner"
                >
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground rounded-full shrink-0">
                        <Smile className="h-5 w-5" />
                    </Button>
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent border-none focus-visible:ring-0 px-0 placeholder:text-muted-foreground/50 text-[15px]"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground rounded-full hidden sm:flex">
                            <ImageIcon className="h-5 w-5" />
                        </Button>
                        <Button
                            type="submit"
                            disabled={!newMessage.trim() || sending}
                            className="h-9 w-9 rounded-full gradient-primary shadow-lg p-0 flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50"
                        >
                            <Send className="h-4 w-4 text-white" />
                        </Button>
                    </div>
                </form>
            </div>

            {group && (
                <EditGroupDialog
                    group={group}
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    onGroupUpdated={fetchGroupData}
                />
            )}
        </div>
    );
}
