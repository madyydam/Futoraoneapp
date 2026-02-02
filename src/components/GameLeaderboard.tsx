import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Crown, TrendingUp, ChevronRight, ExternalLink, Gamepad2, Stars } from "lucide-react";
import { CartoonLoader } from "@/components/CartoonLoader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { subDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface LeaderboardEntry {
    id: string;
    xp: number;
    level: number;
    total_wins?: number;
    username: string;
    avatar_url: string | null;
    full_name: string;
    last_activity_date?: string;
}

interface GameLeaderboardProps {
    currentUserId?: string;
    isWidget?: boolean;
    variant?: "global" | "gamer";
}

const GameLeaderboard = ({ currentUserId, isWidget = true, variant = "global" }: GameLeaderboardProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [timeFilter, setTimeFilter] = useState<"all" | "week" | "month">("all");
    const [userRank, setUserRank] = useState<number | null>(null);

    useEffect(() => {
        fetchLeaderboard();
        const handleUpdate = () => fetchLeaderboard();
        window.addEventListener('leaderboard-update', handleUpdate);
        return () => window.removeEventListener('leaderboard-update', handleUpdate);
    }, [variant, timeFilter]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('profiles')
                .select(`id, username, full_name, avatar_url, xp, level, total_wins, last_activity_date`);

            const now = new Date();
            if (timeFilter === "week") {
                const lastWeek = subDays(now, 7).toISOString();
                query = query.gte('last_activity_date', lastWeek);
            } else if (timeFilter === "month") {
                const lastMonth = subDays(now, 30).toISOString();
                query = query.gte('last_activity_date', lastMonth);
            }

            if (variant === "gamer") {
                query = query.order('total_wins', { ascending: false });
            } else {
                query = query.order('xp', { ascending: false });
            }

            const { data, error } = await query.limit(50);
            if (error) throw error;

            if (data) {
                const mappedData = (data as any[]).map(item => ({
                    ...item,
                    total_wins: item.total_wins || 0
                }));

                const hasWinners = mappedData.some(p => p.total_wins > 0);
                setLeaderboard(hasWinners && variant === 'gamer'
                    ? mappedData.filter(p => (p.total_wins || 0) > 0)
                    : mappedData
                );
            }
        } catch (err) {
            console.error("Error fetching leaderboard:", err);
            toast.error("Failed to load rankings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUserId) {
            const rank = leaderboard.findIndex(p => p.id === currentUserId);
            setUserRank(rank !== -1 ? rank + 1 : null);
        }
    }, [currentUserId, leaderboard]);

    const Podium = ({ entry, rank }: { entry: LeaderboardEntry; rank: number }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: rank * 0.1 }}
            className={cn(
                "flex flex-col items-center justify-end p-4 rounded-t-[3rem] bg-gradient-to-b border-t border-x border-border/10 relative group transition-all duration-500",
                isWidget ? (
                    rank === 1 ? "h-[220px] sm:h-[260px] w-1/3 z-20 from-yellow-500/15 to-transparent scale-105 shadow-xl shadow-yellow-500/5" :
                        rank === 2 ? "h-[180px] sm:h-[220px] w-1/3 from-slate-400/10 to-transparent" :
                            "h-[160px] sm:h-[200px] w-1/3 from-orange-800/10 to-transparent"
                ) : (
                    rank === 1 ? "h-[320px] sm:h-[360px] w-1/3 z-20 from-yellow-500/15 to-transparent shadow-2xl shadow-yellow-500/5 scale-105" :
                        rank === 2 ? "h-[260px] sm:h-[300px] w-1/3 from-slate-400/10 to-transparent" :
                            "h-[220px] sm:h-[260px] w-1/3 from-orange-800/10 to-transparent"
                )
            )}
        >
            {rank === 1 && <Crown className={cn("text-yellow-500 drop-shadow-lg animate-pulse", isWidget ? "w-8 h-8 mb-2" : "w-10 h-10 mb-6")} />}
            <div className={cn("relative", isWidget ? "mb-2" : "mb-6")}>
                <Avatar className={cn(
                    "ring-offset-2 ring-offset-background transition-transform group-hover:scale-110 duration-500 shadow-xl",
                    rank === 1 ? (isWidget ? "w-16 h-16 sm:w-20 sm:h-20" : "w-20 h-20 sm:w-28 sm:h-28") + " ring-4 ring-yellow-500" :
                        rank === 2 ? (isWidget ? "w-12 h-12 sm:w-16 sm:h-16" : "w-16 h-16 sm:w-24 sm:h-24") + " ring-4 ring-slate-400" :
                            (isWidget ? "w-10 h-10 sm:w-14 sm:h-14" : "w-14 h-14 sm:w-20 sm:h-20") + " ring-4 ring-orange-800"
                )}>
                    <AvatarImage src={entry.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className={cn("font-bold", isWidget ? "text-sm" : "text-xl")}>{entry.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className={cn(
                    "absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center font-black shadow-xl border-2 border-background",
                    isWidget ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs",
                    rank === 1 ? "bg-yellow-500 text-black" :
                        rank === 2 ? "bg-slate-400 text-black" :
                            "bg-orange-800 text-white"
                )}>
                    {rank}
                </div>
            </div>

            <div className={cn("text-center w-full px-2 space-y-0.5", isWidget ? "mb-2" : "mb-6")}>
                <p className={cn("font-black truncate drop-shadow-sm leading-tight", isWidget ? "text-[10px] sm:text-xs" : "text-xs sm:text-lg")}>
                    {entry.full_name.split(' ')[0]}
                </p>
                <div className={cn("flex flex-col items-center", isWidget ? "gap-0" : "gap-0.5")}>
                    <span className={cn("font-bold text-primary uppercase tracking-tighter", isWidget ? "text-[8px]" : "text-[10px] sm:text-xs")}>Level {entry.level}</span>
                    <span className={cn("font-black tracking-tight text-foreground", isWidget ? "text-[12px] sm:text-[14px]" : "text-[14px] sm:text-[18px]")}>
                        {variant === 'gamer' ? (entry.total_wins || 0) : entry.xp}
                        <span className={cn("ml-1 font-bold text-muted-foreground uppercase", isWidget ? "text-[7px]" : "text-[10px]")}>{variant === 'gamer' ? 'Wins' : 'XP'}</span>
                    </span>
                </div>
            </div>
        </motion.div>
    );

    const listItems = useMemo(() => {
        const fullList = leaderboard.slice(3);
        if (!isWidget) return fullList;
        if (!currentUserId || !userRank || userRank <= 3) return fullList.slice(0, 3);
        return fullList.filter((_, idx) => Math.abs((idx + 4) - userRank) <= 1);
    }, [leaderboard, isWidget, currentUserId, userRank]);

    return (
        <div className={cn("animate-in fade-in duration-700", isWidget ? "space-y-4" : "space-y-8")}>
            {/* Contextual Header - Hidden in widget mode to avoid redundancy */}
            {!isWidget && (
                <div className={cn("flex flex-col items-center justify-center text-center px-2", isWidget ? "gap-2" : "gap-6")}>
                    <div className="space-y-1">
                        <h2 className={cn("font-black tracking-tighter uppercase leading-none", isWidget ? "text-xl sm:text-2xl" : "text-4xl")}>
                            {variant === 'gamer' ? "Gamer Zone" : "Hall of Stars"}
                        </h2>
                        <p className={cn("font-bold text-muted-foreground uppercase", isWidget ? "text-[8px] tracking-[0.2em]" : "text-[10px] tracking-[0.3em]")}>
                            {variant === 'gamer' ? "Rankings by Total Wins" : "Rankings by Experience Points"}
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 transition-all">
                        <Tabs value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)} className="w-auto">
                            <TabsList className={cn("bg-muted/30 p-1 rounded-full backdrop-blur-sm", isWidget ? "h-9" : "h-11")}>
                                <TabsTrigger value="week" className={cn("rounded-full font-black uppercase tracking-tight", isWidget ? "px-3 text-[8px]" : "px-5 text-[10px]")}>Week</TabsTrigger>
                                <TabsTrigger value="month" className={cn("rounded-full font-black uppercase tracking-tight", isWidget ? "px-3 text-[8px]" : "px-5 text-[10px]")}>Month</TabsTrigger>
                                <TabsTrigger value="all" className={cn("rounded-full font-black uppercase tracking-tight", isWidget ? "px-3 text-[8px]" : "px-5 text-[10px]")}>All Time</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={fetchLeaderboard}
                            className={cn("rounded-full bg-muted/30 hover:bg-muted/50 transition-all shadow-sm", isWidget ? "h-9 w-9" : "h-11 w-11", loading && "animate-pulse")}
                        >
                            <TrendingUp className={cn(loading && "animate-spin", isWidget ? "w-4 h-4" : "w-5 h-5")} />
                        </Button>
                    </div>
                </div>
            )}

            <div className={cn(
                "w-full overflow-hidden transition-all duration-1000",
                isWidget ? "rounded-[2rem]" : "rounded-[3.5rem]",
                !isWidget ? "bg-transparent" : "bg-card/40 backdrop-blur-xl border border-border/50 shadow-2xl"
            )}>
                {loading ? (
                    <div className="h-[500px] flex flex-col items-center justify-center gap-4 bg-muted/5">
                        <CartoonLoader />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Syncing Rankings...</p>
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="text-center py-24 px-4 bg-muted/5">
                        <Trophy className="w-20 h-20 text-muted-foreground/10 mx-auto mb-6" />
                        <h3 className="text-2xl font-black uppercase tracking-tighter">No Champions Yet</h3>
                        <p className="text-muted-foreground text-sm font-medium mt-2 max-w-xs mx-auto">
                            The arena is waiting for its first hero. Step up and claim your glory!
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {/* THE PODIUM */}
                        <div className="flex items-end justify-center px-4 pt-10 pb-6 bg-gradient-to-b from-primary/5 to-transparent border-b border-border/20 overflow-hidden">
                            <AnimatePresence mode="popLayout">
                                {leaderboard[1] && <Podium entry={leaderboard[1]} rank={2} key={`p2-${variant}`} />}
                                {leaderboard[0] && <Podium entry={leaderboard[0]} rank={1} key={`p1-${variant}`} />}
                                {leaderboard[2] && <Podium entry={leaderboard[2]} rank={3} key={`p3-${variant}`} />}
                            </AnimatePresence>
                        </div>

                        {/* THE LIST */}
                        <div className={cn(
                            "px-4 py-6 space-y-3",
                            !isWidget ? "max-h-none" : "max-h-[400px] overflow-y-auto"
                        )}>
                            {listItems.map((entry, index) => {
                                const trueRank = leaderboard.findIndex(p => p.id === entry.id) + 1;
                                const isCurrentUser = entry.id === currentUserId;

                                return (
                                    <motion.div
                                        key={entry.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: (index * 0.05) }}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-[1.5rem] border transition-all group",
                                            isCurrentUser ? "bg-primary/20 border-primary/40 shadow-lg shadow-primary/5 scale-[1.02]" : "bg-muted/10 border-border/40 hover:bg-muted/20 hover:border-border/60"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shadow-inner",
                                            isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
                                        )}>
                                            {trueRank}
                                        </div>

                                        <Avatar className="h-12 w-12 border-2 border-background shadow-md">
                                            <AvatarImage src={entry.avatar_url || undefined} className="object-cover" />
                                            <AvatarFallback className="font-bold">{entry.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 min-w-0">
                                            <p className={cn("font-black tracking-tight flex items-center gap-2 truncate", isCurrentUser && "text-primary text-lg")}>
                                                {entry.full_name} {isCurrentUser && <Star className="w-3 h-3 fill-current" />}
                                            </p>
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase truncate">@{entry.username}</span>
                                                <div className="w-1 h-1 bg-muted-foreground/30 rounded-full shrink-0" />
                                                <span className="text-[10px] font-black text-primary uppercase">Lvl {entry.level}</span>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <p className="text-xl font-black tracking-tighter leading-none">
                                                {variant === 'gamer' ? (entry.total_wins || 0) : entry.xp.toLocaleString()}
                                            </p>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase mt-1">
                                                {variant === 'gamer' ? "Wins" : "XP"}
                                            </p>
                                        </div>
                                    </motion.div>
                                )
                            })}

                            {isWidget && (
                                <div className="pt-6 pb-2">
                                    <Button
                                        variant="outline"
                                        className="w-full h-11 rounded-xl gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 font-black uppercase tracking-widest text-[10px] transition-all"
                                        onClick={() => navigate('/leaderboard')}
                                    >
                                        See Full Rankings <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* STICKY ME RANKING */}
                        {currentUserId && userRank && isWidget && userRank > 3 && (
                            <div className="p-4 bg-primary/5 border-t border-border/50 flex items-center gap-4 animate-in slide-in-from-bottom duration-500">
                                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black">{userRank}</div>
                                <div className="flex-1 font-black text-xs uppercase tracking-widest">You are currently ranked #{userRank}</div>
                                <Button onClick={() => navigate('/leaderboard')} variant="ghost" size="sm" className="font-black uppercase text-[10px] tracking-wider gap-2">
                                    Full List <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const Star = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
    </svg>
);

export default GameLeaderboard;
