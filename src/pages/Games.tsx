import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Grid,
    Gamepad2,
    Brain,
    Scissors,
    CircleDot,
    ArrowLeft,
    Zap,
    Type,
    Hash,
    Palette,
    Calculator,
} from "lucide-react";
import { motion } from "framer-motion";
import GameLeaderboard from "@/components/GameLeaderboard";

const games = [
    {
        id: "tic-tac-toe",
        title: "Tic Tac Toe",
        description: "Classic: The timeless game of X's and O's.",
        icon: <Gamepad2 className="w-10 h-10 md:w-12 md:h-12 text-white" />,
        gradient: "from-emerald-400 to-teal-600",
        shadow: "shadow-emerald-500/30",
        path: "/games/tic-tac-toe",
        difficulty: "Easy",
        dotColor: "bg-pink-400"
    },
    {
        id: "code-duel",
        title: "Code Duel",
        description: "Speed: Type code snippets against the clock!",
        icon: <Zap className="w-10 h-10 md:w-12 md:h-12 text-white" />,
        gradient: "from-yellow-400 to-orange-600",
        shadow: "shadow-yellow-500/30",
        path: "/games/code-duel",
        difficulty: "Medium",
        dotColor: "bg-yellow-400"
    },
    {
        id: "memory-match",
        title: "Memory Match",
        description: "Focus: Test your memory finding pairs.",
        icon: <Brain className="w-10 h-10 md:w-12 md:h-12 text-white" />,
        gradient: "from-violet-500 to-purple-600",
        shadow: "shadow-violet-500/30",
        path: "/games/memory-match",
        difficulty: "Hard",
        dotColor: "bg-cyan-400"
    },
    {
        id: "rock-paper-scissors",
        title: "Rock Paper Scissors",
        description: "Luck: Quick battle of mind games.",
        icon: <Scissors className="w-10 h-10 md:w-12 md:h-12 text-white" />,
        gradient: "from-pink-500 to-rose-600",
        shadow: "shadow-pink-500/30",
        path: "/games/rock-paper-scissors",
        difficulty: "Easy",
        dotColor: "bg-blue-400"
    },
    {
        id: "dots-and-boxes",
        title: "Dots & Boxes",
        description: "Strategy: Claim the most boxes to win.",
        icon: <Grid className="w-10 h-10 md:w-12 md:h-12 text-white" />,
        gradient: "from-blue-500 to-indigo-600",
        shadow: "shadow-blue-500/30",
        path: "/games/dots-and-boxes",
        difficulty: "Medium",
        dotColor: "bg-yellow-400"
    },
    {
        id: "connect-four",
        title: "Connect Four",
        description: "Strategy: Connect 4 discs to win.",
        icon: <CircleDot className="w-10 h-10 md:w-12 md:h-12 text-white" />,
        gradient: "from-orange-400 to-red-600",
        shadow: "shadow-orange-500/30",
        path: "/games/connect-four",
        difficulty: "Medium",
        dotColor: "bg-purple-400"
    },
    {
        id: "speed-math",
        title: "Speed Math",
        description: "Math: Solve problems before time runs out!",
        icon: <Calculator className="w-10 h-10 md:w-12 md:h-12 text-white" />,
        gradient: "from-cyan-400 to-blue-600",
        shadow: "shadow-cyan-500/30",
        path: "/games/speed-math",
        difficulty: "Medium",
        dotColor: "bg-cyan-400"
    },
    {
        id: "reflex-master",
        title: "Reflex Master",
        description: "Speed: Test your reaction time!",
        icon: <Zap className="w-10 h-10 md:w-12 md:h-12 text-white" />,
        gradient: "from-green-400 to-emerald-600",
        shadow: "shadow-green-500/30",
        path: "/games/reflex-master",
        difficulty: "Easy",
        dotColor: "bg-green-400"
    },
    {
        id: "word-blitz",
        title: "Word Blitz",
        description: "Language: Unscramble tech words fast!",
        icon: <Type className="w-10 h-10 md:w-12 md:h-12 text-white" />,
        gradient: "from-blue-400 to-purple-600",
        shadow: "shadow-blue-500/30",
        path: "/games/word-blitz",
        difficulty: "Medium",
        dotColor: "bg-blue-400"
    },
    {
        id: "number-merge",
        title: "Number Merge",
        description: "Puzzle: Merge tiles to reach 2048!",
        icon: <Hash className="w-10 h-10 md:w-12 md:h-12 text-white" />,
        gradient: "from-orange-400 to-red-600",
        shadow: "shadow-orange-500/30",
        path: "/games/number-merge",
        difficulty: "Medium",
        dotColor: "bg-orange-400"
    },
    {
        id: "pattern-pro",
        title: "Pattern Pro",
        description: "Memory: Simon Says - Repeat the pattern!",
        icon: <Palette className="w-10 h-10 md:w-12 md:h-12 text-white" />,
        gradient: "from-indigo-400 to-purple-600",
        shadow: "shadow-indigo-500/30",
        path: "/games/pattern-pro",
        difficulty: "Hard",
        dotColor: "bg-indigo-400"
    }
];

const Games = React.memo(() => {
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | undefined>(undefined);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id);
        });
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 pb-32">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/feed')} className="hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                            Game Zone <Gamepad2 className="w-8 h-8 md:w-10 md:h-10 text-primary animate-bounce-slow" />
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 md:mt-2 text-base md:text-lg mobile:text-sm">
                            Play games, challenge friends, and <span className="text-yellow-500 font-bold">Earn Coins!</span>
                        </p>
                    </div>
                </div>

                {/* Leaderboard Section (Now at the top) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative"
                >
                    {/* Decorative background for leaderboard */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-[2rem] -m-4 blur-xl" />
                    <div className="relative bg-card/50 backdrop-blur-sm rounded-[2rem] border border-border p-6 shadow-xl">
                        <GameLeaderboard currentUserId={userId} variant="gamer" />
                    </div>
                </motion.div>

                {/* Game Grid */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Gamepad2 className="text-primary" /> All Games
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {games.map((game, index) => (
                            <motion.div
                                key={game.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
                                whileHover={{ y: -8, scale: 1.02 }}
                                onClick={() => navigate(game.path)}
                                className="group cursor-pointer relative"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-20 blur-xl group-hover:opacity-40 transition-opacity rounded-[2rem]`} />
                                <Card className="h-full border-white/10 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] relative flex flex-col border p-1">
                                    <div className={`relative h-48 rounded-[1.8rem] overflow-hidden`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />

                                        {/* Pattern Overlay */}
                                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/50 to-transparent" />

                                        {/* Icon */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                                {game.icon}
                                            </div>
                                        </div>

                                        {/* Play Overlay */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                            <div className="bg-white text-black font-bold px-6 py-2 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-2">
                                                Play Now <Gamepad2 className="w-4 h-4 ml-1" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 flex-1 flex flex-col space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xl font-bold group-hover:text-primary transition-colors text-slate-800 dark:text-slate-100">{game.title}</h3>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wider bg-black/50 backdrop-blur-sm border border-white/10`}>
                                                {game.difficulty}
                                            </span>
                                        </div>

                                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed flex-1">
                                            {game.description}
                                        </p>

                                        <div className="flex items-center gap-2 pt-2">
                                            <div className="h-1.5 flex-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full bg-gradient-to-r ${game.gradient} w-2/3 opacity-80`} />
                                            </div>
                                            <span className="text-xs text-muted-foreground font-medium">1.2k playing</span>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
});

export default Games;
