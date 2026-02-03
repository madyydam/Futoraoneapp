import { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Send, ArrowLeft, Check, CheckCheck, Image as ImageIcon, Palette, LayoutDashboard, Edit3, X, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { MessageBubble, MessageType } from "@/components/chat/MessageBubble";
import ChatWallpaperPicker from "@/components/chat/ChatWallpaperPicker";
import { RoomIntelligence } from "@/components/chat/RoomIntelligence";
import { Badge } from "@/components/ui/badge";

interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    read_at: string | null;
    message_type?: MessageType;
}

interface Profile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
}

export const ChatWindow = memo(({ conversationId, currentUserId }: { conversationId: string; currentUserId: string }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [otherUser, setOtherUser] = useState<Profile | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { toast } = useToast();

    const [isBlocked, setIsBlocked] = useState(false);

    // Customization state
    const [wallpaper, setWallpaper] = useState("transparent");
    const [bubbleColor, setBubbleColor] = useState("");
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(false);
    const [roomName, setRoomName] = useState<string | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);

    const markAsRead = useCallback(async (messageId: string) => {
        await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', messageId);

        await supabase
            .from('conversation_participants')
            .update({ last_read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .eq('user_id', currentUserId);
    }, [conversationId, currentUserId]);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    }, []);

    const fetchOtherUser = useCallback(async () => {
        const { data: participantData } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .neq('user_id', currentUserId)
            .maybeSingle();

        if (participantData?.user_id) {
            const { data: profileData } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .eq('id', participantData.user_id)
                .maybeSingle();

            if (profileData) {
                setOtherUser(profileData as unknown as Profile);
            } else {
                setOtherUser({
                    id: participantData.user_id,
                    username: 'user',
                    full_name: 'Developer',
                    avatar_url: null
                });
            }
        }

        const { data: convData } = await supabase
            .from('conversations')
            .select('name')
            .eq('id', conversationId)
            .maybeSingle();

        if (convData?.name) {
            setRoomName(convData.name);
        }
    }, [conversationId, currentUserId]);

    const fetchMessages = useCallback(async () => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data as Message[]);
            const unreadMessages = data.filter(m => m.sender_id !== currentUserId && !m.read_at);
            unreadMessages.forEach(m => markAsRead(m.id));
            scrollToBottom();
        }
    }, [conversationId, currentUserId, markAsRead, scrollToBottom]);

    const checkBlocks = useCallback(async () => {
        if (!otherUser) return;
        const { data: block1 } = await supabase.from('blocks').select('*').eq('blocker_id', currentUserId).eq('blocked_id', otherUser.id).maybeSingle();
        const { data: block2 } = await supabase.from('blocks').select('*').eq('blocker_id', otherUser.id).eq('blocked_id', currentUserId).maybeSingle();
        if (block1 || block2) setIsBlocked(true);
    }, [currentUserId, otherUser]);

    useEffect(() => {
        fetchMessages();
        fetchOtherUser();

        const savedWallpaper = localStorage.getItem(`futora_chat_wallpaper_${conversationId}`);
        if (savedWallpaper) setWallpaper(savedWallpaper);

        const savedColor = localStorage.getItem(`futora_chat_bubble_color_${conversationId}`);
        if (savedColor) setBubbleColor(savedColor);

        const channel = supabase
            .channel(`conversation:${conversationId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages((prev) => [...prev, newMsg]);
                    if (newMsg.sender_id !== currentUserId) markAsRead(newMsg.id);
                    scrollToBottom();
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
                (payload) => {
                    setMessages((prev) => prev.map(msg => msg.id === payload.new.id ? payload.new as Message : msg));
                }
            )
            .subscribe();

        const visualChannel = supabase
            .channel(`visual-sync-${conversationId}`)
            .on('broadcast', { event: 'visual_update' }, ({ payload }) => {
                if (payload.wallpaper) setWallpaper(payload.wallpaper);
                if (payload.bubbleColor) setBubbleColor(payload.bubbleColor);
            })
            .on('broadcast', { event: 'type_update' }, ({ payload }) => {
                setMessages(prev => prev.map(m =>
                    m.id === payload.id ? { ...m, message_type: payload.type } : m
                ));
            })
            .on('broadcast', { event: 'room_update' }, ({ payload }) => {
                if (payload.name) setRoomName(payload.name);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(visualChannel);
        };
    }, [conversationId, currentUserId, fetchMessages, fetchOtherUser, markAsRead, scrollToBottom]);

    useEffect(() => {
        if (otherUser) checkBlocks();
    }, [otherUser, checkBlocks]);

    const handleSend = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isBlocked) return;
        const messageContent = newMessage.trim();
        setNewMessage("");
        const { error } = await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: currentUserId,
            content: messageContent,
        });
        if (error) {
            setNewMessage(messageContent);
            toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
        } else {
            await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
        }
    }, [conversationId, currentUserId, isBlocked, newMessage, toast]);

    const handlePromote = useCallback(async (id: string, type: MessageType) => {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, message_type: type } : m));
        await supabase.from('messages').update({ message_type: type }).eq('id', id);
        supabase.channel(`visual-sync-${conversationId}`).send({
            type: 'broadcast',
            event: 'type_update',
            payload: { id, type }
        });
        toast({
            title: type === 'normal' ? "Reverted to Chat" : "Insight Logged!",
            description: type !== 'normal' ? `Message promoted to ${type}` : undefined
        });
    }, [conversationId, toast]);

    const renderedMessages = useMemo(() => (
        messages.map((msg) => (
            <MessageBubble
                key={msg.id}
                id={msg.id}
                content={msg.content}
                createdAt={msg.created_at}
                isMe={msg.sender_id === currentUserId}
                readAt={msg.read_at}
                bubbleColor={bubbleColor}
                messageType={msg.message_type}
                onPromote={handlePromote}
            />
        ))
    ), [messages, currentUserId, bubbleColor, handlePromote]);

    const saveWallpaper = (w: string) => {
        setWallpaper(w);
        localStorage.setItem(`futora_chat_wallpaper_${conversationId}`, w);
        supabase.channel(`visual-sync-${conversationId}`).send({
            type: 'broadcast',
            event: 'visual_update',
            payload: { wallpaper: w }
        });
        supabase.from('conversations').update({ wallpaper_config: { type: 'custom', value: w } }).eq('id', conversationId).then(({ error }) => {
            if (error) console.warn('DB wallpaper sync failed');
        });
    };

    const saveBubbleColor = (c: string) => {
        setBubbleColor(c);
        localStorage.setItem(`futora_chat_bubble_color_${conversationId}`, c);
        supabase.channel(`visual-sync-${conversationId}`).send({
            type: 'broadcast',
            event: 'visual_update',
            payload: { bubbleColor: c }
        });
        supabase.from('conversations').update({ bubble_config: { [currentUserId]: c } }).eq('id', conversationId).then(({ error }) => {
            if (error) console.warn('DB bubble sync failed');
        });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[600px] bg-background relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center p-4 border-b bg-card/50 backdrop-blur-sm relative z-20">
                <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => navigate('/messages')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                {otherUser && (
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={otherUser.avatar_url || undefined} />
                            <AvatarFallback>{otherUser.username[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            {isEditingName ? (
                                <Input
                                    className="h-8 py-0 focus-visible:ring-primary w-40"
                                    defaultValue={roomName || otherUser.full_name}
                                    onBlur={(e) => {
                                        const newName = e.target.value;
                                        setRoomName(newName);
                                        setIsEditingName(false);
                                        supabase.from('conversations').update({ name: newName }).eq('id', conversationId);
                                        supabase.channel(`visual-sync-${conversationId}`).send({
                                            type: 'broadcast',
                                            event: 'room_update',
                                            payload: { name: newName }
                                        });
                                    }}
                                    autoFocus
                                />
                            ) : (
                                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                                    <h3 className="font-semibold">{roomName || otherUser.full_name}</h3>
                                    <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">@{otherUser.username}</p>
                        </div>
                    </div>
                )}
                <div className="ml-auto flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsIntelligenceOpen(true)}
                        className="rounded-full text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110 relative"
                    >
                        <LayoutDashboard className="h-5 w-5" />
                        {messages.filter(m => m.message_type && m.message_type !== 'normal').length > 0 && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                        )}
                    </Button>

                    <Button variant="ghost" size="icon" onClick={() => setIsPickerOpen(true)} className="rounded-full text-muted-foreground hover:text-primary transition-colors">
                        <Palette className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Messages */}
            <ScrollArea
                className="flex-1 p-4 transition-all duration-500"
                style={{ background: wallpaper }}
            >
                <div className="space-y-4 relative z-10">
                    {renderedMessages}
                    <div ref={scrollRef} />
                </div>

                {wallpaper !== 'transparent' && (
                    <div className="absolute inset-0 bg-background/5 pointer-events-none" />
                )}
            </ScrollArea>

            {/* Appearance Picker */}
            <ChatWallpaperPicker
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                currentWallpaper={wallpaper}
                onSelectWallpaper={saveWallpaper}
                currentBubbleColor={bubbleColor}
                onSelectBubbleColor={saveBubbleColor}
            />

            {/* Input */}
            {isBlocked ? (
                <div className="p-4 border-t text-center text-muted-foreground bg-muted/50 relative z-20">
                    You cannot message this user.
                </div>
            ) : (
                <form onSubmit={handleSend} className="p-4 border-t flex gap-2 bg-card/50 backdrop-blur-sm relative z-20">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim()} className="gradient-primary">
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            )}

            <RoomIntelligence
                isOpen={isIntelligenceOpen}
                onClose={() => setIsIntelligenceOpen(false)}
                messages={messages}
            />
        </div>
    );
});

ChatWindow.displayName = "ChatWindow";
