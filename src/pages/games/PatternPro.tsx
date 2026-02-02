import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, Trophy, Timer, Zap, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { useGameSounds } from "@/hooks/useGameSounds";
import { HowToPlay } from "@/components/games/HowToPlay";
import { Card } from "@/components/ui/card";
import { useGameReward } from "@/hooks/useGameReward";
import { WinCelebration } from "@/components/games/WinCelebration";

const COLORS = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500"];
const SEQUENCE_LENGTH_START = 3;
const TIME_PER_TILE = 800; // ms to show each tile

const PatternPro = () => {
    const navigate = useNavigate();
    const playSound = useGameSounds();
    const {
        triggerWinReward,
        showRewardModal,
        setShowRewardModal,
        COIN_REWARD,
        XP_REWARD
    } = useGameReward();
    const [sequence, setSequence] = useState<number[]>([]);
    const [userSequence, setUserSequence] = useState<number[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isUserTurn, setIsUserTurn] = useState(false);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [bestLevel, setBestLevel] = useState(0);
    const [showingIndex, setShowingIndex] = useState<number | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem("pattern_pro_best");
        if (saved) setBestLevel(parseInt(saved));
    }, []);

    const startGame = () => {
        playSound('click');
        setCurrentLevel(1);
        setUserSequence([]);
        const newSequence = generateSequence(SEQUENCE_LENGTH_START);
        setSequence(newSequence);
        setIsPlaying(true);
        playSequence(newSequence);
    };

    const generateSequence = (length: number): number[] => {
        return Array.from({ length }, () => Math.floor(Math.random() * 6));
    };

    const playSequence = async (seq: number[]) => {
        setIsUserTurn(false);
        await new Promise(resolve => setTimeout(resolve, 500));

        for (let i = 0; i < seq.length; i++) {
            setShowingIndex(seq[i]);
            playSound('pop');
            await new Promise(resolve => setTimeout(resolve, TIME_PER_TILE));
            setShowingIndex(null);
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        setIsUserTurn(true);
        toast.info("Your turn! Repeat the pattern.", { icon: "👆" });
    };

    const handleTileClick = (index: number) => {
        if (!isUserTurn) return;

        playSound('pop');
        const newUserSequence = [...userSequence, index];
        setUserSequence(newUserSequence);

        // Check if correct so far
        if (sequence[newUserSequence.length - 1] !== index) {
            // Wrong!
            playSound('lose');
            toast.error(`Wrong! You reached level ${currentLevel}`, { icon: "❌" });

            if (currentLevel > bestLevel) {
                setBestLevel(currentLevel);
                localStorage.setItem("pattern_pro_best", currentLevel.toString());
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
                toast.success("New Best Level!", { icon: "🏆" });
            }

            setIsPlaying(false);
            return;
        }

        // Check if complete
        if (newUserSequence.length === sequence.length) {
            playSound('win');
            toast.success(`Level ${currentLevel} complete!`, { icon: "🎉" });

            setTimeout(() => {
                const nextLevel = currentLevel + 1;
                setCurrentLevel(nextLevel);
                setUserSequence([]);
                const newSequence = generateSequence(SEQUENCE_LENGTH_START + nextLevel - 1);
                setSequence(newSequence);
                playSequence(newSequence);
            }, 1000);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center py-6 px-4">
            <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/games")}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <HowToPlay
                        title="Pattern Pro (Simon Says)"
                        description="Watch the pattern, then repeat it!"
                        rules={[
                            "Watch carefully as tiles light up in sequence.",
                            "Repeat the exact pattern by clicking the tiles.",
                            "Each level adds one more tile to remember.",
                            "One mistake and you're out!"
                        ]}
                    />
                </div>

                <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent hidden md:block">Pattern Pro</h1>

                <Button variant="outline" size="icon" onClick={startGame} disabled={isPlaying && isUserTurn}>
                    {isPlaying ? <RotateCcw className="w-5 h-5" /> : <Brain className="w-5 h-5" />}
                </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-4 mb-8">
                <Card className="p-4 bg-white/50 backdrop-blur min-w-[120px]">
                    <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                            <Zap className="w-3 h-3" /> LEVEL
                        </div>
                        <div className="text-4xl font-black text-indigo-600">{currentLevel}</div>
                    </div>
                </Card>
                <Card className="p-4 bg-white/50 backdrop-blur min-w-[120px]">
                    <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                            <Trophy className="w-3 h-3" /> BEST
                        </div>
                        <div className="text-4xl font-black text-yellow-600">{bestLevel}</div>
                    </div>
                </Card>
                <Card className="p-4 bg-white/50 backdrop-blur min-w-[120px]">
                    <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                            <Brain className="w-3 h-3" /> TILES
                        </div>
                        <div className="text-4xl font-black text-purple-600">{sequence.length}</div>
                    </div>
                </Card>
            </div>

            {/* Game Grid */}
            <AnimatePresence mode="wait">
                {!isPlaying ? (
                    <motion.div
                        key="start"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="text-center"
                    >
                        <Brain className="w-20 h-20 text-purple-500 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold mb-4">Test Your Memory!</h2>
                        <p className="text-muted-foreground mb-6 max-w-xs">Watch the pattern carefully and repeat it back.</p>
                        <Button size="lg" onClick={startGame} className="px-12 py-6 text-xl font-bold">
                            Start Game
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="playing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full max-w-md"
                    >
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            {COLORS.map((color, index) => (
                                <motion.button
                                    key={index}
                                    onClick={() => handleTileClick(index)}
                                    disabled={!isUserTurn}
                                    whileHover={isUserTurn ? { scale: 1.05 } : {}}
                                    whileTap={isUserTurn ? { scale: 0.95 } : {}}
                                    className={`aspect-square rounded-2xl ${color} shadow-xl transition-all duration-200 disabled:opacity-50 ${showingIndex === index ? 'ring-8 ring-white ring-opacity-80 scale-110' : ''
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Progress Indicator */}
                        <div className="bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden mb-4">
                            <motion.div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                                initial={{ width: 0 }}
                                animate={{ width: `${(userSequence.length / sequence.length) * 100}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>

                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                                {isUserTurn ? (
                                    <>Entered: {userSequence.length} / {sequence.length}</>
                                ) : (
                                    <span className="animate-pulse">🧠 Watch carefully...</span>
                                )}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Win Celebration Modal */}
            <WinCelebration
                isOpen={showRewardModal}
                onClose={() => setShowRewardModal(false)}
                coins={COIN_REWARD}
                xp={XP_REWARD}
            />
        </div>
    );
};

export default PatternPro;
