import React, { useState } from "react";
import {
    Trophy,
    Flame,
    Zap,
    CheckCircle2,
    Circle,
    ChevronRight,
    Target,
    Share2
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DailyChallenge {
    id: string;
    title: string;
    xp: number;
    completed: boolean;
    current: number;
    target: number;
}

interface GamificationBarProps {
    userProfile?: {
        xp?: number;
        level?: number;
        current_streak?: number;
        longest_streak?: number;
        daily_challenges?: DailyChallenge[];
    } | null;
}

export const GamificationBar = ({ userProfile }: GamificationBarProps) => {
    const [isOpen, setIsOpen] = useState(false);

    // Default values if profile is loading or empty
    const xp = userProfile?.xp || 0;
    const level = userProfile?.level || 1;
    const streak = userProfile?.current_streak || 0;
    const maxStreak = userProfile?.longest_streak || 0;

    // Calculate level progress
    // Formula: Level N requires 100 * N^2 XP total? Or simple 1000 per level?
    // Let's assume simpler: 1000 XP per level for visualization
    const xpPerLevel = 1000;
    const currentLevelXp = xp % xpPerLevel;
    const progress = (currentLevelXp / xpPerLevel) * 100;

    // Mock daily challenges if not present
    const challenges: DailyChallenge[] = userProfile?.daily_challenges || [
        { id: 'story', title: "Post a Story", xp: 50, completed: false, current: 0, target: 1 },
        { id: 'likes', title: "Like 5 Posts", xp: 25, completed: false, current: 0, target: 5 },
        { id: 'comment', title: "Visit Ecosystem", xp: 10, completed: false, current: 0, target: 1 },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full mb-6 cursor-pointer group relative z-10"
                >
                    {/* Main Bar Container (Vibrant Hero Style) */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#db2777] shadow-xl shadow-indigo-500/20 transition-all duration-300 group-hover:shadow-indigo-500/30">

                        {/* Glass Overlay & Texture */}
                        <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]" />
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />

                        {/* Animated Shimmer */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />

                        <div className="relative px-5 py-4 flex items-center justify-between gap-3 text-white">
                            {/* Left Section: Level & Progress */}
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
                                    {/* Circular Progress Ring */}
                                    <svg className="w-full h-full transform -rotate-90 drop-shadow-md">
                                        <circle
                                            cx="28"
                                            cy="28"
                                            r="24"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="transparent"
                                            className="text-white/20"
                                        />
                                        <circle
                                            cx="28"
                                            cy="28"
                                            r="24"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="transparent"
                                            strokeLinecap="round"
                                            className="text-white transition-all duration-1000 ease-out"
                                            strokeDasharray={`${2 * Math.PI * 24}`}
                                            strokeDashoffset={`${2 * Math.PI * 24 * (1 - progress / 100)}`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="font-black text-lg text-white drop-shadow-sm">{level}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-xl font-black tracking-tight text-white drop-shadow-sm">Level {level}</span>
                                        <span className="px-2 py-0.5 rounded-full bg-white/20 border border-white/10 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-sm">
                                            {Math.floor(progress)}%
                                        </span>
                                    </div>
                                    <p className="text-sm text-indigo-100/90 truncate font-medium">
                                        {xp.toLocaleString()} XP Points
                                    </p>
                                </div>
                            </div>

                            {/* Right Section: Streak Badge */}
                            <div className="flex items-center gap-4 shrink-0">
                                <div className="hidden sm:flex flex-col items-end mr-1">
                                    <span className="text-[10px] font-bold text-indigo-100/80 uppercase tracking-widest">Streak</span>
                                    <span className="text-xs font-bold text-white">{maxStreak} Best</span>
                                </div>
                                <div className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300 backdrop-blur-md shadow-lg",
                                    streak > 0
                                        ? "bg-white/10 border-white/20 text-white"
                                        : "bg-black/20 border-white/5 text-white/50"
                                )}>
                                    <Flame className={cn("w-6 h-6 fill-current drop-shadow-md", streak > 0 && "text-orange-400 animate-pulse")} />
                                    <span className="font-black text-xl tabular-nums tracking-tight">{streak}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md w-[95vw] max-h-[85vh] overflow-y-auto overflow-x-hidden gap-6 bg-gradient-to-b from-white to-indigo-50 dark:from-slate-900 dark:to-slate-950 border-white/20 dark:border-indigo-500/20 p-0 shadow-2xl [&>button]:top-4 [&>button]:right-4">
                <div className="p-6 pb-2 relative">
                    {/* Decorative Background for Header */}
                    <div className="absolute inset-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />

                    <DialogHeader className="space-y-4 items-center text-center relative z-10 pt-2">
                        <div className="relative">
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-[0_4px_20px_rgba(249,115,22,0.4)] ring-4 ring-white dark:ring-slate-900"
                            >
                                <Trophy className="w-9 h-9 text-white fill-white/20" />
                            </motion.div>
                            <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1 shadow-lg border border-border/50">
                                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full px-2.5 py-0.5 textxs font-bold text-white shadow-sm">
                                    Lvl {level}
                                </div>
                            </div>
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                                Daily Progress
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground mt-1 font-medium">
                                Build your streak and earn rewards!
                            </p>
                        </div>
                    </DialogHeader>

                    <div className="space-y-6 mt-6">
                        {/* Streak Stats Grid - More Compact */}
                        <div className="grid grid-cols-2 gap-3">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="p-3.5 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex flex-col items-center justify-center gap-1 group hover:bg-orange-500/10 transition-colors"
                            >
                                <Flame className="w-5 h-5 text-orange-500 fill-orange-500/20 mb-1" />
                                <span className="text-2xl font-black text-slate-800 dark:text-slate-200">{streak}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Current Streak</span>
                            </motion.div>
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex flex-col items-center justify-center gap-1 group hover:bg-blue-500/10 transition-colors"
                            >
                                <Zap className="w-5 h-5 text-blue-500 fill-blue-500/20 mb-1" />
                                <span className="text-2xl font-black text-slate-800 dark:text-slate-200">{maxStreak}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Best Streak</span>
                            </motion.div>
                        </div>

                        {/* Daily Challenges List */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <Target className="w-4 h-4 text-primary" />
                                    Today's Challenges
                                </h3>
                                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                    {challenges.filter(c => c.completed).length}/{challenges.length} Done
                                </span>
                            </div>

                            <div className="space-y-2.5">
                                {challenges.map((challenge, idx) => (
                                    <motion.div
                                        key={challenge.id}
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 + (idx * 0.1) }}
                                        className={cn(
                                            "group relative overflow-hidden rounded-xl border transition-all duration-300",
                                            challenge.completed
                                                ? "bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200/50 dark:border-indigo-500/20"
                                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm"
                                        )}
                                    >
                                        <div className="relative p-3.5 flex items-center gap-3">
                                            {/* Completion Checkbox */}
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0",
                                                challenge.completed
                                                    ? "bg-indigo-600 border-indigo-600 text-white scale-100 shadow-sm"
                                                    : "border-slate-200 dark:border-slate-700 text-transparent group-hover:border-indigo-400"
                                            )}>
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className={cn(
                                                        "text-sm font-bold truncate transition-colors",
                                                        challenge.completed ? "text-slate-500 dark:text-slate-400 line-through decoration-slate-400/50" : "text-slate-900 dark:text-slate-100"
                                                    )}>
                                                        {challenge.title}
                                                    </p>
                                                    <span className={cn(
                                                        "text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-colors",
                                                        challenge.completed
                                                            ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                            : "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30"
                                                    )}>
                                                        +{challenge.xp} XP
                                                    </span>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="relative h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className={cn("absolute inset-y-0 left-0 rounded-full", challenge.completed ? "bg-indigo-500" : "bg-indigo-600")}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(100, (challenge.current / challenge.target) * 100)}%` }}
                                                        transition={{ duration: 1, ease: "easeOut" }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-2 bg-gradient-to-t from-white via-white to-transparent dark:from-slate-950 dark:via-slate-950 sticky bottom-0 z-20">
                    <Button className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0" onClick={() => setIsOpen(false)}>
                        Keep Grinding! 🚀
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
