import React, { useEffect, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Users, Globe, BadgeCheck, Hash, Plus, Search, Filter,
    MoreVertical, Settings, LogOut, Zap, Heart, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { CommunityCard } from "./CommunityCard";
import { FilterOptions } from "./AdvancedFilterModal";

const CommunitySkeleton = () => (
    <div className="space-y-8 px-1">
        {[1, 2].map(i => (
            <div key={i} className="space-y-4">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-32 rounded-lg" />
                    <Skeleton className="h-4 w-12 rounded-lg" />
                </div>
                <div className="flex gap-4 overflow-hidden">
                    {[1, 2, 3].map(j => (
                        <div key={j} className="w-[280px] h-64 flex-shrink-0 bg-card border border-border/50 rounded-[22px] p-4 space-y-4 opacity-50">
                            <Skeleton className="h-24 w-full rounded-xl" />
                            <div className="space-y-4 pt-4">
                                <Skeleton className="h-4 w-2/3 rounded-full" />
                                <Skeleton className="h-3 w-full rounded-full" />
                                <Skeleton className="h-10 w-full rounded-xl mt-4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

interface Community {
    id: string;
    name: string;
    tagline: string;
    description: string;
    avatar_url: string | null;
    banner_url?: string | null;
    category: string;
    is_public: boolean;
    is_verified: boolean;
    member_count: number;
    channel_count: number;
    is_member: boolean;
    is_creator: boolean;
    user_role: "admin" | "moderator" | "member" | null;
    activity_status?: "Active" | "Growing" | "New";
}


CommunityCard.displayName = "CommunityCard";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

// ─── Category Section ────────────────────────────────────────────────────────

const CategorySection = ({
    title,
    icon: Icon,
    communities,
    onJoin,
    onNavigate,
    joining,
    layout = "scroll"
}: {
    title: string;
    icon: any;
    communities: Community[];
    onJoin: (id: string, name: string) => void;
    onNavigate: (id: string) => void;
    joining: string | null;
    layout?: "scroll" | "grid";
}) => {
    if (communities.length === 0) return null;

    return (
        <section className="space-y-4 py-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary/5 text-primary border border-primary/10">
                        <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-black tracking-tight">{title}</h2>
                </div>
                <button className="text-[11px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors flex items-center gap-1">
                    See All
                    <ExternalLink className="w-3 h-3" />
                </button>
            </div>

            {layout === "scroll" ? (
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 snap-x scrollbar-hide no-scrollbar" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                    {communities.map(c => (
                        <div key={c.id} className="w-[280px] flex-shrink-0 snap-start">
                            <CommunityCard
                                community={c}
                                onJoin={onJoin}
                                onClick={onNavigate}
                                loading={joining === c.id}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-1">
                    {communities.map(c => (
                        <CommunityCard
                            key={c.id}
                            community={c}
                            onJoin={onJoin}
                            onClick={onNavigate}
                            loading={joining === c.id}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

export function CommunitiesList({
    currentUserId,
    filters,
    searchQuery
}: {
    currentUserId: string;
    filters: FilterOptions;
    searchQuery: string;
}) {
    const navigate = useNavigate();
    const [joining, setJoining] = useState<string | null>(null);

    const { data: communities = [], isLoading: loading, refetch } = useQuery({
        queryKey: ["communities_list_discovery", currentUserId],
        queryFn: async () => {
            if (!currentUserId) return [];

            const { data: communitiesData, error } = await supabase
                .from("communities")
                .select(`
                    *,
                    community_members(count),
                    community_channels(count)
                `)
                .order("created_at", { ascending: false });

            if (error) throw error;

            const { data: memberData } = await supabase
                .from("community_members")
                .select("community_id, role")
                .eq("user_id", currentUserId);

            const membershipMap = new Map(memberData?.map(m => [m.community_id, m.role]) || []);

            return (communitiesData as any[] || []).map(c => ({
                id: c.id,
                name: c.name,
                tagline: c.tagline || "",
                description: c.description || "",
                avatar_url: c.avatar_url,
                banner_url: c.banner_url,
                category: c.category || "General",
                is_public: c.is_public,
                is_verified: c.is_verified || false,
                member_count: c.community_members?.[0]?.count || 0,
                channel_count: c.community_channels?.[0]?.count || 0,
                is_member: membershipMap.has(c.id),
                is_creator: c.created_by === currentUserId,
                user_role: membershipMap.get(c.id) || null,
                activity_status: (c.community_members?.[0]?.count || 0) > 10 ? "Active" : "Growing"
            })) as Community[];
        },
        enabled: !!currentUserId
    });

    useEffect(() => {
        const channel = supabase.channel("discovery_realtime")
            .on("postgres_changes", { event: "*", schema: "public", table: "communities" }, () => refetch())
            .on("postgres_changes", { event: "*", schema: "public", table: "community_members" }, () => refetch())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [refetch]);

    const handleJoin = useCallback(async (communityId: string, communityName: string) => {
        setJoining(communityId);
        try {
            const { error } = await supabase
                .from("community_members")
                .insert({ community_id: communityId, user_id: currentUserId, role: "member" });
            if (error) throw error;
            toast.success(`Welcome to ${communityName}! 🎉`);
            refetch();
            navigate(`/messages/community/${communityId}`);
        } catch (err) {
            console.error("Join error:", err);
            toast.error("Failed to join community");
        } finally {
            setJoining(null);
        }
    }, [currentUserId, navigate, refetch]);

    const handleNavigate = useCallback((id: string) => {
        navigate(`/messages/community/${id}`);
    }, [navigate]);

    // Apply Filters & Search
    const filteredCommunities = useMemo(() => {
        let results = [...communities];

        // 1. Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            results = results.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.tagline.toLowerCase().includes(query) ||
                c.description.toLowerCase().includes(query)
            );
        }

        // 2. Category Filter (Multi-select)
        if (filters.category.length > 0) {
            results = results.filter(c => filters.category.includes(c.category));
        }

        // 3. Verified Only
        if (filters.verifiedOnly) {
            results = results.filter(c => c.is_verified);
        }

        // 4. Public Only
        if (filters.publicOnly) {
            results = results.filter(c => c.is_public);
        }

        // 5. Sorting
        if (filters.sortBy === "members") {
            results.sort((a, b) => b.member_count - a.member_count);
        } else if (filters.sortBy === "newest") {
            // Newest is already handled by fetch order, but we can re-sort if needed
            // results.sort((a, b) => ...)
        } else if (filters.sortBy === "active") {
            // Trending/Active - combine member count and channel count as proxy
            results.sort((a, b) => (b.member_count + b.channel_count) - (a.member_count + a.channel_count));
        }

        return results;
    }, [communities, searchQuery, filters]);

    const trending = useMemo(() => filteredCommunities.filter(c => (c.member_count + c.channel_count) > 5).slice(0, 4), [filteredCommunities]);
    const techies = useMemo(() => filteredCommunities.filter(c => c.category === "Tech" || c.category === "Development"), [filteredCommunities]);
    const college = useMemo(() => filteredCommunities.filter(c => c.category === "Education" || c.category === "College"), [filteredCommunities]);
    const recommended = useMemo(() => filteredCommunities.filter(c => !trending.includes(c)), [filteredCommunities, trending]);

    if (loading) return <CommunitySkeleton />;

    return (
        <div className="flex flex-col h-full -mx-1 pb-24">
            <AnimatePresence mode="popLayout">
                {/* 1. Trending This Week */}
                <CategorySection
                    title="Trending This Week"
                    icon={Zap}
                    communities={trending}
                    onJoin={handleJoin}
                    onNavigate={handleNavigate}
                    joining={joining}
                />

                {/* 2. For Techies */}
                <CategorySection
                    title="For Techies"
                    icon={Globe}
                    communities={techies}
                    onJoin={handleJoin}
                    onNavigate={handleNavigate}
                    joining={joining}
                    layout="grid"
                />

                {/* 3. For College Students */}
                <CategorySection
                    title="College Hubs"
                    icon={Users}
                    communities={college}
                    onJoin={handleJoin}
                    onNavigate={handleNavigate}
                    joining={joining}
                />

                {/* 4. Recommended / Other */}
                <CategorySection
                    title="All Discoveries"
                    icon={Heart}
                    communities={recommended}
                    onJoin={handleJoin}
                    onNavigate={handleNavigate}
                    joining={joining}
                    layout="grid"
                />

                {filteredCommunities.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-[24px] bg-muted/30 flex items-center justify-center mb-4">
                            <Hash className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                        <p className="font-bold text-muted-foreground">Discover something new.</p>
                        <p className="text-[12px] text-muted-foreground/60 mt-1 max-w-[200px] mx-auto">
                            Be the first to create a tech hub! 🚀
                        </p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
