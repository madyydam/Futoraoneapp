import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Trophy, Timer, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { useGameSounds } from "@/hooks/useGameSounds";
import { HowToPlay } from "@/components/games/HowToPlay";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useGameReward } from "@/hooks/useGameReward";
import { WinCelebration } from "@/components/games/WinCelebration";

const WORDS = [
    "REACT", "JAVASCRIPT", "TYPESCRIPT", "COMPONENT", "FUNCTION",
    "DEVELOPER", "CODING", "ALGORITHM", "DATABASE", "FRONTEND",
    "BACKEND", "DESIGN", "NETWORK", "SECURITY", "TESTING",
    "DEPLOY", "VERSION", "COMMIT", "BRANCH", "MERGE",
    "DEBUG", "SYNTAX", "COMPILE", "RUNTIME", "MEMORY"
];

const WordBlitz = () => {
    const navigate = useNavigate();
    const playSound = useGameSounds();
    const {
        triggerWinReward,
        showRewardModal,
        setShowRewardModal,
        COIN_REWARD,
        XP_REWARD
    } = useGameReward();
    const [currentWord, setCurrentWord] = useState("");
    const [scrambled, setScrambled] = useState("");
    const [userInput, setUserInput] = useState("");
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [isPlaying, setIsPlaying] = useState(false);
    const [streak, setStreak] = useState(0);
    const [bestScore, setBestScore] = useState<number>(0);

    useEffect(() => {
        const saved = localStorage.getItem("word_blitz_best");
        if (saved) setBestScore(parseInt(saved));
    }, []);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isPlaying && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(t => t - 1);
            }, 1000);
        } else if (timeLeft === 0 && isPlaying) {
            endGame();
        }
        return () => clearInterval(timer);
    }, [isPlaying, timeLeft]);

    const scrambleWord = (word: string) => {
        const arr = word.split('');
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr.join('');
    };

    const getNewWord = () => {
        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        setCurrentWord(word);
        setScrambled(scrambleWord(word));
        setUserInput("");
    };

    const startGame = () => {
        playSound('click');
        setScore(0);
        setStreak(0);
        setTimeLeft(60);
        setIsPlaying(true);
        getNewWord();
    };

    const endGame = () => {
        setIsPlaying(false);
        playSound('win');

        if (score > bestScore) {
            setBestScore(score);
            localStorage.setItem("word_blitz_best", score.toString());
            toast.success("New High Score!", { icon: "🏆" });
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 }
            });
        } else {
            toast.success(`Game Over! Score: ${score}`, { icon: "🎯" });
        }

        // Reward logic: Any completed game with a score > 0
        if (score > 0) {
            triggerWinReward();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (userInput.toUpperCase() === currentWord) {
            playSound('win');
            const points = 10 + (streak * 2);
            setScore(s => s + points);
            setStreak(s => s + 1);
            toast.success(`+${points} points! Streak: ${streak + 1}`, { icon: "🔥" });
            getNewWord();
        } else {
            playSound('lose');
            setStreak(0);
            toast.error("Wrong! Streak reset.", { icon: "❌" });
        }
    };

    const skipWord = () => {
        playSound('click');
        setStreak(0);
        toast.info("Word skipped. Streak reset.");
        getNewWord();
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center py-6 px-4">
            <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/games")}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <HowToPlay
                        title="Word Blitz"
                        description="Unscramble tech words as fast as you can!"
                        rules={[
                            "You have 60 seconds to unscramble as many words as possible.",
                            "Each correct word earns points.",
                            "Build a streak for bonus points!",
                            "Skip words if stuck (resets streak)."
                        ]}
                    />
                </div>

                <h1 className="text-3xl font-black bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent hidden md:block">Word Blitz</h1>

                <Button variant="outline" size="icon" onClick={startGame} disabled={isPlaying}>
                    <RotateCcw className="w-5 h-5" />
                </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-4 mb-8 w-full max-w-md">
                <Card className="flex-1 p-3 text-center bg-white/50 backdrop-blur">
                    <div className="text-xs text-muted-foreground mb-1">SCORE</div>
                    <div className="text-2xl font-black text-blue-600">{score}</div>
                </Card>
                <Card className="flex-1 p-3 text-center bg-white/50 backdrop-blur">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                        <Timer className="w-3 h-3" /> TIME
                    </div>
                    <div className={`text-2xl font-black ${timeLeft < 10 ? 'text-red-600 animate-pulse' : 'text-slate-700 dark:text-slate-200'}`}>{timeLeft}s</div>
                </Card>
                <Card className="flex-1 p-3 text-center bg-white/50 backdrop-blur">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                        <Zap className="w-3 h-3" /> STREAK
                    </div>
                    <div className="text-2xl font-black text-orange-600">{streak}</div>
                </Card>
                <Card className="flex-1 p-3 text-center bg-white/50 backdrop-blur">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                        <Trophy className="w-3 h-3" /> BEST
                    </div>
                    <div className="text-2xl font-black text-yellow-600">{bestScore}</div>
                </Card>
            </div>

            {/* Game Area */}
            <div className="w-full max-w-lg">
                <AnimatePresence mode="wait">
                    {!isPlaying ? (
                        <motion.div
                            key="start"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="text-center"
                        >
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold mb-2">Ready to test your word skills?</h2>
                                <p className="text-muted-foreground">Unscramble tech words before time runs out!</p>
                            </div>
                            <Button size="lg" onClick={startGame} className="px-12 py-6 text-xl font-bold">
                                Start Game
                            </Button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="playing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6"
                        >
                            {/* Scrambled Word */}
                            <Card className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2">
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground mb-2">UNSCRAMBLE THIS WORD:</p>
                                    <motion.p
                                        key={scrambled}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="text-5xl font-black tracking-widest text-blue-600 dark:text-blue-400"
                                    >
                                        {scrambled}
                                    </motion.p>
                                    <p className="text-xs text-muted-foreground mt-4">{currentWord.length} letters</p>
                                </div>
                            </Card>

                            {/* Input Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    placeholder="Type your answer..."
                                    className="text-2xl text-center h-16 font-bold uppercase"
                                    autoFocus
                                    disabled={!isPlaying}
                                />
                                <div className="flex gap-2">
                                    <Button type="submit" className="flex-1 h-12 text-lg font-bold" disabled={!userInput}>
                                        ✓ Submit
                                    </Button>
                                    <Button type="button" variant="outline" onClick={skipWord} className="h-12 px-6">
                                        Skip
                                    </Button>
                                </div>
                            </form>

                            {/* Progress Bar */}
                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                                    initial={{ width: "100%" }}
                                    animate={{ width: `${(timeLeft / 60) * 100}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
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

export default WordBlitz;
