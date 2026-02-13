import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ArrowLeft,
    Send,
    Users,
    MoreVertical,
    Hash,
    Bell,
    Settings,
    Search,
    UserPlus,
    Info,
    LayoutDashboard
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunityChatWindow } from "@/components/chat/CommunityChatWindow";
import { CommunityHub } from "@/components/chat/CommunityHub";

export default function CommunityChat() {
    const { communityId, channelId } = useParams();
    const navigate = useNavigate();
    const [community, setCommunity] = useState<any>(null);
    const [channels, setChannels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(channelId ? "chat" : "hub");

    const fetchCommunityData = useCallback(async () => {
        try {
            // 1. Fetch community details
            const { data: communityData, error: communityError } = await supabase
                .from('communities' as any)
                .select('*')
                .eq('id', communityId)
                .single();

            if (communityError) throw communityError;
            setCommunity(communityData);

            // 2. Fetch channels
            const { data: channelsData, error: channelsError } = await supabase
                .from('community_channels' as any)
                .select('*')
                .eq('community_id', communityId)
                .order('created_at', { ascending: true });

            if (channelsError) throw channelsError;
            setChannels(channelsData);

            // If no channelId but on chat tab, pick the first one
            if (!channelId && activeTab === "chat" && channelsData.length > 0) {
                navigate(`/messages/community/${communityId}/channel/${channelsData[0].id}`, { replace: true });
            }
        } catch (error) {
            console.error('Error fetching community:', error);
            toast.error("Failed to load community");
            navigate('/messages');
        } finally {
            setLoading(false);
        }
    }, [communityId, channelId, navigate, activeTab]);

    useEffect(() => {
        fetchCommunityData();
    }, [fetchCommunityData]);

    if (loading) {
        return <div className="h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-background">
            {/* Header */}
            <div className="p-4 border-b flex items-center gap-3 bg-white dark:bg-card">
                <Button variant="ghost" size="icon" onClick={() => navigate('/messages')} className="rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10 border-2 border-primary/10">
                    <AvatarImage src={community?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/5 text-primary font-bold">
                        {community?.name?.[0]}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <h1 className="font-bold text-base truncate">{community?.name}</h1>
                    <p className="text-[10px] text-muted-foreground truncate">{community?.tagline}</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Info className="h-5 w-5" />
                </Button>
            </div>

            {/* Navigation Tabs */}
            <div className="px-4 border-b bg-white dark:bg-card">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full h-12 bg-transparent gap-6">
                        <TabsTrigger
                            value="hub"
                            className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[#F87171] data-[state=active]:bg-transparent data-[state=active]:text-[#F87171] font-bold text-sm"
                        >
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Hub
                        </TabsTrigger>
                        <TabsTrigger
                            value="chat"
                            className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[#F87171] data-[state=active]:bg-transparent data-[state=active]:text-[#F87171] font-bold text-sm"
                        >
                            <Hash className="w-4 h-4 mr-2" />
                            Chat
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === "hub" ? (
                    <CommunityHub community={community} />
                ) : (
                    <div className="flex h-full">
                        {/* Channel Sidebar (Optional for mobile/desktop toggle, kept simple here) */}
                        <div className="flex-1 flex flex-col">
                            <CommunityChatWindow
                                community={community}
                                channels={channels}
                                activeChannelId={channelId}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
