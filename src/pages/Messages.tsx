import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import {
  MessageCircle, Search, Users, Heart, Pin, PinOff,
  Trash2, ArrowLeft, MessageSquarePlus, Filter, Archive, Plus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { CartoonLoader } from "@/components/CartoonLoader";
import { CreateGroupDialog } from "@/components/chat/CreateGroupDialog";
import { CreateCommunityDialog } from "@/components/chat/CreateCommunityDialog";
import { AdvancedFilterModal, FilterOptions } from "@/components/chat/AdvancedFilterModal";
import { GroupsList } from "@/components/chat/GroupsList";
import { CommunitiesList } from "@/components/chat/CommunitiesList";

import { motion, AnimatePresence } from "framer-motion";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

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
              <Archive className="mr-2 h-4 w-4" /> Archive Chat
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
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'chats' | 'groups' | 'communities'>('chats');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({
    sortBy: "active",
    category: [],
    verifiedOnly: false,
    publicOnly: false
  });

  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!user && !authLoading) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);


  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Fetch conversations where user is a participant
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

      const convIds = conversationsData.map(cp => cp.conversation_id);

      // 2. Fetch other participants
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

      // 3. Fetch last messages & unread counts
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

      // Combine data
      const userConversations = conversationsData.map((cp, idx) => {
        const participant = allParticipants?.find((p) => p.conversation_id === cp.conversation_id);
        const lastMsg = lastMessagesResults[idx]?.data;
        const unreadCount = unreadCountsResults[idx]?.count || 0;

        return {
          id: cp.conversation_id,
          updated_at: (cp.conversations as any)?.updated_at,
          is_pinned: false,
          is_archived: false,
          otherUser: participant?.profiles,
          lastMessage: lastMsg,
          unreadCount,
          is_tech_match: false
        };
      });

      const sorted = (userConversations as any[])
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
      toast.error("Failed to sync messages");
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
      <AnimatePresence mode="wait">
        {activeTab !== 'communities' ? (
          <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b">
            <div className="p-4 space-y-4 max-w-3xl mx-auto">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  {activeTab === 'chats' ? 'Messages' : 'Groups'}
                </h1>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => fetchConversations()}
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

              <div className="flex p-1 bg-muted rounded-lg">
                {(['chats', 'groups', 'communities'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === tab
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-muted/50 border-none"
                />
              </div>
            </div>
          </div>
        ) : (
          <motion.div
            key="communities-header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50"
          >
            <div className="p-4 space-y-4 max-w-3xl mx-auto">
              {/* Branded Community Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20 p-2">
                    <Users className="w-full h-full text-white" />
                  </div>
                  <h1 className="text-2xl font-black tracking-tighter">Communities</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-10 w-10 rounded-xl bg-muted/30 transition-all ${(activeFilters.category.length > 0 || activeFilters.verifiedOnly || activeFilters.publicOnly)
                      ? 'text-primary border border-primary/20 bg-primary/5'
                      : 'text-muted-foreground hover:text-primary'
                      }`}
                    onClick={() => setIsFilterOpen(true)}
                  >
                    <Filter className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Tabs Integration */}
              <div className="flex p-1 bg-muted rounded-lg w-full">
                {(['chats', 'groups', 'communities'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === tab
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Premium Search Bar */}
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Discover tech hubs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 bg-muted/40 border-border/20 rounded-2xl focus-visible:ring-4 focus-visible:ring-primary/10 transition-all font-bold placeholder:font-medium placeholder:text-muted-foreground/20 text-sm"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-20 hidden sm:block">
                  <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px] font-black uppercase">⌘ K</kbd>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto p-3 sm:p-4">
        {loading ? (
          <CartoonLoader />
        ) : activeTab === 'chats' ? (
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
        ) : activeTab === 'groups' ? (
          <div className="mt-2">
            <GroupsList currentUserId={user?.id || ''} searchQuery={searchQuery} />
          </div>
        ) : (
          <div className="mt-4">
            {/* Active Users List - Removed for now */}

            {/* Conversation List */}
            <CommunitiesList
              currentUserId={user?.id || ''}
              filters={activeFilters}
              searchQuery={searchQuery}
            />
          </div>
        )}
      </div>

      <AdvancedFilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={activeFilters}
        onApply={(newFilters) => setActiveFilters(newFilters)}
      />

      <BottomNav />

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-24 right-6 z-40">
        {activeTab === 'groups' ? (
          <CreateGroupDialog
            trigger={
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-7 h-7" />
              </motion.button>
            }
          />
        ) : activeTab === 'communities' ? (
          <CreateCommunityDialog
            trigger={
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-7 h-7" />
              </motion.button>
            }
          />
        ) : null}
      </div>


    </div>
  );
};

export default Messages;