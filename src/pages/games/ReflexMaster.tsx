import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap, Trophy, Globe, Copy, Users, Cpu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { useGameSounds } from "@/hooks/useGameSounds";
import { HowToPlay } from "@/components/games/HowToPlay";
import { Card } from "@/components/ui/card";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { Input } from "@/components/ui/input";
import { useGameReward } from "@/hooks/useGameReward";
import { WinCelebration } from "@/components/games/WinCelebration";

type GameMode = "SOLO" | "ONLINE";
type GameState = "WAITING" | "READY" | "GO" | "RESULT";

const ReflexMaster = () => {
    const navigate = useNavigate();
    const playSound = useGameSounds();
    const {
        triggerWinReward,
        showRewardModal,
        setShowRewardModal,
        COIN_REWARD,
        XP_REWARD
    } = useGameReward();
    const [gameMode, setGameMode] = useState<GameMode>("SOLO");
    const [gameState, setGameState] = useState<GameState>("WAITING");
    const [reactionTime, setReactionTime] = useState<number | null>(null);
    const [bestTime, setBestTime] = useState<number | null>(null);
    const [round, setRound] = useState(1);
    const startTimeRef = useRef<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout>();

    // Online State
    const [roomId, setRoomId] = useState("");
    const [isHost, setIsHost] = useState(false);
    const [joinRoomId, setJoinRoomId] = useState("");
    const [scores, setScores] = useState({ 1: 0, 2: 0 });
    const [opponentReacted, setOpponentReacted] = useState(false);

    const { isConnected, playerCount, sendMove } = useMultiplayerGame({
        gameId: 'reflex',
        roomId,
        initialState: {
            gameState: 'WAITING',
            scores: { 1: 0, 2: 0 },
            round: 1
        },
        onStateUpdate: (newState) => {
            if (newState.gameState) setGameState(newState.gameState);
            if (newState.scores) setScores(newState.scores);
            if (newState.round) setRound(newState.round);
            if (newState.opponentReacted) setOpponentReacted(newState.opponentReacted);
            if (newState.startTime && gameState === 'READY') {
                startTimeRef.current = newState.startTime;
            }
        },
        onPlayerJoin: () => {
            toast.success("Opponent joined! Get ready...");
        }
    });

    useEffect(() => {
        const savedBest = localStorage.getItem("reflex_best_time");
        if (savedBest) setBestTime(parseInt(savedBest));
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const createRoom = () => {
        const newRoomId = Math.random().toString(36).substring(7).toUpperCase();
        setRoomId(newRoomId);
        setIsHost(true);
        setGameMode("ONLINE");
    };

    const joinRoom = () => {
        if (!joinRoomId) return;
        setRoomId(joinRoomId);
        setIsHost(false);
        setGameMode("ONLINE");
    };

    const startGame = () => {
        playSound('click');
        setGameState("READY");
        setReactionTime(null);
        setOpponentReacted(false);

        const delay = 2000 + Math.random() * 3000; // 2-5 seconds

        if (gameMode === 'ONLINE') {
            if (!isHost) {
                toast.error("Only host can start!");
                return;
            }
            const startTime = Date.now() + delay;
            sendMove({ gameState: 'READY', startTime, opponentReacted: false });

            timeoutRef.current = setTimeout(() => {
                setGameState("GO");
                startTimeRef.current = Date.now();
                sendMove({ gameState: 'GO', startTime: Date.now() });
            }, delay);
        } else {
            timeoutRef.current = setTimeout(() => {
                setGameState("GO");
                startTimeRef.current = Date.now();
                playSound('pop');
            }, delay);
        }
    };

    const handleClick = () => {
        if (gameState === "READY") {
            // Too early!
            playSound('lose');
            toast.error("Too Early! You lose this round.", { icon: "❌" });
            setGameState("RESULT");
            setReactionTime(-1);
            return;
        }

        if (gameState === "GO") {
            const reaction = Date.now() - startTimeRef.current;
            setReactionTime(reaction);
            playSound('win');

            if (gameMode === 'SOLO') {
                if (!bestTime || reaction < bestTime) {
                    setBestTime(reaction);
                    localStorage.setItem("reflex_best_time", reaction.toString());
                    toast.success("New Record!", { icon: "🏆" });
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                } else {
                    toast.success(`Reaction: ${reaction}ms`, { icon: "⚡" });
                }
                triggerWinReward();
                setGameState("RESULT");
            } else {
                // Online: notify opponent
                const amIPlayer1 = isHost;
                const newScores = { ...scores };

                if (opponentReacted) {
                    // Both have reacted, determine winner
                    // This won't work perfectly due to network delay, simplified for now
                    // Ideally you'd send your time to server and compare there
                    setGameState("RESULT");
                } else {
                    setOpponentReacted(true);
                    sendMove({ opponentReacted: true, myTime: reaction, player: amIPlayer1 ? 1 : 2 });
                    toast.info("Waiting for opponent...");
                }
            }
        }
    };

    const nextRound = () => {
        if (gameMode === 'ONLINE' && !isHost) {
            toast.error("Only host can start next round!");
            return;
        }
        setRound(r => r + 1);
        startGame();
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center py-6 px-4">
            <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/games")}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <HowToPlay
                        title="Reflex Master"
                        description="Test your reaction speed! Click when the screen turns green."
                        rules={[
                            "Wait for the screen to turn RED.",
                            "When it turns GREEN, click as fast as you can!",
                            "Clicking too early = instant loss.",
                            "Faster reaction time = higher score!"
                        ]}
                    />
                </div>

                <div className="flex flex-col items-center">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">Reflex Master</h1>
                    {gameMode === 'ONLINE' && roomId && (
                        <div className="flex items-center gap-2 text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            <Globe className="w-3 h-3" /> ONLINE #{roomId}
                        </div>
                    )}
                </div>

                <Button variant="outline" size="sm" onClick={() => setGameMode(prev => prev === 'SOLO' ? 'ONLINE' : 'SOLO')}>
                    {gameMode === 'SOLO' ? <><Globe className="w-4 h-4 mr-2" /> Play Online</> : <><Cpu className="w-4 h-4 mr-2" /> Solo Mode</>}
                </Button>
            </div>

            {/* Online Lobby */}
            {gameMode === "ONLINE" && !isConnected && (
                <Card className="p-6 mb-8 w-full max-w-md bg-white/50 backdrop-blur">
                    <h3 className="text-lg font-bold mb-4">Online Lobby</h3>
                    <div className="flex flex-col gap-4">
                        {!roomId ? (
                            <div className="flex gap-2">
                                <Button onClick={createRoom} className="flex-1">Create Room</Button>
                                <div className="flex-1 flex gap-2">
                                    <Input placeholder="Room ID" value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)} />
                                    <Button onClick={joinRoom} variant="secondary">Join</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground mb-2">Share Room ID</p>
                                <div className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl mb-4">
                                    <code className="text-xl font-mono font-bold">{roomId}</code>
                                    <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(roomId); toast.success("Copied!"); }}>
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-sm">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                                    Waiting for opponent...
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Stats */}
            {gameMode === 'SOLO' && (
                <div className="flex gap-4 mb-8">
                    <Card className="p-4 bg-white/50 backdrop-blur">
                        <div className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">BEST TIME</div>
                            <div className="text-2xl font-black text-green-600">{bestTime ? `${bestTime}ms` : '-'}</div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-white/50 backdrop-blur">
                        <div className="text-center">
                            <div className="text-xs text-muted-foreground mb-1">ROUND</div>
                            <div className="text-2xl font-black">{round}</div>
                        </div>
                    </Card>
                </div>
            )}

            {gameMode === 'ONLINE' && isConnected && (
                <div className="flex gap-4 mb-8">
                    <Card className="p-4 bg-blue-50 border-blue-200">
                        <div className="text-center">
                            <div className="text-xs text-blue-600 font-bold mb-1">{isHost ? 'YOU' : 'OPPONENT'}</div>
                            <div className="text-2xl font-black">{scores[1]}</div>
                        </div>
                    </Card>
                    <Card className="p-4 bg-pink-50 border-pink-200">
                        <div className="text-center">
                            <div className="text-xs text-pink-600 font-bold mb-1">{!isHost ? 'YOU' : 'OPPONENT'}</div>
                            <div className="text-2xl font-black">{scores[2]}</div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Game Area */}
            <AnimatePresence mode="wait">
                {gameState === "WAITING" && (
                    <motion.div
                        key="waiting"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex flex-col items-center"
                    >
                        <Button size="lg" onClick={startGame} className="px-12 py-6 text-xl font-bold rounded-2xl">
                            <Zap className="w-6 h-6 mr-2" />
                            Start Game
                        </Button>
                    </motion.div>
                )}

                {gameState === "READY" && (
                    <motion.div
                        key="ready"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={handleClick}
                        className="w-full max-w-2xl h-96 bg-red-500 rounded-3xl shadow-2xl flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                    >
                        <p className="text-white text-4xl font-black">WAIT...</p>
                    </motion.div>
                )}

                {gameState === "GO" && (
                    <motion.div
                        key="go"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={handleClick}
                        className="w-full max-w-2xl h-96 bg-green-500 rounded-3xl shadow-2xl flex items-center justify-center cursor-pointer animate-pulse"
                    >
                        <p className="text-white text-6xl font-black">CLICK NOW!</p>
                    </motion.div>
                )}

                {gameState === "RESULT" && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-6"
                    >
                        {reactionTime && reactionTime > 0 ? (
                            <>
                                <div className="text-center">
                                    <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                                    <p className="text-xl text-muted-foreground mb-2">Your Reaction Time</p>
                                    <p className="text-6xl font-black text-green-600">{reactionTime}ms</p>
                                </div>
                                <Button size="lg" onClick={nextRound} className="px-8">
                                    Next Round
                                </Button>
                            </>
                        ) : (
                            <>
                                <p className="text-4xl font-black text-red-600">TOO EARLY!</p>
                                <Button size="lg" onClick={() => setGameState("WAITING")}>
                                    Try Again
                                </Button>
                            </>
                        )}
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

export default ReflexMaster;
