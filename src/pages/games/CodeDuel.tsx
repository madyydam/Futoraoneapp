import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Timer, Keyboard, Trophy, RotateCcw, Zap, Code2, Layers } from 'lucide-react';
import { toast } from "sonner";
import { CODE_DUEL_SNIPPETS, Language } from "@/data/codeDuelSnippets";
import { useGameReward } from "@/hooks/useGameReward";
import { WinCelebration } from "@/components/games/WinCelebration";

const LANGUAGES: Language[] = ['HTML', 'CSS', 'JavaScript', 'Python', 'C', 'C++'];

export default function CodeDuel() {
    const navigate = useNavigate();
    const {
        triggerWinReward,
        showRewardModal,
        setShowRewardModal,
        COIN_REWARD,
        XP_REWARD
    } = useGameReward();
    const [gameState, setGameState] = useState<'start' | 'playing' | 'finished'>('start');

    // Game Config
    const [selectedLanguage, setSelectedLanguage] = useState<Language>('JavaScript');
    const [selectedDifficulty, setSelectedDifficulty] = useState<number>(1);

    const [currentSnippet, setCurrentSnippet] = useState(CODE_DUEL_SNIPPETS[0]);
    const [input, setInput] = useState('');
    const [startTime, setStartTime] = useState<number | null>(null);
    const [wpm, setWpm] = useState(0);
    const [accuracy, setAccuracy] = useState(100);
    const [timeLeft, setTimeLeft] = useState(60);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const targetCode = currentSnippet.code;

    // Timer Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (gameState === 'playing' && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        finishGame();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameState, timeLeft]);

    // WPM Calculation
    useEffect(() => {
        if (gameState === 'playing' && startTime) {
            const timeElapsed = (Date.now() - startTime) / 1000 / 60; // in minutes
            const wordsTyped = input.length / 5; // Standard: 5 chars = 1 word
            if (timeElapsed > 0) {
                setWpm(Math.round(wordsTyped / timeElapsed));
            }
        }
    }, [input, startTime, gameState]);

    const startGame = () => {
        const snippet = CODE_DUEL_SNIPPETS.find(
            s => s.language === selectedLanguage && s.level === selectedDifficulty
        );

        if (!snippet) {
            toast.error("Snippet not found for this configuration!");
            return;
        }

        setCurrentSnippet(snippet);
        setGameState('playing');
        setInput('');
        setStartTime(Date.now());
        setTimeLeft(60 + (selectedDifficulty * 5)); // More time for harder levels
        setWpm(0);
        setAccuracy(100);
        // Focus textarea after a brief delay ensuring render
        setTimeout(() => textareaRef.current?.focus(), 100);
    };

    const finishGame = () => {
        setGameState('finished');
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);

        // Accuracy Check
        let errors = 0;
        for (let i = 0; i < val.length; i++) {
            if (val[i] !== targetCode[i]) {
                errors++;
            }
        }
        // Fix accuracy calc for 0 length or full errors
        const rawAcc = Math.max(0, Math.round(((val.length - errors) / val.length) * 100));
        const acc = isNaN(rawAcc) ? 100 : rawAcc;
        setAccuracy(acc);

        // Auto-finish if complete match
        if (val === targetCode) {
            finishGame();
            toast.success("Perfect Run! 🏆", {
                description: `You completed Level ${selectedDifficulty} ${selectedLanguage} with ${wpm} WPM!`
            });
            triggerWinReward();
        }
    };

    // Render character with highlighting
    const renderCode = () => {
        return targetCode.split('').map((char, index) => {
            let color = "text-gray-500";
            let bg = "bg-transparent";

            if (index < input.length) {
                if (input[index] === char) {
                    color = "text-green-400";
                } else {
                    color = "text-red-500";
                    bg = "bg-red-500/20";
                }
            } else if (index === input.length) {
                bg = "bg-primary/50 animate-pulse"; // Cursor
            }

            return (
                <span key={index} className={`${color} ${bg} font-mono transition-colors`}>{char}</span>
            );
        });
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col pb-20 font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-md border-b border-white/10 px-4 py-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/games')}
                        className="text-white hover:bg-white/10 rounded-full"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                        <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        Code Duel
                    </h1>
                    <div className="w-10 h-10" />
                </div>
            </header>

            <main className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
                {gameState === 'start' && (
                    <div className="text-center space-y-8 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-yellow-500 blur-2xl opacity-20 animate-pulse" />
                            <Keyboard className="w-20 h-20 text-yellow-500 relative z-10 mx-auto mb-2" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-3xl font-black">Configure Your Duel</h2>
                            <p className="text-gray-400 max-w-sm mx-auto text-sm">
                                Select your weapon of choice and challenge level.
                            </p>
                        </div>

                        {/* Configuration Card */}
                        <Card className="bg-[#1e1e1e] border-white/10 p-6 space-y-8 max-w-md mx-auto">

                            {/* Language Selector */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-yellow-400 font-bold uppercase tracking-wider text-xs">
                                    <Code2 className="w-4 h-4" /> Language
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {LANGUAGES.map((lang) => (
                                        <button
                                            key={lang}
                                            onClick={() => setSelectedLanguage(lang)}
                                            className={`px-3 py-2 rounded-lg text-sm font-bold transition-all border ${selectedLanguage === lang
                                                ? 'bg-yellow-500 text-black border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                                                : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                                                }`}
                                        >
                                            {lang}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Difficulty Selector */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-yellow-400 font-bold uppercase tracking-wider text-xs">
                                    <div className="flex items-center gap-2"><Layers className="w-4 h-4" /> Difficulty</div>
                                    <span className="text-white text-lg">Level {selectedDifficulty}</span>
                                </div>
                                <Slider
                                    defaultValue={[1]}
                                    max={10}
                                    min={1}
                                    step={1}
                                    value={[selectedDifficulty]}
                                    onValueChange={(vals) => setSelectedDifficulty(vals[0])}
                                    className="py-4"
                                />
                                <div className="flex justify-between text-xs text-gray-500 font-mono">
                                    <span>Novice</span>
                                    <span>Master</span>
                                </div>
                            </div>

                        </Card>

                        <Button
                            size="lg"
                            onClick={startGame}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-lg px-12 py-6 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:shadow-[0_0_40px_rgba(234,179,8,0.6)] transition-all w-full max-w-md mx-auto"
                        >
                            Start Round
                        </Button>
                    </div>
                )}

                {gameState === 'playing' && (
                    <div className="space-y-6">
                        {/* Stats Bar */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <Card className="bg-white/5 border-white/10 p-4 text-center">
                                <Timer className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                                <div className="text-2xl font-bold">{timeLeft}s</div>
                                <div className="text-xs text-gray-400">Time Left</div>
                            </Card>
                            <Card className="bg-white/5 border-white/10 p-4 text-center">
                                <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                                <div className="text-2xl font-bold">{wpm}</div>
                                <div className="text-xs text-gray-400">WPM</div>
                            </Card>
                            <Card className="bg-white/5 border-white/10 p-4 text-center">
                                <Trophy className="w-5 h-5 text-green-400 mx-auto mb-2" />
                                <div className="text-2xl font-bold">{accuracy}%</div>
                                <div className="text-xs text-gray-400">Accuracy</div>
                            </Card>
                        </div>

                        <div className="flex justify-between items-center px-2">
                            <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">{currentSnippet.language}</span>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Level {currentSnippet.level}</span>
                        </div>

                        {/* Code Display */}
                        <Card className="bg-[#1e1e1e] border-white/10 p-6 font-mono text-sm sm:text-base leading-relaxed overflow-x-auto relative min-h-[150px]">
                            <pre className="whitespace-pre-wrap select-none pointer-events-none">
                                {renderCode()}
                            </pre>
                        </Card>

                        {/* Input Area */}
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={handleInput}
                            className="w-full h-32 bg-transparent text-transparent caret-transparent absolute top-0 left-0 opacity-0 cursor-default"
                            autoFocus
                            onBlur={() => setTimeout(() => textareaRef.current?.focus(), 10)}
                            spellCheck={false}
                        />

                        <p className="text-center text-sm text-gray-500 animate-pulse">
                            Keep typing...
                        </p>
                    </div>
                )}

                {gameState === 'finished' && (
                    <div className="text-center space-y-8 mt-12 animate-in fade-in zoom-in duration-500">
                        <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />

                        <div>
                            <h2 className="text-4xl font-black bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text text-transparent">
                                GAME OVER
                            </h2>
                            <p className="text-gray-400 mt-2">
                                {accuracy === 100 ? "Flawless Performance!" : "Great Effort!"}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="text-3xl font-bold text-white">{wpm}</div>
                                <div className="text-sm text-gray-500">WPM</div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="text-3xl font-bold text-white">{accuracy}%</div>
                                <div className="text-sm text-gray-500">Accuracy</div>
                            </div>
                        </div>

                        <div className="flex gap-4 justify-center pt-4">
                            <Button variant="outline" onClick={() => setGameState('start')}>
                                New Setup
                            </Button>
                            <Button onClick={startGame} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                                <RotateCcw className="w-4 h-4 mr-2" /> Retry Level
                            </Button>
                        </div>
                    </div>
                )}
            </main>

            {/* Win Celebration Modal */}
            <WinCelebration
                isOpen={showRewardModal}
                onClose={() => setShowRewardModal(false)}
                coins={COIN_REWARD}
                xp={XP_REWARD}
            />
            <BottomNav />
        </div>
    );
}
