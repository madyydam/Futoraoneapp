import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calculator, Trophy, Timer, RotateCcw, Zap } from "lucide-react";
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

const OPERATIONS = ['+', '-', '×', '÷'] as const;
type Operation = typeof OPERATIONS[number];

interface Problem {
    num1: number;
    num2: number;
    operation: Operation;
    answer: number;
}

const SpeedMath = () => {
    const navigate = useNavigate();
    const playSound = useGameSounds();
    const {
        triggerWinReward,
        showRewardModal,
        setShowRewardModal,
        COIN_REWARD,
        XP_REWARD
    } = useGameReward();
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
    const [problem, setProblem] = useState<Problem | null>(null);
    const [userAnswer, setUserAnswer] = useState("");
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);
    const [isPlaying, setIsPlaying] = useState(false);
    const [bestScores, setBestScores] = useState({ easy: 0, medium: 0, hard: 0 });

    useEffect(() => {
        const saved = localStorage.getItem("speed_math_best");
        if (saved) setBestScores(JSON.parse(saved));
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

    const generateProblem = (): Problem => {
        let num1: number, num2: number, operation: Operation, answer: number;

        const maxNum = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 50 : 100;

        operation = OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)];

        switch (operation) {
            case '+':
                num1 = Math.floor(Math.random() * maxNum) + 1;
                num2 = Math.floor(Math.random() * maxNum) + 1;
                answer = num1 + num2;
                break;
            case '-':
                num1 = Math.floor(Math.random() * maxNum) + 10;
                num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
                answer = num1 - num2;
                break;
            case '×':
                num1 = Math.floor(Math.random() * (difficulty === 'easy' ? 10 : difficulty === 'medium' ? 15 : 20)) + 2;
                num2 = Math.floor(Math.random() * (difficulty === 'easy' ? 10 : difficulty === 'medium' ? 12 : 15)) + 2;
                answer = num1 * num2;
                break;
            case '÷':
                num2 = Math.floor(Math.random() * (difficulty === 'easy' ? 9 : difficulty === 'medium' ? 12 : 15)) + 2;
                answer = Math.floor(Math.random() * (difficulty === 'easy' ? 10 : difficulty === 'medium' ? 15 : 20)) + 1;
                num1 = num2 * answer;
                break;
        }

        return { num1, num2, operation, answer };
    };

    const startGame = () => {
        playSound('click');
        setScore(0);
        setStreak(0);
        setTimeLeft(30);
        setIsPlaying(true);
        setProblem(generateProblem());
        setUserAnswer("");
    };

    const endGame = () => {
        setIsPlaying(false);
        playSound('win');

        if (score > bestScores[difficulty]) {
            const newBestScores = { ...bestScores, [difficulty]: score };
            setBestScores(newBestScores);
            localStorage.setItem("speed_math_best", JSON.stringify(newBestScores));
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

        if (!problem || !userAnswer) return;

        const userNum = parseInt(userAnswer);

        if (userNum === problem.answer) {
            playSound('win');
            const points = 10 + (streak * 2) + (difficulty === 'medium' ? 5 : difficulty === 'hard' ? 10 : 0);
            setScore(s => s + points);
            setStreak(s => s + 1);

            if (streak > 0 && streak % 5 === 4) {
                confetti({
                    particleCount: 50,
                    spread: 60,
                    origin: { y: 0.7 }
                });
            }

            toast.success(`+${points} points! 🔥 Streak: ${streak + 1}`, { duration: 1000 });
        } else {
            playSound('lose');
            setStreak(0);
            toast.error(`Wrong! Answer was ${problem.answer}`, { icon: "❌", duration: 1500 });
        }

        setProblem(generateProblem());
        setUserAnswer("");
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center py-6 px-4">
            <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/games")}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <HowToPlay
                        title="Speed Math"
                        description="Solve as many math problems as you can in 30 seconds!"
                        rules={[
                            "Choose your difficulty level.",
                            "Solve problems as fast as possible.",
                            "Build a streak for bonus points!",
                            "Race against the clock!"
                        ]}
                    />
                </div>

                <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent hidden md:block">Speed Math</h1>

                <Button variant="outline" size="icon" onClick={startGame} disabled={isPlaying}>
                    <RotateCcw className="w-5 h-5" />
                </Button>
            </div>

            {/* Difficulty Selection */}
            {!isPlaying && (
                <div className="flex gap-2 mb-8">
                    {(['easy', 'medium', 'hard'] as const).map((level) => (
                        <Button
                            key={level}
                            variant={difficulty === level ? "default" : "outline"}
                            onClick={() => setDifficulty(level)}
                            className="capitalize"
                        >
                            {level}
                        </Button>
                    ))}
                </div>
            )}

            {/* Stats */}
            <div className="flex gap-4 mb-8 w-full max-w-md">
                <Card className="flex-1 p-3 text-center bg-white/50 backdrop-blur">
                    <div className="text-xs text-muted-foreground mb-1">SCORE</div>
                    <div className="text-2xl font-black text-cyan-600">{score}</div>
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
                    <div className="text-2xl font-black text-yellow-600">{bestScores[difficulty]}</div>
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
                            <Calculator className="w-20 h-20 text-cyan-500 mx-auto mb-6" />
                            <h2 className="text-2xl font-bold mb-2">Ready to test your math skills?</h2>
                            <p className="text-muted-foreground mb-6">Solve as many problems as you can in 30 seconds!</p>
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
                            {/* Problem Display */}
                            {problem && (
                                <Card className="p-12 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 border-2">
                                    <motion.div
                                        key={`${problem.num1}-${problem.operation}-${problem.num2}`}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="text-center"
                                    >
                                        <p className="text-6xl md:text-7xl font-black text-cyan-600 dark:text-cyan-400 mb-4">
                                            {problem.num1} {problem.operation} {problem.num2}
                                        </p>
                                        <p className="text-4xl font-black text-slate-700 dark:text-slate-200">= ?</p>
                                    </motion.div>
                                </Card>
                            )}

                            {/* Answer Input */}
                            <form onSubmit={handleSubmit}>
                                <Input
                                    type="number"
                                    value={userAnswer}
                                    onChange={(e) => setUserAnswer(e.target.value)}
                                    placeholder="Your answer"
                                    className="text-4xl text-center h-20 font-bold"
                                    autoFocus
                                    disabled={!isPlaying}
                                />
                            </form>

                            {/* Progress Bar */}
                            <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
                                    initial={{ width: "100%" }}
                                    animate={{ width: `${(timeLeft / 30) * 100}%` }}
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

export default SpeedMath;
