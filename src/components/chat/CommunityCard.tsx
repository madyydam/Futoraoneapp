import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeCheck, Users, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CommunityCardProps {
    community: {
        id: string;
        name: string;
        tagline?: string;
        description?: string;
        avatar_url: string | null;
        banner_url?: string | null;
        is_verified?: boolean;
        member_count: number;
        activity_status?: "Active" | "Growing" | "New";
        is_member?: boolean;
        category?: string;
    };
    onJoin?: (id: string, name: string) => void;
    onClick?: (id: string) => void;
    loading?: boolean;
}

export const CommunityCard = React.memo(({
    community,
    onJoin,
    onClick,
    loading
}: CommunityCardProps) => {
    const isJoined = community.is_member;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className="group relative bg-card border border-border/50 rounded-[22px] overflow-hidden transition-all shadow-sm hover:shadow-xl hover:border-primary/30 cursor-pointer flex flex-col h-full"
            onClick={() => onClick?.(community.id)}
        >
            {/* Banner Strip */}
            <div className="relative h-24 w-full bg-gradient-to-br from-muted/50 to-muted overflow-hidden">
                {community.banner_url ? (
                    <img
                        src={community.banner_url}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 via-violet-500/5 to-transparent" />
                )}

                {/* Category Badge overlay */}
                {community.category && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-[9px] font-black text-white uppercase tracking-tighter">
                        {community.category}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="px-5 pb-5 pt-0 flex-1 flex flex-col relative">
                {/* Overlapping Logo */}
                <div className="absolute -top-10 left-4">
                    <div className="relative">
                        <div className="h-16 w-16 rounded-2xl bg-card p-1 shadow-lg ring-1 ring-border">
                            <Avatar className="h-full w-full rounded-[14px]">
                                <AvatarImage src={community.avatar_url || undefined} className="object-cover" />
                                <AvatarFallback className="bg-gradient-to-br from-primary/10 to-violet-500/10 text-primary font-black text-2xl">
                                    {community.name[0]}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        {community.is_verified && (
                            <div className="absolute -bottom-1 -right-1 bg-teal-500 rounded-full p-1 border-2 border-card shadow-sm">
                                <BadgeCheck className="w-3.5 h-3.5 text-white" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 space-y-3 flex-1 flex flex-col">
                    {/* Header */}
                    <div>
                        <h3 className="font-black text-base leading-tight tracking-tight group-hover:text-primary transition-colors truncate">
                            {community.name}
                        </h3>
                        <p className="text-[12px] text-muted-foreground font-medium line-clamp-2 mt-1 leading-relaxed opacity-80">
                            {community.tagline || community.description || "Building the tech future together."}
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                            <Users className="w-3.5 h-3.5 text-primary/60" />
                            {community.member_count}
                        </div>
                        <div className={cn(
                            "flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full",
                            community.activity_status === "Active" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                                community.activity_status === "Growing" ? "bg-blue-500/10 text-blue-600" :
                                    "bg-amber-500/10 text-amber-600"
                        )}>
                            <Zap className="w-3 h-3 fill-current" />
                            {community.activity_status || "Active"}
                        </div>
                    </div>

                    {/* Join Button */}
                    <div className="pt-2 mt-auto">
                        {isJoined ? (
                            <Button
                                variant="secondary"
                                className="w-full h-10 rounded-xl font-black text-xs gap-2 border-border/50 bg-muted/30"
                                onClick={(e) => { e.stopPropagation(); onClick?.(community.id); }}
                            >
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                JOINED
                            </Button>
                        ) : (
                            <Button
                                disabled={loading}
                                onClick={(e) => { e.stopPropagation(); onJoin?.(community.id, community.name); }}
                                className="w-full h-10 rounded-xl font-black text-xs bg-gradient-to-r from-primary to-blue-600 hover:scale-[1.02] transition-all shadow-md shadow-primary/20 active:scale-95 text-white"
                            >
                                {loading ? "..." : "JOIN HUB"}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
});

CommunityCard.displayName = "CommunityCard";
