import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Heart, Palette, LayoutDashboard, Edit3, MoreVertical, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { CartoonLoader } from "@/components/CartoonLoader";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { sendMessageNotification } from "@/services/notification.service";
import { MessageBubble, MessageType } from "@/components/chat/MessageBubble";
import ChatWallpaperPicker from "@/components/chat/ChatWallpaperPicker";
import { RoomIntelligence } from "@/components/chat/RoomIntelligence";
import { useRoomCategories } from "@/hooks/useRoomCategories";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  message_type?: MessageType;
}

interface OtherUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

const Chat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTechMatch, setIsTechMatch] = useState(false);

  // Customization state
  const [wallpaper, setWallpaper] = useState("transparent");
  const [bubbleColor, setBubbleColor] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isIntelligenceOpen, setIsIntelligenceOpen] = useState(false);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { typingUsers, broadcastTyping } = useTypingIndicator(conversationId || "", user?.id);
  const { categories } = useRoomCategories(conversationId);
  const isTyping = typingUsers.length > 0;

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && conversationId) {
      fetchConversationDetails();
      const cleanup = subscribeToMessages();
      markMessagesAsRead();

      // Load saved customization
      const savedWallpaper = localStorage.getItem(`futora_chat_wallpaper_${conversationId}`);
      if (savedWallpaper) setWallpaper(savedWallpaper);

      const savedBubbleColor = localStorage.getItem(`futora_chat_bubble_color_${conversationId}`);
      if (savedBubbleColor) setBubbleColor(savedBubbleColor);

      return cleanup;
    }
  }, [user, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
  };

  const fetchConversationDetails = async () => {
    if (!user || !conversationId) return;

    const { data: participantData } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", user.id)
      .maybeSingle();

    if (participantData?.user_id) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", participantData.user_id)
        .maybeSingle();

      if (profileData) {
        setOtherUser(profileData as unknown as OtherUser);
      } else {
        setOtherUser({
          id: participantData.user_id,
          username: "user",
          full_name: "Developer",
          avatar_url: null
        });
      }
    }

    const { data: messagesData } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesData) {
      setMessages(messagesData);
    }

    const { data: convData } = await supabase
      .from('conversations')
      .select('name')
      .eq('id', conversationId)
      .maybeSingle();

    if (convData?.name) {
      setRoomName(convData.name);
    }

    setLoading(false);
  };

  const subscribeToMessages = () => {
    const messageChannel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          if (payload.new.sender_id !== user?.id) {
            setMessages(prev => [...prev, payload.new as Message]);
            markMessagesAsRead();
          }
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
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(visualChannel);
    };
  };

  const markMessagesAsRead = async () => {
    if (!user || !conversationId) return;
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !conversationId || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage("");

    const { data, error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: messageContent,
      is_read: false
    }).select().single();

    if (error) {
      setNewMessage(messageContent);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setMessages(prev => [...prev, data as Message]);
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
      if (otherUser && user) {
        sendMessageNotification(otherUser.id, user.user_metadata?.full_name || user.email || "Someone", messageContent);
      }
    }
    setSending(false);
  };

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const saveWallpaper = async (w: string) => {
    setWallpaper(w);
    localStorage.setItem(`futora_chat_wallpaper_${conversationId}`, w);
    supabase.channel(`visual-sync-${conversationId}`).send({
      type: 'broadcast',
      event: 'visual_update',
      payload: { wallpaper: w }
    });
    try {
      await supabase.from('conversations').update({
        wallpaper_config: { type: 'custom', value: w }
      }).eq('id', conversationId);
    } catch (err) {
      console.warn('DB wallpaper sync failed');
    }
  };

  const saveBubbleColor = async (c: string) => {
    setBubbleColor(c);
    localStorage.setItem(`futora_chat_bubble_color_${conversationId}`, c);
    supabase.channel(`visual-sync-${conversationId}`).send({
      type: 'broadcast',
      event: 'visual_update',
      payload: { bubbleColor: c }
    });
    try {
      await supabase.from('conversations').update({
        bubble_config: { [user?.id as string]: c }
      }).eq('id', conversationId);
    } catch (err) {
      console.warn('DB bubble sync failed');
    }
  };

  if (loading) return <CartoonLoader />;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className={`sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border p-3 sm:p-4 ${isTechMatch ? 'bg-pink-50/50 dark:bg-pink-900/10' : ''}`}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/messages")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {otherUser && (
            <>
              <Avatar className="h-10 w-10 cursor-pointer border-2 border-primary/10" onClick={() => navigate(`/user/${otherUser.id}`)}>
                <AvatarImage src={otherUser.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">{otherUser.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <Input
                    className="h-8 py-0 focus-visible:ring-primary w-full"
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
                    <p className="font-semibold truncate leading-tight uppercase tracking-tight">{roomName || otherUser.full_name}</p>
                    <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{isTyping ? <span className="text-primary animate-pulse">Typing...</span> : `@${otherUser.username}`}</p>
              </div>

              <div className="flex items-center gap-1">
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

                <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="rounded-full text-muted-foreground">
                  <Palette className="w-5 h-5" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-3 sm:p-4 transition-all duration-500 relative"
        style={{ background: wallpaper }}
      >
        <div className="relative z-10 max-w-2xl mx-auto w-full flex flex-col">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              id={message.id}
              content={message.content}
              createdAt={message.created_at}
              isMe={message.sender_id === user?.id}
              readAt={message.is_read ? message.created_at : null}
              bubbleColor={bubbleColor}
              isTechMatch={isTechMatch}
              messageType={message.message_type}
              onPromote={handlePromote}
              categories={categories}
            />
          ))}
          {isTyping && (
            <div className="flex justify-start mb-4">
              <div className="bg-muted rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:200ms]" />
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:400ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {wallpaper !== 'transparent' && (
          <div className="absolute inset-0 bg-background/5 pointer-events-none" />
        )}
      </div>

      {/* Appearance Picker */}
      <ChatWallpaperPicker
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentWallpaper={wallpaper}
        onSelectWallpaper={saveWallpaper}
        currentBubbleColor={bubbleColor}
        onSelectBubbleColor={saveBubbleColor}
      />

      {/* Input */}
      <div className="bg-card border-t border-border p-3 sm:p-4 pb-8 sm:pb-4">
        <form onSubmit={sendMessage} className="flex gap-2 max-w-2xl mx-auto w-full bg-background rounded-full border border-border p-1 pr-1 pl-4 shadow-sm">
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              broadcastTyping();
            }}
            placeholder="Send a chat..."
            className="flex-1 border-none bg-transparent focus-visible:ring-0 px-0 placeholder:text-muted-foreground/50 text-[15px]"
          />
          <Button type="submit" disabled={!newMessage.trim() || sending} size="icon" className="rounded-full h-10 w-10 gradient-primary transition-all active:scale-90">
            <Send className="w-4 h-4 text-white" />
          </Button>
        </form>
      </div>

      <RoomIntelligence
        isOpen={isIntelligenceOpen}
        onClose={() => setIsIntelligenceOpen(false)}
        messages={messages}
      />
    </div>
  );
};

export default Chat;