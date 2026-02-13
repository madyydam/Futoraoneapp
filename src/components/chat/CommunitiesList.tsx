import React, { useEffect, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { Users, MoreHorizontal, Globe, Lock, Heart, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface Community {
    id: string;
    name: string;
    tagline: string;
    description: string;
    avatar_url: string | null;
    category: string;
    is_public: boolean;
    member_count: number;
    is_member: boolean;
}

const CommunityCard = React.memo(({
    community,
    onJoin,
    onNavigate
}: {
    community: Community;
    onJoin: (id: string, name: string) => void;
    onNavigate: (id: string) => void;
}) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
    >
        <Card className="overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-all bg-white dark:bg-card/50">
            <CardContent className="p-5 flex flex-col items-center text-center">
                <div className="relative mb-4">
                    <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                        <AvatarImage src={community.avatar_url || undefined} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                            {community.name[0]}
                        </AvatarFallback>
                    </Avatar>
                    {community.is_public && (
                        <div className="absolute -top-1 -right-1 bg-yellow-400 p-1.5 rounded-full border-2 border-background shadow-sm">
                            <Star className="w-3 h-3 text-white fill-white" />
                        </div>
                    )}
                </div>

                <h3 className="font-bold text-lg mb-1">{community.name}</h3>
                <p className="text-xs text-muted-foreground/80 mb-3 line-clamp-2 min-h-[2.5rem]">
                    {community.tagline || community.description}
                </p>

                <div className="text-[11px] font-medium text-muted-foreground mb-4">
                    {community.member_count.toLocaleString()} followers
                </div>

                {community.is_member ? (
                    <Button
                        variant="secondary"
                        className="w-full h-10 font-bold"
                        onClick={() => onNavigate(community.id)}
                    >
                        Open
                    </Button>
                ) : (
                    <Button
                        className="w-full h-10 bg-primary hover:bg-primary/90 text-white font-bold shadow-sm"
                        onClick={() => onJoin(community.id, community.name)}
                    >
                        Join
                    </Button>
                )}
            </CardContent>
        </Card>
    </motion.div>
));

CommunityCard.displayName = "CommunityCard";

const CommunitySkeleton = () => (
    <div className="space-y-4">
        <Skeleton className="h-7 w-32 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden border-border/40 bg-white dark:bg-card/50">
                    <CardContent className="p-5 flex flex-col items-center">
                        <Skeleton className="h-20 w-20 rounded-full mb-4" />
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2 mb-4" />
                        <Skeleton className="h-10 w-full rounded-md" />
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
);

export function CommunitiesList({ currentUserId }: { currentUserId: string }) {
    const navigate = useNavigate();

    const { data: communities = [], isLoading: loading, refetch } = useQuery({
        queryKey: ["communities_list", currentUserId],
        queryFn: async () => {
            if (!currentUserId) return [];

            // 1. Fetch communities
            const { data: communitiesData, error } = await supabase
                .from('communities' as any)
                .select(`
                    *,
                    community_members(count)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // 2. Fetch user memberships
            const { data: memberData } = await supabase
                .from('community_members' as any)
                .select('community_id')
                .eq('user_id', currentUserId);

            const joinedIds = new Set(memberData?.map(m => (m as any).community_id) || []);

            return (communitiesData as any[] || []).map(c => ({
                id: c.id,
                name: c.name,
                tagline: c.tagline || '',
                description: c.description || '',
                avatar_url: c.avatar_url,
                category: c.category || 'General',
                is_public: c.is_public,
                member_count: c.community_members?.[0]?.count || 0,
                is_member: joinedIds.has(c.id)
            })) as Community[];
        },
        enabled: !!currentUserId
    });

    useEffect(() => {
        const channel = supabase.channel('communities_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'communities' }, () => refetch())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'community_members' }, () => refetch())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [refetch]);

    const handleJoin = async (communityId: string, communityName: string) => {
        try {
            const { error } = await supabase
                .from('community_members' as any)
                .insert({
                    community_id: communityId,
                    user_id: currentUserId,
                    role: 'member'
                });

            if (error) throw error;
            toast.success(`Joined ${communityName}!`);
            refetch();
        } catch (error) {
            console.error('Error joining community:', error);
            toast.error("Failed to join community");
        }
    };

    const handleNavigate = useCallback((id: string) => {
        navigate(`/messages/community/${id}`);
    }, [navigate]);

    if (loading) {
        return (
            <div className="space-y-8 pb-24">
                <CommunitySkeleton />
                <CommunitySkeleton />
            </div>
        );
    }

    const categories = Array.from(new Set(communities.map(c => c.category)));

    return (
        <div className="space-y-8 pb-24">
            {categories.map(category => (
                <div key={category} className="space-y-4">
                    <h2 className="text-lg font-bold px-1 flex items-center gap-2">
                        {category}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {communities
                            .filter(c => c.category === category)
                            .map((community) => (
                                <CommunityCard
                                    key={community.id}
                                    community={community}
                                    onJoin={handleJoin}
                                    onNavigate={handleNavigate}
                                />
                            ))}
                    </div>
                </div>
            ))}

            {communities.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No communities found. Be the first to create one!</p>
                </div>
            )}
        </div>
    );
}
