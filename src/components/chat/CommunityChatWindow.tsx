import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Hash, MoreVertical, Plus, Smile, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Message {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    profiles: {
        username: string;
        full_name: string;
        avatar_url: string;
    };
}

const MessageItem = React.memo(({
    msg,
    showAvatar
}: {
    msg: Message;
    showAvatar: boolean;
}) => (
    <div className="flex items-start gap-3">
        {showAvatar ? (
            <Avatar className="h-9 w-9 border-2 border-background shadow-sm mt-1">
                <AvatarImage src={msg.profiles.avatar_url} className="object-cover" />
                <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold font-mono">
                    {msg.profiles.full_name?.[0]}
                </AvatarFallback>
            </Avatar>
        ) : (
            <div className="w-9" />
        )}
        <div className="flex-1 space-y-1">
            {showAvatar && (
                <div className="flex items-center gap-2">
                    <span className="font-bold text-[13px]">{msg.profiles.full_name}</span>
                    <span className="text-[10px] text-muted-foreground">
                        {format(new Date(msg.created_at), 'h:mm a')}
                    </span>
                </div>
            )}
            <div className={`p-3 rounded-2xl text-sm shadow-sm inline-block max-w-[85%] ${showAvatar ? 'rounded-tl-none' : ''
                } bg-white dark:bg-card border border-border/40`}>
                {msg.content}
            </div>
        </div>
    </div>
));

MessageItem.displayName = "MessageItem";

export function CommunityChatWindow({ community, channels, activeChannelId }: { community: any, channels: any[], activeChannelId?: string }) {
    const queryClient = useQueryClient();
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const currentChannelId = activeChannelId || channels[0]?.id;

    const { data: messages = [], refetch } = useQuery({
        queryKey: ["community_messages", currentChannelId],
        queryFn: async () => {
            if (!currentChannelId) return [];
            const { data, error } = await supabase
                .from('messages' as any)
                .select(`
                    id,
                    content,
                    created_at,
                    sender_id,
                    profiles:sender_id (
                        username,
                        full_name,
                        avatar_url
                    )
                `)
                .eq('channel_id', currentChannelId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data as any[] as Message[];
        },
        enabled: !!currentChannelId
    });

    useEffect(() => {
        if (!currentChannelId) return;

        const channel = supabase.channel(`channel_${currentChannelId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `channel_id=eq.${currentChannelId}`
            }, () => {
                refetch();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentChannelId, refetch]);

    // Optimized Scroll Logic
    const scrollToBottom = useCallback(() => {
        if (scrollRef.current) {
            const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                requestAnimationFrame(() => {
                    viewport.scrollTop = viewport.scrollHeight;
                });
            }
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentChannelId || sending) return;

        setSending(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('messages' as any)
                .insert({
                    content: newMessage,
                    sender_id: user.id,
                    channel_id: currentChannelId
                });

            if (error) throw error;
            setNewMessage("");
            refetch();
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] dark:bg-card/30">
            {/* Channel Bar */}
            <div className="flex gap-2 p-3 bg-white dark:bg-card border-b overflow-x-auto no-scrollbar">
                {channels.map(channel => (
                    <Button
                        key={channel.id}
                        variant={currentChannelId === channel.id ? "default" : "ghost"}
                        size="sm"
                        className={`rounded-xl h-9 px-4 gap-2 transition-all ${currentChannelId === channel.id
                            ? "bg-primary text-white hover:bg-primary/90 shadow-sm"
                            : "text-muted-foreground hover:bg-muted/50"
                            }`}
                        onClick={() => navigate(`/messages/community/${community.id}/channel/${channel.id}`)}
                    >
                        <Hash className="w-4 h-4 opacity-70" />
                        <span className="font-bold text-xs">{channel.name}</span>
                    </Button>
                ))}
            </div>

            {/* Messages Area */}
            <ScrollArea ref={scrollRef} className="flex-1 p-4">
                <div className="space-y-6">
                    {messages.map((msg, idx) => {
                        const showAvatar = idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;
                        return (
                            <MessageItem
                                key={msg.id}
                                msg={msg}
                                showAvatar={showAvatar}
                            />
                        );
                    })}

                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground opacity-30">
                            <Hash className="w-16 h-16 mb-2" />
                            <p className="text-sm font-bold">No messages here yet</p>
                            <p className="text-xs">Be the first to say something!</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input Bar */}
            <div className="p-4 bg-white dark:bg-card border-t">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground rounded-full h-10 w-10">
                        <Plus className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 relative flex items-center">
                        <Input
                            placeholder={`Message #${channels.find(c => c.id === currentChannelId)?.name || 'channel'}`}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="bg-muted/40 border-none h-11 pr-10 rounded-2xl shadow-inner focus-visible:ring-1 focus-visible:ring-primary/30"
                        />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 text-muted-foreground rounded-full h-8 w-8">
                            <Smile className="h-5 w-5" />
                        </Button>
                    </div>
                    <Button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        size="icon"
                        className="h-11 w-11 rounded-full bg-primary hover:bg-primary/90 text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
