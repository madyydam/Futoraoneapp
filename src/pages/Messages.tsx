import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { MessageCircle, Search, Users, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import type { User } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { CartoonLoader } from "@/components/CartoonLoader";
import { CreateGroupDialog } from "@/components/chat/CreateGroupDialog";
import { GroupsList } from "@/components/chat/GroupsList";
import { OnlineIndicator } from "@/components/OnlineIndicator";
import { motion, AnimatePresence } from "framer-motion";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Pin, PinOff, Archive as ArchiveIcon, Trash2, ArrowLeft, MessageSquarePlus, Filter, Archive } from "lucide-react";
import { ActiveUsersList } from "@/components/chat/ActiveUsersList";
import { toast } from "sonner";

interface ConversationWithDetails {
  id: string;
  updated_at: string;
  otherUser: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  lastMessage: {
    content: string;
    created_at: string;
  } | null;
  unreadCount: number;
  is_pinned?: boolean;
  is_archived?: boolean;
  is_tech_match?: boolean;
}

const ConversationItem = React.memo(({
  conv,
  onClick,
  onPin,
  onArchive
}: {
  conv: ConversationWithDetails,
  onClick: (id: string) => void,
  onPin: (id: string, current: boolean) => void,
  onArchive: (id: string, current: boolean) => void
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, height: 0 }}
    whileHover={{ scale: 1.01 }}
    transition={{ duration: 0.2 }}
  >
    <ContextMenu>
      <ContextMenuTrigger>
        <Card
          className={`border-0 shadow-sm hover:shadow-md transition-all cursor-pointer mb-2 
            ${conv.is_tech_match ? 'bg-pink-50 dark:bg-pink-900/10 border-l-4 border-l-pink-500' : 'bg-card/50 hover:bg-card'}
            ${conv.unreadCount > 0 ? 'bg-primary/5 ring-1 ring-primary/10' : ''} 
            ${conv.is_pinned && !conv.is_tech_match ? 'border-l-4 border-l-primary bg-primary/5' : ''}`}
          onClick={() => onClick(conv.id)}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className={`h-14 w-14 border-2 shadow-sm ${conv.is_tech_match ? 'border-pink-200' : 'border-background'}`}>
                  <AvatarImage src={conv.otherUser.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className={`${conv.is_tech_match ? 'bg-pink-100 text-pink-600' : 'bg-gradient-to-br from-primary/20 to-primary/10 text-primary'} font-bold`}>
                    {conv.otherUser.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <OnlineIndicator userId={conv.otherUser.id} className="w-3.5 h-3.5 border-[3px]" />
                {conv.is_tech_match && (
                  <div className="absolute -bottom-1 -right-1 bg-pink-500 rounded-full p-1 border-2 border-white dark:border-slate-900">
                    <Heart className="w-2.5 h-2.5 fill-white text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 grid gap-1">
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold text-base truncate flex items-center gap-2 ${conv.unreadCount > 0 ? 'text-foreground' : 'text-foreground/90'} ${conv.is_tech_match ? 'text-pink-600 dark:text-pink-400' : ''}`}>
                    {conv.otherUser.full_name}
                    {conv.is_pinned && <Pin className="w-3.5 h-3.5 text-primary fill-primary rotate-45" />}
                  </h3>
                  {conv.lastMessage && (
                    <span className={`text-xs whitespace-nowrap ${conv.unreadCount > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: false }).replace('about ', '')}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate pr-2 ${conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {conv.lastMessage?.content || <span className="text-muted-foreground italic">No messages yet</span>}
                  </p>
                  {conv.unreadCount > 0 && (
                    <Badge className="h-5 min-w-[1.25rem] px-1 flex items-center justify-center bg-primary text-primary-foreground text-[10px] rounded-full shadow-sm animate-in zoom-in">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onPin(conv.id, !!conv.is_pinned); }}>
          {conv.is_pinned ? (
            <>
              <PinOff className="mr-2 h-4 w-4" /> Unpin Chat
            </>
          ) : (
            <>
              <Pin className="mr-2 h-4 w-4" /> Pin Chat
            </>
          )}
        </ContextMenuItem>
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onArchive(conv.id, !!conv.is_archived); }}>
          {conv.is_archived ? (
            <>
              <ArrowLeft className="mr-2 h-4 w-4" /> Unarchive
            </>
          ) : (
            <>
              <ArchiveIcon className="mr-2 h-4 w-4" /> Archive Chat
            </>
          )}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  </motion.div>
));

ConversationItem.displayName = "ConversationItem";

const Messages = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);


  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const { data: conversationsData, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations (
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .limit(50);

      if (error) throw error;
      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convIds = conversationsData.map((cp: any) => cp.conversation_id);

      const { data: participantsList } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', convIds)
        .neq('user_id', user.id);

      let allParticipants: any[] = [];
      if (participantsList && participantsList.length > 0) {
        const userIds = participantsList.map(p => p.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', userIds);

        allParticipants = participantsList.map(p => ({
          conversation_id: p.conversation_id,
          profiles: profilesData?.find(prof => prof.id === p.user_id)
        }));
      }

      const lastMessagesPromises = convIds.map(convId =>
        supabase
          .from('messages')
          .select('conversation_id, content, created_at, is_read, sender_id')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      );
      const lastMessagesResults = await Promise.all(lastMessagesPromises);

      const unreadCountsPromises = convIds.map(convId =>
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .eq('is_read', false)
          .neq('sender_id', user.id)
      );
      const unreadCountsResults = await Promise.all(unreadCountsPromises);

      const userConversations = (conversationsData as any[]).map((cp: any, idx: number) => {
        const participant = allParticipants?.find((p: any) => p.conversation_id === cp.conversation_id);
        const lastMsg = lastMessagesResults[idx]?.data;
        const unreadCount = unreadCountsResults[idx]?.count || 0;

        return {
          id: cp.conversation_id,
          updated_at: cp.conversations.updated_at,
          is_pinned: false,
          is_archived: false,
          otherUser: participant?.profiles,
          lastMessage: lastMsg,
          unreadCount,
          is_tech_match: false
        };
      });

      const sorted = userConversations
        .filter(c => c.otherUser)
        .sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;

          const dateA = new Date(a.lastMessage?.created_at || a.updated_at).getTime();
          const dateB = new Date(b.lastMessage?.created_at || b.updated_at).getTime();
          return dateB - dateA;
        });

      setConversations(sorted as ConversationWithDetails[]);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user, fetchConversations]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chat_updates')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchConversations())
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        () => fetchConversations())
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${user.id}` },
        () => fetchConversations())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchConversations]);

  const handlePin = useCallback(async (id: string, current: boolean) => {
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, is_pinned: !current } : c
    ).sort((a, b) => {
      const isPinnedA = a.id === id ? !current : a.is_pinned;
      const isPinnedB = b.id === id ? !current : b.is_pinned;
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;
      const dateA = new Date(a.lastMessage?.created_at || a.updated_at).getTime();
      const dateB = new Date(b.lastMessage?.created_at || b.updated_at).getTime();
      return dateB - dateA;
    }));

    toast.success(current ? "Chat unpinned" : "Chat pinned");
  }, []);

  const handleArchive = useCallback(async (id: string, current: boolean) => {
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, is_archived: !current } : c
    ));

    toast.success(current ? "Chat unarchived" : "Chat archived");
  }, []);


  const filteredConversations = React.useMemo(() => conversations.filter(conv => {
    const matchesSearch = conv.otherUser.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab = showArchived ? conv.is_archived : !conv.is_archived;

    const matchesUnread = showUnreadOnly ? conv.unreadCount > 0 : true;
    return matchesSearch && matchesTab && matchesUnread;
  }), [conversations, searchQuery, showArchived, showUnreadOnly]);

  return (
    <div className="min-h-screen bg-background pb-20 relative">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="p-3 sm:p-4 space-y-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
              Messages
            </h1>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => fetchConversations()}
                title="Refresh conversations"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </Button>
              <Button
                variant={showArchived ? "secondary" : "ghost"}
                size="icon"
                className="rounded-full"
                onClick={() => setShowArchived(!showArchived)}
              >
                <Archive className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
            />
          </div>

          <div className="flex gap-2 border-b border-border/50 -mb-4 pb-0">
            <button
              onClick={() => setActiveTab('direct')}
              className={`pb-3 px-4 text-sm font-medium transition-all border-b-2 ${activeTab === 'direct' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <MessageCircle className="w-4 h-4 inline-block mr-2" /> Direct
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`pb-3 px-4 text-sm font-medium transition-all border-b-2 ${activeTab === 'groups' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <Users className="w-4 h-4 inline-block mr-2" /> Groups
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-3 sm:p-4">
        <ActiveUsersList currentUserId={user?.id} />

        {loading ? (
          <CartoonLoader />
        ) : activeTab === 'direct' ? (
          <div className="space-y-2 mt-4">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-20 h-20 bg-muted/50 rounded-full mx-auto flex items-center justify-center">
                  <MessageCircle className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">No conversations yet</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Start chatting with developers you follow or match with on TechMatch!
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredConversations.map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    onClick={(id) => navigate(`/chat/${id}`)}
                    onPin={handlePin}
                    onArchive={handleArchive}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Your Groups</h2>
              <CreateGroupDialog />
            </div>
            <GroupsList />
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Messages;