import React, { useState, useEffect, useCallback, memo, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
    Trophy,
    Share2,
    Lock,
    Award,
    Star,
    Zap,
    Crown,
    Linkedin,
    Footprints,
    PenTool,
    Heart,
    Code,
    Bug,
    Flame
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon_name: string;
    xp_reward: number;
    unlocked_at?: string;
}

interface LeaderboardUser {
    id: string;
    username: string;
    avatar_url: string | null;
    xp: number;
    level: number;
}

// Local achievement definitions
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
    { id: 'first_post', title: 'First Post', description: 'Created your first post!', icon_name: 'PenTool', xp_reward: 50 },
    { id: 'first_like', title: 'Liked!', description: 'Received your first like', icon_name: 'Heart', xp_reward: 25 },
    { id: 'rising_star', title: 'Rising Star', description: 'Got your first follower', icon_name: 'Star', xp_reward: 75 },
    { id: 'code_master', title: 'Code Master', description: 'Shared 10 code snippets', icon_name: 'Code', xp_reward: 100 },
    { id: 'bug_hunter', title: 'Bug Hunter', description: 'Helped debug 5 issues', icon_name: 'Bug', xp_reward: 150 },
    { id: 'on_fire', title: 'On Fire!', description: '7-day activity streak', icon_name: 'Flame', xp_reward: 200 },
];

// Map icon names from database to Lucide components
const IconMap: { [key: string]: React.ElementType } = {
    'Footprints': Footprints,
    'PenTool': PenTool,
    'Heart': Heart,
    'Code': Code,
    'Bug': Bug,
    'Flame': Flame,
    'Trophy': Trophy,
    'Award': Award,
    'Zap': Zap,
    'Star': Star
};

export const AchievementShowcase = memo(({ userId }: { userId?: string }) => {
    const [activeTab, setActiveTab] = useState<'badges' | 'leaderboard'>('badges');
    const [achievements, setAchievements] = useState<Achievement[]>(DEFAULT_ACHIEVEMENTS);
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAllBadges, setShowAllBadges] = useState(false);
    const [currentUserRank, setCurrentUserRank] = useState<{ rank: number, user: LeaderboardUser } | null>(null);
    const [currentViewerId, setCurrentViewerId] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Determine which user to fetch for
            let targetId = userId;
            if (!targetId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) targetId = user.id;
            }

            if (!targetId) {
                setLoading(false);
                return;
            }

            setCurrentViewerId(targetId);

            // Fetch user stats to simulate unlocked achievements
            const [postsRes, likesRes, followersRes] = await Promise.all([
                supabase.from('posts').select('id', { count: 'exact' }).eq('user_id', targetId),
                supabase.from('likes').select('id', { count: 'exact' }).eq('user_id', targetId),
                supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', targetId),
            ]);

            const postCount = postsRes.count || 0;
            const likeCount = likesRes.count || 0;
            const followerCount = followersRes.count || 0;

            // Simulate unlocked achievements based on activity
            const unlockedIds: string[] = [];
            if (postCount >= 1) unlockedIds.push('first_post');
            if (likeCount >= 1) unlockedIds.push('first_like');
            if (followerCount >= 1) unlockedIds.push('rising_star');
            if (postCount >= 10) unlockedIds.push('code_master');

            const mergedAchievements = DEFAULT_ACHIEVEMENTS.map(ach => ({
                ...ach,
                unlocked_at: unlockedIds.includes(ach.id) ? new Date().toISOString() : undefined
            }));

            setAchievements(mergedAchievements);

            // Fetch leaderboard from profiles (using follower count as XP proxy)
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .limit(100);

            if (profiles) {
                // Get follower counts for each profile
                const usersWithStats = await Promise.all(
                    profiles.slice(0, 10).map(async (profile) => {
                        const { count } = await supabase
                            .from('follows')
                            .select('*', { count: 'exact', head: true })
                            .eq('following_id', profile.id);
                        
                        return {
                            ...profile,
                            xp: (count || 0) * 10,
                            level: Math.floor((count || 0) / 5) + 1
                        };
                    })
                );

                const sortedUsers = usersWithStats.sort((a, b) => b.xp - a.xp);
                const userIndex = sortedUsers.findIndex(u => u.id === targetId);
                
                setLeaderboard(sortedUsers.slice(0, 3));

                if (userIndex > 2) {
                    setCurrentUserRank({
                        rank: userIndex + 1,
                        user: sortedUsers[userIndex]
                    });
                } else {
                    setCurrentUserRank(null);
                }
            }

        } catch (error) {
            console.error("Error fetching gamification data:", error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleShare = useCallback(async () => {
        const unlockedCount = achievements.filter(a => a.unlocked_at).length;
        const totalXp = achievements.reduce((acc, curr) => acc + (curr.unlocked_at ? curr.xp_reward : 0), 0);
        const shareText = `I've unlocked ${unlockedCount} achievements and earned ${totalXp} XP on FutoraOne! 🚀`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My FutoraOne Achievements',
                    text: shareText,
                    url: window.location.href,
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            navigator.clipboard.writeText(shareText);
            toast({
                title: "Copied to clipboard",
                description: "Show off your stats!",
            });
        }
    }, [achievements, toast]);

    // Enhanced animation variants with proper typing
    const containerVariants: Variants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.1,
                duration: 0.3
            }
        },
        exit: {
            opacity: 0,
            scale: 0.95,
            transition: { duration: 0.2 }
        }
    };

    const itemVariants: Variants = {
        hidden: { y: 30, opacity: 0, scale: 0.8, rotateX: -15 },
        visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            rotateX: 0,
            transition: {
                type: "spring" as const,
                stiffness: 400,
                damping: 25,
                mass: 0.8
            }
        }
    };

    const badgeHoverVariants: Variants = {
        rest: { scale: 1, rotateY: 0 },
        hover: {
            scale: 1.05,
            rotateY: 5,
            transition: {
                type: "spring" as const,
                stiffness: 400,
                damping: 10
            }
        }
    };

    const shineVariants: Variants = {
        initial: { x: '-100%' },
        animate: {
            x: '200%',
            transition: {
                repeat: Infinity,
                duration: 3,
                ease: "linear",
                repeatDelay: 5
            }
        }
    };

    // Determine which achievements to display
    const visibleAchievements = showAllBadges ? achievements : achievements.slice(0, 4);

    return (
        <Card className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border-white/20 dark:border-white/10 overflow-hidden">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                        <Trophy className="text-yellow-500" />
                        Hall of Fame
                    </h2>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-blue-400/20 hover:bg-blue-400/10 text-blue-400"
                            onClick={() => window.open(`https://twitter.com/intent/tweet?text=I've just unlocked new achievements on FutoraOne! 🚀 Check out my dev profile!&url=${encodeURIComponent(window.location.href)}`, '_blank')}
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-blue-600/20 hover:bg-blue-600/10 text-blue-600"
                            onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank')}
                        >
                            <Linkedin className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-primary/20 hover:bg-primary/10"
                            onClick={handleShare}
                        >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                        </Button>
                    </div>
                </div>

                <div className="flex bg-muted/20 p-1 rounded-xl mb-6">
                    <button
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'badges'
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                            }`}
                        onClick={() => setActiveTab('badges')}
                    >
                        Badges
                    </button>
                    <button
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'leaderboard'
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                            }`}
                        onClick={() => setActiveTab('leaderboard')}
                    >
                        Leaderboard
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'badges' ? (
                        <>
                            <motion.div
                                key="badges"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
                                style={{ perspective: 1000 }}
                            >
                                {loading ? (
                                    Array(4).fill(0).map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className="h-32 bg-muted/10 rounded-xl overflow-hidden"
                                            animate={{ opacity: [0.4, 0.8, 0.4] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        />
                                    ))
                                ) : visibleAchievements.map((achievement, index) => {
                                    const IconComponent = IconMap[achievement.icon_name] || Award;
                                    return (
                                        <motion.div
                                            key={achievement.id}
                                            variants={itemVariants}
                                            initial="rest"
                                            whileHover={achievement.unlocked_at ? "hover" : "rest"}
                                        >
                                            <motion.div
                                                variants={badgeHoverVariants}
                                                className={`
                                                    relative p-4 rounded-xl border transition-all duration-300 overflow-hidden
                                                    ${achievement.unlocked_at
                                                        ? 'bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border-primary/30 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/30 cursor-pointer'
                                                        : 'bg-muted/5 border-muted/20 grayscale opacity-60'}
                                                `}
                                            >
                                                {/* Shine effect for unlocked badges */}
                                                {achievement.unlocked_at && (
                                                    <motion.div
                                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                                        variants={shineVariants}
                                                        initial="initial"
                                                        animate="animate"
                                                        style={{ skewX: -20 }}
                                                    />
                                                )}

                                                <div className="absolute top-2 right-2 z-10">
                                                    {achievement.unlocked_at ? (
                                                        <motion.div
                                                            animate={{
                                                                rotate: [0, 10, -10, 0],
                                                                scale: [1, 1.1, 1]
                                                            }}
                                                            transition={{
                                                                duration: 2,
                                                                repeat: Infinity,
                                                                repeatDelay: 3
                                                            }}
                                                        >
                                                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                                        </motion.div>
                                                    ) : (
                                                        <Lock className="w-4 h-4 text-muted-foreground" />
                                                    )}
                                                </div>

                                                <div className="flex flex-col items-center text-center relative z-10">
                                                    <motion.div
                                                        className={`p-3 rounded-full mb-2 ${achievement.unlocked_at
                                                            ? 'bg-gradient-to-br from-primary/20 to-purple-500/20'
                                                            : 'bg-muted/10'}`}
                                                        whileHover={achievement.unlocked_at ? { scale: 1.1, rotate: 5 } : {}}
                                                    >
                                                        <IconComponent className={`w-6 h-6 ${achievement.unlocked_at ? 'text-primary' : 'text-muted-foreground'}`} />
                                                    </motion.div>
                                                    <h4 className={`font-semibold text-sm ${achievement.unlocked_at ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                        {achievement.title}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                        {achievement.description}
                                                    </p>
                                                    {achievement.unlocked_at && (
                                                        <div className="flex items-center gap-1 mt-2 text-xs text-orange-500 font-medium">
                                                            <Zap className="w-3 h-3" />
                                                            +{achievement.xp_reward} XP
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>

                            {achievements.length > 4 && (
                                <Button
                                    variant="ghost"
                                    className="w-full mt-4"
                                    onClick={() => setShowAllBadges(!showAllBadges)}
                                >
                                    {showAllBadges ? 'Show Less' : `View All (${achievements.length})`}
                                </Button>
                            )}
                        </>
                    ) : (
                        <motion.div
                            key="leaderboard"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="space-y-3"
                        >
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="h-16 bg-muted/10 rounded-xl animate-pulse" />
                                ))
                            ) : (
                                <>
                                    {leaderboard.map((user, index) => (
                                        <motion.div
                                            key={user.id}
                                            variants={itemVariants}
                                            className={`flex items-center gap-4 p-4 rounded-xl border ${index === 0 ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30' :
                                                index === 1 ? 'bg-gradient-to-r from-gray-300/10 to-gray-400/10 border-gray-400/30' :
                                                    'bg-gradient-to-r from-amber-600/10 to-orange-700/10 border-amber-600/30'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-yellow-500 text-black' :
                                                index === 1 ? 'bg-gray-300 text-black' :
                                                    'bg-amber-600 text-white'
                                                }`}>
                                                {index === 0 ? <Crown className="w-4 h-4" /> : index + 1}
                                            </div>
                                            <Avatar className="h-10 w-10 border-2 border-background">
                                                <AvatarImage src={user.avatar_url || ''} />
                                                <AvatarFallback>{user.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <p className="font-semibold">{user.username}</p>
                                                <p className="text-xs text-muted-foreground">Level {user.level}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-primary">{user.xp} XP</p>
                                            </div>
                                        </motion.div>
                                    ))}

                                    {currentUserRank && (
                                        <>
                                            <div className="flex items-center justify-center gap-1 text-muted-foreground py-2">
                                                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                                                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                                                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                                            </div>
                                            <motion.div
                                                variants={itemVariants}
                                                className="flex items-center gap-4 p-4 rounded-xl border bg-primary/5 border-primary/30"
                                            >
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-primary/20 text-primary">
                                                    {currentUserRank.rank}
                                                </div>
                                                <Avatar className="h-10 w-10 border-2 border-primary">
                                                    <AvatarImage src={currentUserRank.user.avatar_url || ''} />
                                                    <AvatarFallback>{currentUserRank.user.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <p className="font-semibold">{currentUserRank.user.username} <span className="text-xs text-muted-foreground">(You)</span></p>
                                                    <p className="text-xs text-muted-foreground">Level {currentUserRank.user.level}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-primary">{currentUserRank.user.xp} XP</p>
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Card>
    );
});

AchievementShowcase.displayName = 'AchievementShowcase';
