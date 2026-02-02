import React, { memo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    Search, Globe, Rocket, Zap, Heart, Gamepad2, Brain, Code, Shield, Cloud,
    Cpu, Blocks, Users, Smartphone, Database, TrendingUp, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/FollowButton";
import { StartChatButton } from "@/components/StartChatButton";
import { OnlineIndicator } from "@/components/OnlineIndicator";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";

import { toast } from "sonner";

// --- Types ---

export interface UserProfile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    is_verified?: boolean | null;
    follower_count?: number;
}

// --- Constants ---

export const CATEGORIES = [
    { name: "AI & ML", icon: Brain, color: "bg-blue-500" },
    { name: "Web Dev", icon: Code, color: "bg-green-500" },
    { name: "Cybersecurity", icon: Shield, color: "bg-red-500" },
    { name: "Cloud", icon: Cloud, color: "bg-purple-500" },
    { name: "Robotics", icon: Cpu, color: "bg-yellow-500" },
    { name: "Blockchain", icon: Blocks, color: "bg-orange-500" },
    { name: "Mobile Dev", icon: Smartphone, color: "bg-pink-500" },
    { name: "Data Science", icon: Database, color: "bg-teal-500" },
];

export const TRENDING_TOPICS = [
    { tag: "ChatGPT-5", posts: "2.4K" },
    { tag: "ReactJS", posts: "1.8K" },
    { tag: "Python", posts: "3.2K" },
    { tag: "DevOps", posts: "1.5K" },
    { tag: "MachineLearning", posts: "2.9K" },
    { tag: "Rust", posts: "1.2K" },
    { tag: "Web3", posts: "2.1K" },
    { tag: "DataScience", posts: "1.9K" },
];

export const TRENDING_PROJECTS = [
    {
        title: "AI Image Generator",
        author: "Saanvi Iyer",
        likes: 342,
        tech: ["Python", "TensorFlow", "React"],
    },
    {
        title: "Blockchain Voting System",
        author: "Arjun Kapoor",
        likes: 289,
        tech: ["Solidity", "Web3", "Node.js"],
    },
    {
        title: "Real-time Chat App",
        author: "Diya Malhotra",
        likes: 456,
        tech: ["WebSocket", "React", "Express"],
    },
    {
        title: "Smart Home Dashboard",
        author: "Vihaan Nair",
        likes: 234,
        tech: ["IoT", "Vue.js", "MQTT"],
    },
    {
        title: "DeFi Exchange",
        author: "Ishaan Gupta",
        likes: 567,
        tech: ["Solidity", "React", "Ethers.js"],
    },
];

// --- Components ---

interface ExploreHeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    handleSearch: (e: React.FormEvent) => void;
    setShowResults: (show: boolean) => void;
    searchLoading: boolean;
    showResults: boolean;
    searchResults: UserProfile[];
    handleUserClick: (userId: string) => void;
    onEcosystemClick: () => void;
}

export const ExploreHeader = memo(({
    searchQuery,
    setSearchQuery,
    handleSearch,
    setShowResults,
    searchLoading,
    showResults,
    searchResults,
    handleUserClick,
    onEcosystemClick
}: ExploreHeaderProps) => {
    return (
        <motion.div
            className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border p-4 shadow-sm"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
        >
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold gradient-text">Explore</h1>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onEcosystemClick}
                        className="rounded-full bg-[#0A0A0A] border-white/10 hover:border-white/20 text-white/90 font-black text-[10px] gap-2 transition-all hover:bg-black active:scale-95 uppercase tracking-[0.2em] shadow-2xl"
                    >
                        <Globe className="w-3 h-3 text-primary" />
                        Ecosystem
                    </Button>
                </div>
                <form onSubmit={handleSearch} className="relative">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors z-10" size={20} />
                        <Input
                            type="text"
                            placeholder="Search projects, topics, people..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => searchQuery && setShowResults(true)}
                            className="pl-12 pr-4 h-12 bg-background/50 border-2 border-border focus:border-primary transition-all rounded-2xl shadow-sm"
                        />
                        {searchLoading && (
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                <motion.div
                                    className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {showResults && searchResults.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute top-full mt-2 w-full bg-card/95 backdrop-blur-lg border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
                        >
                            <div className="p-2 space-y-1">
                                {searchResults.map((user, index) => (
                                    <motion.div
                                        key={user.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => handleUserClick(user.id)}
                                        className="p-3 hover:bg-primary/10 rounded-xl cursor-pointer transition-all flex items-center gap-3 group"
                                    >
                                        <Avatar className="h-10 w-10 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                                            <AvatarImage src={user.avatar_url || undefined} />
                                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20">
                                                {user.username[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-foreground truncate flex items-center gap-1">
                                                {user.full_name}
                                                <VerifiedBadge isVerified={user.is_verified} size={12} />
                                            </p>
                                            <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                                        </div>
                                        <Search className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </motion.div>
                                ))}
                            </div>
                            <div className="p-3 border-t border-border bg-muted/30">
                                <button
                                    type="submit"
                                    className="text-xs text-primary hover:text-primary/80 font-medium"
                                >
                                    Press Enter to see all results for "{searchQuery}"
                                </button>
                            </div>
                        </motion.div>
                    )}
                </form>
            </div>
        </motion.div>
    );
});

interface OpportunityCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    gradient: string;
    onClick: () => void;
    buttonText: string;
    buttonVariant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
    buttonClassName?: string;
    delay?: number;
    isLocked?: boolean;
}

export const OpportunityCard = memo(({
    title,
    description,
    icon: Icon,
    gradient,
    onClick,
    buttonText,
    buttonVariant = "default",
    buttonClassName,
    delay = 0,
    isLocked = false
}: OpportunityCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        style={{ willChange: "transform, opacity" }}
    >
        <Card
            className={`${gradient} border-0 cursor-pointer overflow-hidden relative h-full hover:scale-[1.02] transition-transform duration-300`}
            onClick={onClick}
        >
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Icon size={80} />
            </div>

            {/* Lock Overlay */}
            {isLocked && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-4 text-center">
                    <div className="bg-white/10 p-3 rounded-full mb-3 backdrop-blur-md border border-white/20">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-white font-bold text-sm mb-1">Locked</p>
                    <Badge variant="secondary" className="bg-yellow-400 text-black hover:bg-yellow-500 border-0 font-bold">
                        Unlock 1000 🪙
                    </Badge>
                </div>
            )}

            <CardContent className="p-4 relative z-10 flex flex-col h-full justify-between gap-2">
                <div>
                    <h2 className="text-lg md:text-2xl font-bold mb-1 flex items-center gap-2">
                        <Icon className={`w-5 h-5 md:w-6 md:h-6 ${title === "Gig Market" ? "fill-black" : "fill-white"}`} />
                        <span className="leading-tight">{title}</span>
                    </h2>
                    <p className={`text-xs md:text-base line-clamp-3 md:line-clamp-none ${title === "Gig Market" ? "text-black/80 font-medium" : "text-white/90"}`}>
                        {description}
                    </p>
                </div>
                <Button variant={buttonVariant} size="sm" className={`mt-2 w-full md:w-fit text-xs md:text-sm h-8 ${buttonClassName}`}>
                    {buttonText}
                </Button>
            </CardContent>
        </Card>
    </motion.div>
));

interface OpportunitySectionProps {
    onNavigate: (path: string) => void;
}

export const OpportunitySection = memo(({ onNavigate }: OpportunitySectionProps) => {
    const { data: isTechMatchUnlocked = false, refetch } = useQuery({
        queryKey: ['techMatchUnlockStatus'],
        queryFn: async () => {
            // 0. Instant Local Check (Fastest & Persistent)
            const localStatus = localStorage.getItem('techMatchUnlocked');
            if (localStatus === 'true') return true;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            // 1. Check Profile Flag
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_tech_match_unlocked')
                .eq('id', user.id)
                .single();

            // @ts-ignore
            if (profile?.is_tech_match_unlocked) {
                localStorage.setItem('techMatchUnlocked', 'true');
                return true;
            }

            // 2. Fallback: Check 'Proof of Purchase' in Transactions
            // @ts-ignore
            const { data: wallet } = await supabase.from('native_wallets').select('id').eq('user_id', user.id).single();

            if (wallet) {
                // @ts-ignore
                const { data: tx } = await supabase
                    .from('native_transactions')
                    .select('id')
                    .eq('wallet_id', wallet.id)
                    .ilike('description', '%Unlocked Tech Match%')
                    .limit(1);

                if (tx && tx.length > 0) {
                    localStorage.setItem('techMatchUnlocked', 'true');
                    return true;
                }
            }

            return false;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        initialData: () => localStorage.getItem('techMatchUnlocked') === 'true',
    });

    const queryClient = useQueryClient();

    const handleTechMatchClick = async () => {
        if (isTechMatchUnlocked) {
            onNavigate('/tech-match');
            return;
        }

        const confirm = window.confirm("Unlock Tech Match for 1000 Coins?");
        if (!confirm) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Please log in.");
                return;
            }

            console.log("Attempting to unlock Tech Match for user:", user.id);

            // 1. Check Balance - Robust Fetch
            // @ts-ignore
            const { data: wallet, error: walletError } = await supabase
                .from("native_wallets")
                .select("id, balance")
                .eq("user_id", user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (walletError || !wallet) {
                console.error("Wallet Fetch Error:", walletError);
                toast.error("Could not access wallet. Please contact support.");
                return;
            }

            console.log("Current Balance:", wallet.balance);

            if ((wallet.balance || 0) < 1000) {
                // --- SMART RESTORE LOGIC ---
                // If balance is low, check if they ALREADY paid previously (State Repair)
                // @ts-ignore
                const { data: tx } = await supabase
                    .from("native_transactions")
                    .select("id")
                    .eq("wallet_id", wallet.id)
                    .ilike("description", "%Unlocked Tech Match%")
                    .limit(1);

                if (tx && tx.length > 0) {
                    console.log("Payment found in history. Restoring access...");
                    // Repair Profile
                    await supabase.from('profiles').update({ is_tech_match_unlocked: true } as any).eq('id', user.id);
                    localStorage.setItem('techMatchUnlocked', 'true');
                    await refetch();
                    toast.success("Purchase Verified & Restored! 🔄");
                    return;
                }

                toast.error(`Insufficient Balance. You have ${wallet.balance || 0} coins, need 1000.`);
                return;
            }

            // 2. Debit
            // @ts-ignore
            const { error: updateError } = await supabase
                .from("native_wallets")
                .update({ balance: (wallet.balance || 0) - 1000 })
                .eq("id", wallet.id);

            if (updateError) {
                console.error("Balance Update Error:", updateError);
                throw updateError;
            }

            // 3. Log Transaction
            // @ts-ignore
            const { error: txError } = await supabase
                .from("native_transactions")
                .insert({
                    wallet_id: wallet.id,
                    amount: -1000,
                    description: "Unlocked Tech Match 🔓",
                    type: "payment",
                    status: "completed"
                });

            if (txError) {
                console.error("Transaction Log Error:", txError);
            }

            // 4. Update Profile - Specific to Tech Match
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ is_tech_match_unlocked: true } as any)
                .eq('id', user.id);

            // 5. Success & Cleanup
            console.log("Unlock Successful!");
            localStorage.setItem('techMatchUnlocked', 'true'); // Persist locally

            await Promise.all([
                refetch(),
                queryClient.invalidateQueries({ queryKey: ["native_wallet_v2"] }),
                queryClient.invalidateQueries({ queryKey: ["userProfile"] })
            ]);

            toast.success("Tech Match Unlocked! 🔓");
        } catch (error: any) {
            console.error("Unexpected Error during unlock:", error);
            // Show exact error to user for debugging
            toast.error(`Unlock failed: ${error.message || error.details || "Unknown error"}`);
        }
    };

    return (
        <section>
            <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-green-600 bg-clip-text text-transparent">
                    Opportunities Hub
                </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <OpportunityCard
                    title="Founders Corner"
                    description="Find your perfect co-founder or join the next unicorn."
                    icon={Rocket}
                    gradient="bg-gradient-to-r from-orange-500 to-pink-600 text-white"
                    onClick={() => onNavigate('/founders-corner')}
                    buttonText="Find Matches"
                    buttonVariant="secondary"
                    buttonClassName="font-semibold text-pink-600 hover:text-pink-700"
                    delay={0.1}
                />
                <OpportunityCard
                    title="Gig Market"
                    description="Find micro-gigs, freelance tasks, and earn while you learn."
                    icon={Zap}
                    gradient="bg-gradient-to-r from-yellow-400 to-green-500 text-black"
                    onClick={() => onNavigate('/gig-marketplace')}
                    buttonText="Find Gigs"
                    buttonClassName="font-bold bg-white text-green-700 hover:bg-white/90 border-0"
                    delay={0.2}
                />
                <OpportunityCard
                    title="Tech Match"
                    description="Find your player 2. Date other devs."
                    icon={Heart}
                    gradient="bg-gradient-to-r from-pink-500 to-rose-500 text-white"
                    onClick={handleTechMatchClick}
                    buttonText={isTechMatchUnlocked ? "Connect" : "Unlock"}
                    buttonVariant="secondary"
                    buttonClassName="font-bold text-rose-600 hover:text-rose-700"
                    delay={0.3}
                    isLocked={!isTechMatchUnlocked}
                />
                <OpportunityCard
                    title="Game Zone"
                    description="Play multiplayer games with friends."
                    icon={Gamepad2}
                    gradient="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                    onClick={() => onNavigate('/games')}
                    buttonText="Play Now"
                    buttonVariant="secondary"
                    buttonClassName="font-bold text-indigo-600 hover:text-indigo-700"
                    delay={0.4}
                />
            </div>
        </section>
    );
});

interface UserGridProps {
    loading: boolean;
    people: UserProfile[];
    handleUserClick: (id: string) => void;
    currentUser: any;
    onSeeAllClick: () => void;
}

export const UserGrid = memo(({ loading, people, handleUserClick, currentUser, onSeeAllClick }: UserGridProps) => (
    <section>
        <div className="flex items-center gap-2 mb-4">
            <Users className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-foreground">People to Follow</h2>
        </div>

        {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="bg-card border-border animate-pulse">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
                                <div className="flex-1 space-y-2 min-w-0">
                                    <div className="h-4 bg-muted rounded w-2/3" />
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        ) : people.length === 0 ? (
            <Card className="bg-card border-border">
                <CardContent className="p-8 text-center">
                    <Users className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No users found</p>
                </CardContent>
            </Card>
        ) : (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {people.map((user, index) => (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            style={{ willChange: "transform, opacity" }}
                        >
                            <Card className="bg-card border-2 border-black/30 dark:border-border hover:border-primary transition-all hover:shadow-lg">
                                <CardContent className="p-3 sm:p-4">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div
                                            className="relative cursor-pointer shrink-0"
                                            onClick={() => handleUserClick(user.id)}
                                        >
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={user.avatar_url || undefined} />
                                                <AvatarFallback className="bg-primary text-primary-foreground">
                                                    {user.username[0]?.toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <OnlineIndicator userId={user.id} />
                                        </div>
                                        <div
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={() => handleUserClick(user.id)}
                                        >
                                            <p className="font-semibold text-foreground truncate flex items-center gap-1">
                                                {user.full_name}
                                                <VerifiedBadge isVerified={user.is_verified} size={14} />
                                            </p>
                                            <p className="text-sm text-muted-foreground truncate">
                                                @{user.username}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                <span className="font-semibold text-foreground">
                                                    {user.follower_count}
                                                </span>{" "}
                                                followers
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <FollowButton
                                            userId={user.id}
                                            currentUserId={currentUser?.id}
                                        />
                                        <StartChatButton
                                            userId={user.id}
                                            currentUserId={currentUser?.id}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="flex justify-center">
                    <Button
                        variant="outline"
                        onClick={onSeeAllClick}
                        className="w-full sm:w-auto border-primary text-primary hover:bg-primary hover:text-primary-foreground animate-blink-glow"
                    >
                        See All People
                    </Button>
                </div>
            </>
        )}
    </section>
));

interface CategoryGridProps {
    onCategoryClick: (name: string) => void;
}

export const CategoryGrid = memo(({ onCategoryClick }: CategoryGridProps) => (
    <section>
        <h2 className="text-xl font-bold text-foreground mb-4">Tech Categories</h2>
        <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((category, index) => (
                <motion.div
                    key={category.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <Card
                        className="cursor-pointer border-2 border-black/30 dark:border-border hover:border-primary transition-all bg-card hover:shadow-lg"
                        onClick={() => onCategoryClick(category.name)}
                    >
                        <CardContent className="p-3 flex items-center gap-2">
                            <div className={`${category.color} p-2.5 rounded-lg shrink-0`}>
                                <category.icon className="text-white" size={20} />
                            </div>
                            <span className="font-semibold text-foreground text-sm sm:text-base truncate min-w-0 flex-1" title={category.name}>
                                {category.name}
                            </span>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    </section>
));

interface TrendingSectionProps {
    onTopicClick: (tag: string) => void;
    onProjectClick: (title: string) => void;
}

export const TrendingSection = memo(({ onTopicClick, onProjectClick }: TrendingSectionProps) => (
    <>
        {/* Trending Topics */}
        <section>
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="text-primary" size={24} />
                <h2 className="text-xl font-bold text-foreground">Trending Topics</h2>
            </div>
            <div className="space-y-3">
                {TRENDING_TOPICS.map((topic, index) => (
                    <motion.div
                        key={topic.tag}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card
                            className="cursor-pointer border-2 border-black/30 dark:border-border hover:border-primary transition-all bg-card hover:shadow-lg"
                            onClick={() => onTopicClick(topic.tag)}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-foreground">#{topic.tag}</p>
                                    <p className="text-sm text-muted-foreground">{topic.posts} posts</p>
                                </div>
                                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                                    Trending
                                </Badge>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </section>

        {/* Trending Projects */}
        <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Top Projects</h2>
            <div className="space-y-3">
                {TRENDING_PROJECTS.map((project, index) => (
                    <motion.div
                        key={project.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card
                            className="cursor-pointer border-2 border-black/30 dark:border-border hover:border-primary transition-all bg-card hover:shadow-lg"
                            onClick={() => onProjectClick(project.title)}
                        >
                            <CardContent className="p-4">
                                <h3 className="font-bold text-foreground mb-1">{project.title}</h3>
                                <p className="text-sm text-muted-foreground mb-3">by {project.author}</p>
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-2 flex-wrap">
                                        {project.tech.map((tech) => (
                                            <Badge key={tech} variant="outline" className="text-xs border-primary text-primary">
                                                {tech}
                                            </Badge>
                                        ))}
                                    </div>
                                    <span className="text-sm text-muted-foreground">{project.likes} likes</span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </section>
    </>
));
