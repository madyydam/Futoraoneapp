import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { formatDistanceToNow } from "date-fns";
import { CartoonLoader } from "@/components/CartoonLoader";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { sendMessageNotification } from "@/services/notification.service";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
}

interface OtherUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

const Chat = () => {
  const MessageBubble = memo(({ message, isOwn, isTechMatch }: { message: Message, isOwn: boolean, isTechMatch: boolean }) => (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] sm:max-w-[60%] rounded-2xl px-4 py-2 ${isOwn
          ? "bg-primary text-primary-foreground"
          : (isTechMatch ? "bg-pink-100 dark:bg-pink-900/30 text-pink-900 dark:text-pink-100" : "bg-muted text-foreground")
          }`}
      >
        <p className="text-sm sm:text-base break-words">{message.content}</p>
        <div className={`flex items-center justify-end gap-1 mt-1 ${isTechMatch && !isOwn ? "text-pink-700/70 dark:text-pink-300/70" : ""}`}>
          <p className="text-xs opacity-70">
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true
            })}
          </p>
          {isOwn && message.is_read && (
            <span className="text-xs opacity-70">• Read</span>
          )}
        </div>
      </div>
    </div>
  ));

  MessageBubble.displayName = "MessageBubble";

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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { typingUsers, broadcastTyping } = useTypingIndicator(conversationId || "", user?.id);
  const isTyping = typingUsers.length > 0;

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && conversationId) {
      fetchConversationDetails();
      const cleanup = subscribeToMessages();
      markMessagesAsRead();
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

    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("user_id, profiles(id, username, full_name, avatar_url)")
      .eq("conversation_id", conversationId)
      .neq("user_id", user.id)
      .single();

    if (participants?.profiles) {
      setOtherUser(participants.profiles as unknown as OtherUser);
    }

    const { data: messagesData } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesData) {
      setMessages(messagesData);
    }

    setLoading(false);
  };

  const subscribeToMessages = () => {
    const channel = supabase
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages(prev =>
            prev.map(msg => msg.id === payload.new.id ? payload.new as Message : msg)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };


  const markMessagesAsRead = async () => {
    if (!user || !conversationId) return;

    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("is_read", false)
      .neq("sender_id", user.id);
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
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
      setNewMessage(messageContent);
    } else {
      setMessages(prev => [...prev, data as Message]);
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      // Trigger push notification
      if (otherUser && user) {
        sendMessageNotification(
          otherUser.id,
          user.user_metadata?.full_name || user.email || "Someone",
          messageContent
        ).catch(err => console.error("Failed to send push:", err));
      }
    }

    setSending(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return <CartoonLoader />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className={`sticky top-0 z-10 bg-card border-b border-border p-3 sm:p-4 ${isTechMatch ? 'bg-pink-50/50 dark:bg-pink-900/10' : ''}`}>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/messages")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {otherUser && (
            <>
              <div className="relative">
                <Avatar
                  className="h-10 w-10 cursor-pointer"
                  onClick={() => navigate(`/user/${otherUser.id}`)}
                >
                  <AvatarImage src={otherUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {otherUser.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isTechMatch && (
                  <div className="absolute -bottom-1 -right-1 bg-pink-500 rounded-full p-0.5 border border-white dark:border-slate-900">
                    <Heart className="w-2 h-2 fill-white text-white" />
                  </div>
                )}
              </div>
              <div
                className="flex-1 cursor-pointer"
                onClick={() => navigate(`/user/${otherUser.id}`)}
              >
                <div className="flex items-center gap-2">
                  <p className={`font-semibold ${isTechMatch ? 'text-pink-600 dark:text-pink-400' : 'text-foreground'}`}>
                    {otherUser.full_name}
                  </p>
                  {isTechMatch && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-600 border border-pink-200 uppercase tracking-wider">Match</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isTyping ? (
                    <span className="text-primary font-medium animate-pulse">Typing...</span>
                  ) : (
                    `@${otherUser.username}`
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.sender_id === user?.id}
            isTechMatch={isTechMatch}
          />
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-card border-t border-border p-3 sm:p-4">
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              broadcastTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 bg-background border-border"
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Chat;