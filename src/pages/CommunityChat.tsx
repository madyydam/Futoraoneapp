import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft, Hash, Users,
    BadgeCheck, ShieldCheck, Settings, Plus,
    Menu, ChevronRight, LayoutPanelLeft, Info,
    MessageSquare, PanelRightClose, PanelRightOpen,
    LogOut, MoreVertical
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunityChatWindow } from "@/components/chat/CommunityChatWindow";
import { CommunityHub } from "@/components/chat/CommunityHub";
import { CommunityAdminPanel } from "@/components/chat/CommunityAdminPanel";
import { ChannelDialog } from "@/components/chat/ChannelDialog";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

// ─── Channel List Component ───────────────────────────────────────────────────

const ChannelList = React.memo(({
    channels,
    currChannelId,
    canManage,
    handleChannelClick,
    handleCreateChannel,
    handleEditChannel,
}: {
    channels: any[];
    currChannelId: string | null;
    canManage: boolean;
    handleChannelClick: (id: string) => void;
    handleCreateChannel: () => void;
    handleEditChannel: (channel: any) => void;
}) => (
    <>
        <div className="px-3 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Hash className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Channels</span>
            </div>
            {canManage && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-md hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground/40"
                    onClick={handleCreateChannel}
                >
                    <Plus className="w-3.5 h-3.5" />
                </Button>
            )}
        </div>
        <div className="space-y-1">
            {channels.map(chan => (
                <div key={chan.id} className="group relative px-2">
                    <button
                        onClick={() => handleChannelClick(chan.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${currChannelId === chan.id
                            ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)]'
                            : 'text-muted-foreground/70 hover:bg-white/5 hover:text-foreground'
                            }`}
                    >
                        <Hash className={`w-4 h-4 ${currChannelId === chan.id ? 'text-primary' : 'text-muted-foreground/30 group-hover:text-primary/40'}`} />
                        <span className="text-sm font-bold flex-1 text-left truncate tracking-tight">{chan.name}</span>
                        {currChannelId === chan.id && (
                            <motion.div
                                layoutId="activeChannel"
                                className="w-1.5 h-5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                            />
                        )}
                    </button>
                    {canManage && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground/30"
                            onClick={(e) => { e.stopPropagation(); handleEditChannel(chan); }}
                        >
                            <Settings className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            ))}
        </div>
        {channels.length === 0 && (
            <div className="px-3 py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted/5 flex items-center justify-center mx-auto mb-3 border border-border/5">
                    <Hash className="w-6 h-6 text-muted-foreground/10" />
                </div>
                <p className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">No Channels</p>
            </div>
        )}
    </>
));
ChannelList.displayName = "ChannelList";

export default function CommunityChat() {
    const { communityId, channelId: urlChannelId } = useParams();
    const navigate = useNavigate();

    const [community, setCommunity] = useState<any>(null);
    const [channels, setChannels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"chat" | "hub">("chat");
    const [userRole, setUserRole] = useState<"admin" | "moderator" | "member" | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [memberRoles, setMemberRoles] = useState<Record<string, string>>({});
    const [adminPanelOpen, setAdminPanelOpen] = useState(false);

    const [showMemberSidebar, setShowMemberSidebar] = useState(true);
    const [currChannelId, setCurrChannelId] = useState<string | null>(urlChannelId || null);
    const [isMobileChannelsOpen, setIsMobileChannelsOpen] = useState(false);

    // Channel Management
    const [channelDialogOpen, setChannelDialogOpen] = useState(false);
    const [editingChannel, setEditingChannel] = useState<any>(null);

    const fetchCommunityData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);

            // Fetch everything in parallel for maximum speed
            const [communityRes, channelsRes, membersRes] = await Promise.all([
                (supabase as any).from("communities").select("*").eq("id", communityId).single(),
                (supabase as any).from("community_channels").select("*").eq("community_id", communityId).order("created_at", { ascending: true }),
                (supabase as any).from("community_members").select("user_id, role").eq("community_id", communityId)
            ]);

            if (communityRes.error) throw communityRes.error;
            setCommunity(communityRes.data);

            const fetchedChannels = channelsRes.data || [];
            setChannels(fetchedChannels);

            if (!urlChannelId && fetchedChannels.length > 0) {
                setCurrChannelId(fetchedChannels[0].id);
            } else if (urlChannelId) {
                setCurrChannelId(urlChannelId);
            }

            if (membersRes.data) {
                const rolesMap: Record<string, string> = {};
                membersRes.data.forEach((m: any) => { rolesMap[m.user_id] = m.role; });
                setMemberRoles(rolesMap);
                if (user) setUserRole(rolesMap[user.id] as any || null);
            }
        } catch (err) {
            console.error("Error fetching community:", err);
            toast.error("Failed to load community");
            navigate("/messages");
        } finally {
            setLoading(false);
        }
    }, [communityId, navigate, urlChannelId]);

    useEffect(() => { fetchCommunityData(); }, [fetchCommunityData]);

    // Handle channel navigation
    const handleChannelClick = (id: string) => {
        setCurrChannelId(id);
        setIsMobileChannelsOpen(false); // Close mobile drawer
        navigate(`/messages/community/${communityId}/${id}`);
    };

    const handleCreateChannel = () => {
        setEditingChannel(null);
        setChannelDialogOpen(true);
    };

    const handleEditChannel = (channel: any) => {
        setEditingChannel(channel);
        setChannelDialogOpen(true);
    };

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center gap-3 bg-background">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-sm font-bold text-muted-foreground animate-pulse">Initializing Vibe...</p>
            </div>
        );
    }

    const isCreator = community?.created_by === currentUserId;
    const isAdmin = userRole === "admin";
    const canManage = isAdmin || isCreator;
    const currentChannel = channels.find(c => c.id === currChannelId) || channels[0];

    return (
        <div className="flex h-[100dvh] bg-background text-foreground overflow-hidden">
            {/* ── Desktop Left Sidebar (Channels) ── */}
            <aside className="hidden lg:flex flex-col w-64 bg-card/50 border-r border-border/40 flex-shrink-0">
                {/* Logo & Name Area */}
                <div className="p-4 border-b border-border/40 bg-card/80 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10 rounded-[12px] border-2 border-primary/10 shadow-sm overflow-hidden">
                            <AvatarImage src={community?.avatar_url} className="object-cover" />
                            <AvatarFallback className="bg-primary/5 text-primary font-black">
                                {community?.name?.[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <h2 className="font-black text-sm truncate uppercase tracking-tight">{community?.name}</h2>
                            <div className="flex items-center gap-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] text-muted-foreground font-bold">Online</span>
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 rounded-lg bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary text-[11px] font-black uppercase tracking-wider transition-all"
                        onClick={() => setAdminPanelOpen(true)}
                    >
                        <Settings className="w-3.5 h-3.5 mr-2" />
                        Admin Panel
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
                    <ChannelList
                        channels={channels}
                        currChannelId={currChannelId}
                        canManage={canManage}
                        handleChannelClick={handleChannelClick}
                        handleCreateChannel={handleCreateChannel}
                        handleEditChannel={handleEditChannel}
                    />
                </div>

                {/* Bottom Profile Area */}
                <div className="p-3 bg-card/80 border-t border-border/40 flex items-center gap-3">
                    <Avatar className="h-8 w-8 ring-1 ring-border shadow-sm">
                        <AvatarFallback className="bg-muted text-[10px] uppercase font-black text-muted-foreground">Me</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-black truncate leading-none mb-0.5">Community Nav</p>
                        <p className="text-[10px] text-muted-foreground font-bold truncate">Connected</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive transition-colors" onClick={() => navigate('/messages')}>
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </aside>

            {/* ── Main content area ── */}
            <main className="flex-1 flex flex-col min-w-0 bg-background relative">

                {/* Branded Header (Top Bar) */}
                <header className="h-16 flex items-center gap-3 px-4 border-b border-border/40 bg-white/80 dark:bg-card/50 backdrop-blur-md z-20 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 rounded-full" onClick={() => navigate('/messages')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>

                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-primary font-black text-xl mb-0.5">#</span>
                                <h1 className="font-black text-lg tracking-tight truncate">{currentChannel?.name || "Lounge"}</h1>
                                {community?.is_verified && <BadgeCheck className="w-4 h-4 text-teal-500 fill-teal-500/10" />}
                            </div>
                            <div className="flex items-center gap-2 -mt-1 hidden sm:flex">
                                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{community?.name}</span>
                                <div className="h-1 w-1 rounded-full bg-muted-foreground/20" />
                                <span className="text-[10px] text-muted-foreground/60 font-bold truncate">{currentChannel?.description || "Welcome to the squad!"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-9 w-9 rounded-full transition-all ${showMemberSidebar ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                            onClick={() => setShowMemberSidebar(!showMemberSidebar)}
                        >
                            <Users className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all" onClick={() => setAdminPanelOpen(true)}>
                            <LayoutPanelLeft className="w-5 h-5" />
                        </Button>
                        <Sheet open={isMobileChannelsOpen} onOpenChange={setIsMobileChannelsOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 rounded-full text-muted-foreground">
                                    <Menu className="w-5 h-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-72 p-0 bg-slate-950/95 backdrop-blur-2xl border-r border-white/5 shadow-2xl">
                                <div className="p-2 h-full overflow-y-auto custom-scrollbar pt-10">
                                    <ChannelList
                                        channels={channels}
                                        currChannelId={currChannelId}
                                        canManage={canManage}
                                        handleChannelClick={handleChannelClick}
                                        handleCreateChannel={handleCreateChannel}
                                        handleEditChannel={handleEditChannel}
                                    />
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </header>

                {/* Sub-Tabs for Mobile / Contextual switcher */}
                <div className="lg:hidden bg-card/30 border-b border-border/40">
                    <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
                        <TabsList className="w-full h-10 bg-transparent rounded-none px-2 gap-1">
                            <TabsTrigger value="chat" className="flex-1 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                                <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Chat
                            </TabsTrigger>
                            <TabsTrigger value="hub" className="flex-1 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all">
                                <Users className="w-3.5 h-3.5 mr-1.5" /> Members
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Content Area */}
                <div className="flex-1 relative overflow-hidden flex">
                    <div className="flex-1 flex flex-col min-w-0 border-r border-border/40 overflow-hidden">
                        {activeTab === "chat" ? (
                            <CommunityChatWindow
                                community={community}
                                channels={channels}
                                activeChannelId={currChannelId || undefined}
                                currentUserId={currentUserId || undefined}
                                memberRoles={memberRoles}
                                hideSidebar={true}
                            />
                        ) : (
                            <CommunityHub
                                community={community}
                                currentUserId={currentUserId || undefined}
                                userRole={userRole || undefined}
                                channelCount={channels.length}
                                onOpenAdminPanel={canManage ? () => setAdminPanelOpen(true) : undefined}
                            />
                        )}
                    </div>

                    {/* Right Members Sidebar (Desktop) */}
                    <AnimatePresence>
                        {showMemberSidebar && (
                            <motion.aside
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 300, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: "circOut" }}
                                className="hidden lg:block bg-card/10 overflow-hidden flex-shrink-0"
                            >
                                <div className="w-[300px] h-full overflow-y-auto custom-scrollbar">
                                    <CommunityHub
                                        community={community}
                                        currentUserId={currentUserId || undefined}
                                        userRole={userRole || undefined}
                                        channelCount={channels.length}
                                        isSidebar={true}
                                    />
                                </div>
                            </motion.aside>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Admin Panel */}
            {community && currentUserId && (
                <CommunityAdminPanel
                    community={community}
                    open={adminPanelOpen}
                    onOpenChange={setAdminPanelOpen}
                    currentUserId={currentUserId}
                    onCommunityUpdated={fetchCommunityData}
                    onCommunityDeleted={() => navigate("/messages")}
                />
            )}

            {/* ── Channel Management Dialog ── */}
            {community && (
                <ChannelDialog
                    open={channelDialogOpen}
                    onOpenChange={setChannelDialogOpen}
                    communityId={community.id}
                    channel={editingChannel}
                    onSuccess={fetchCommunityData}
                />
            )}
        </div>
    );
}
