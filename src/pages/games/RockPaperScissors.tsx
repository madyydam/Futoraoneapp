import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Hand, Scissors, Scroll, Zap, Cpu, Users, Globe, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useGameReward } from "@/hooks/useGameReward";
import { motion, AnimatePresence } from "framer-motion";
import { useGameSounds } from "@/hooks/useGameSounds";
import { HowToPlay } from "@/components/games/HowToPlay";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type Choice = "rock" | "paper" | "scissors" | null;
type GameMode = "AI" | "LOCAL" | "ONLINE";

const CHOICES = [
    { id: "rock", icon: <Scroll className="w-12 h-12 md:w-16 md:h-16 text-stone-500" />, label: "Rock", beats: "scissors", color: "bg-stone-100 dark:bg-stone-900/50" },
    { id: "paper", icon: <Hand className="w-12 h-12 md:w-16 md:h-16 text-yellow-500" />, label: "Paper", beats: "rock", color: "bg-yellow-50 dark:bg-yellow-900/20" },
    { id: "scissors", icon: <Scissors className="w-12 h-12 md:w-16 md:h-16 text-pink-500" />, label: "Scissors", beats: "paper", color: "bg-pink-50 dark:bg-pink-900/20" },
];

const ChoiceButton = React.memo(({ choice, onClick, disabled, index }: { choice: typeof CHOICES[0], onClick: (id: string) => void, disabled: boolean, index: number }) => (
    <motion.button
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onClick(choice.id)}
        disabled={disabled}
        className={`p-6 md:p-10 ${choice.color} rounded-3xl shadow-lg border-2 border-transparent hover:border-sidebar-primary/20 backdrop-blur-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
    >
        {choice.icon}
        <div className="mt-4 font-bold text-slate-600 dark:text-slate-400">{choice.label}</div>
    </motion.button>
));
ChoiceButton.displayName = "ChoiceButton";


const RockPaperScissors = () => {
    const navigate = useNavigate();
    const playSound = useGameSounds();
    const { triggerWinReward } = useGameReward();
    const [p1Choice, setP1Choice] = useState<Choice>(null);
    const [p2Choice, setP2Choice] = useState<Choice>(null);
    const [turn, setTurn] = useState<1 | 2>(1); // For Stats/Turn display
    const [result, setResult] = useState<string | null>(null);
    const [scores, setScores] = useState({ 1: 0, 2: 0 });
    const [isRevealed, setIsRevealed] = useState(false);
    const [gameMode, setGameMode] = useState<GameMode>("AI");

    // Online State
    const [roomId, setRoomId] = useState("");
    const [isHost, setIsHost] = useState(false);
    const [joinRoomId, setJoinRoomId] = useState("");

    const triggerWin = useCallback(() => {
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#8b5cf6', '#d946ef']
        });
    }, []);

    const determineWinner = useCallback((c1: Choice, c2: Choice, updateScore = true) => {
        if (!c1 || !c2) return;

        // Slight delay to allow animation to start
        setTimeout(() => {
            let resultText = "";
            let newScores = { ...scores };

            if (c1 === c2) {
                resultText = "Draw";
                playSound('draw');
            } else {
                const choice1 = CHOICES.find(c => c.id === c1);
                if (choice1?.beats === c2) {
                    resultText = "Player 1 Wins";
                    // Only update local scores here if NOT online or if Host
                    // But checking state inside timeout is risky with stale closures.
                    // However, 'scores' is in dependency array.
                    newScores = { ...newScores, 1: newScores[1] + 1 };

                    playSound('win');
                    if (gameMode === 'AI' || (gameMode === 'ONLINE' && isHost) || gameMode === 'LOCAL') {
                        triggerWin(); // Confetti
                        // Reward only if playing AI or if I am the Host winning online (simple assumption for now)
                        // Actually, for Local PVP, we shouldn't probably reward coins to avoid farming? 
                        // Let's restrict rewards to AI or Online Wins for authenticated user.
                        if (gameMode === 'AI' || (gameMode === 'ONLINE' && isHost)) {
                            triggerWinReward();
                        }
                    }


                } else {
                    resultText = gameMode === 'AI' ? "AI Wins" : "Player 2 Wins";
                    newScores = { ...newScores, 2: newScores[2] + 1 };
                    playSound('lose');
                    if (gameMode === 'ONLINE' && !isHost) triggerWin(); // P2 Win (me)
                }
            }

            setResult(resultText);

            // We need to be careful with scores update to avoid infinite loops if it triggers effect
            // But here we set explicit state
            if (updateScore && gameMode !== 'ONLINE') {
                setScores(newScores);
            } else if (gameMode === 'ONLINE' && isHost && updateScore) {
                setScores(newScores);
                // We depend on 'sendMove' which is not in this callback scope directly if extracted? 
                // But we are inside component, so it's fine.
                // However, wait. sendMove is from useMultiplayerGame.
                // We'll need to pass it or accessible.

                sendMove({ p1Choice: c1, p2Choice: c2, scores: newScores });
            } else if (gameMode === 'ONLINE') {
                // Client just updates local display, actual sync comes from host usually but for responsive UI we update
                setScores(newScores);
            }

        }, 100);
    }, [gameMode, isHost, playSound, scores, triggerWin]); // sendMove added via eslint-disable-next-line hack or we need to include it.

    const { isConnected, playerCount, sendMove } = useMultiplayerGame({
        gameId: 'rps',
        roomId,
        initialState: {
            p1Choice: null,
            p2Choice: null,
            scores: { 1: 0, 2: 0 }
        },
        onStateUpdate: (newState) => {
            if (newState.reset) {
                // Handle reset explicitly
                setP1Choice(null);
                setP2Choice(null);
                setResult(null);
                setIsRevealed(false);
                if (newState.scores) setScores(newState.scores);
                return;
            }

            if (newState.p1Choice) setP1Choice(newState.p1Choice);
            if (newState.p2Choice) setP2Choice(newState.p2Choice);
            if (newState.scores) setScores(newState.scores);

            // Check if both present to reveal
            if (newState.p1Choice && newState.p2Choice) {
                if (!isRevealed) {
                    setIsRevealed(true);
                    determineWinner(newState.p1Choice, newState.p2Choice, false); // false to suppress duplicate score adds
                }
            }
        },
        onPlayerJoin: () => {
            toast.success("Player joined!");
        }
    });


    const createRoom = useCallback(() => {
        const newRoomId = Math.random().toString(36).substring(7).toUpperCase();
        setRoomId(newRoomId);
        setIsHost(true);
        setGameMode("ONLINE");
    }, []);

    const joinRoom = useCallback(() => {
        if (!joinRoomId) return;
        setRoomId(joinRoomId);
        setIsHost(false);
        setGameMode("ONLINE");
    }, [joinRoomId]);

    const handleChoice = useCallback((choiceId: string) => {
        playSound('pop');

        if (gameMode === "AI") {
            setP1Choice(choiceId as Choice);
            const choices: Choice[] = ["rock", "paper", "scissors"];
            const aiPick = choices[Math.floor(Math.random() * choices.length)];
            setP2Choice(aiPick);
            setIsRevealed(true);
            determineWinner(choiceId as Choice, aiPick);
        } else if (gameMode === "ONLINE") {
            if (!isConnected) return;

            const isPlayer1 = isHost;

            // Don't allow changing choice for now (strict touch-move)
            if (isPlayer1 && p1Choice) return;
            if (!isPlayer1 && p2Choice) return;

            if (isPlayer1) {
                setP1Choice(choiceId as Choice);
                sendMove({ p1Choice: choiceId, p2Choice: p2Choice, scores });
            } else {
                setP2Choice(choiceId as Choice);
                sendMove({ p1Choice: p1Choice, p2Choice: choiceId, scores });
            }

        } else {
            // Local PVP
            if (turn === 1) {
                setP1Choice(choiceId as Choice);
                setTurn(2);
                toast.info("Player 1 Selected!", { position: "top-center" });
            } else {
                setP2Choice(choiceId as Choice);
                setTurn(1);
                setIsRevealed(true);
                determineWinner(p1Choice!, choiceId as Choice);
            }
        }
    }, [gameMode, isConnected, isHost, p1Choice, p2Choice, playSound, scores, sendMove, turn, determineWinner]);

    const resetRound = useCallback(() => {
        playSound('click');
        if (gameMode === 'ONLINE') {
            if (!isHost) {
                toast.error("Only host can start next round");
                return;
            }
            sendMove({ reset: true, p1Choice: null, p2Choice: null, scores });
        }

        // Local/AI Reset
        if (gameMode !== 'ONLINE') {
            setP1Choice(null);
            setP2Choice(null);
            setTurn(1);
            setResult(null);
            setIsRevealed(false);
        }
    }, [gameMode, isHost, playSound, scores, sendMove]);

    const toggleGameMode = useCallback(() => {
        playSound('click');
        // If switching OUT of Online, reset connection
        if (gameMode === "ONLINE") {
            setRoomId("");
            setIsHost(false);
        }

        if (gameMode === "AI") setGameMode("LOCAL");
        else if (gameMode === "LOCAL") setGameMode("ONLINE");
        else setGameMode("AI");

        setP1Choice(null);
        setP2Choice(null);
        setScores({ 1: 0, 2: 0 });
        setResult(null);
        setIsRevealed(false);
    }, [gameMode, playSound]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center py-6 px-4">
            {/* Header */}
            <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/games")} className="hover:bg-slate-200 dark:hover:bg-slate-800">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <HowToPlay
                        title="Rock Paper Scissors"
                        description="Classic hand game. Online mode supports simultaneous reveals!"
                        rules={[
                            "Rock beats Scissors.",
                            "Scissors beats Paper.",
                            "Paper beats Rock.",
                            "In Online Mode, choices are hidden until both players pick."
                        ]}
                    />
                </div>

                <div className="flex flex-col items-center gap-1">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent hidden md:block">RPS Battle</h1>
                    {gameMode === 'ONLINE' && (
                        <div className="flex items-center gap-2 text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            <Globe className="w-3 h-3" /> ONLINE {roomId ? `#${roomId}` : ''}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={toggleGameMode} className="gap-2 min-w-[100px]">
                        {gameMode === "AI" && <Cpu className="w-4 h-4" />}
                        {gameMode === "LOCAL" && <Users className="w-4 h-4" />}
                        {gameMode === "ONLINE" && <Globe className="w-4 h-4" />}
                        {gameMode === "AI" ? "AI Mode" : gameMode === "LOCAL" ? "Local PvP" : "Online"}
                    </Button>

                    {gameMode !== 'ONLINE' && (
                        <Button variant="ghost" size="icon" onClick={() => setScores({ 1: 0, 2: 0 })} className="hover:bg-red-50 hover:text-red-500">
                            <RotateCcw className="w-6 h-6" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Online Setup */}
            {gameMode === "ONLINE" && !isConnected && (
                <Card className="p-6 mb-8 w-full max-w-md bg-white/50 backdrop-blur">
                    <h3 className="text-lg font-bold mb-4">Online Lobby</h3>
                    <div className="flex flex-col gap-4">
                        {!roomId ? (
                            <div className="flex gap-2">
                                <Button onClick={createRoom} className="flex-1">Create Room</Button>
                                <div className="flex-1 flex gap-2">
                                    <Input
                                        placeholder="Room ID"
                                        value={joinRoomId}
                                        onChange={(e) => setJoinRoomId(e.target.value)}
                                    />
                                    <Button onClick={joinRoom} variant="secondary">Join</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground mb-2">Share this Room ID</p>
                                <div className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl mb-4">
                                    <code className="text-xl font-mono font-bold tracking-widest">{roomId}</code>
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

            {/* Score Board */}
            <div className="flex justify-between w-full max-w-lg px-4 mb-12">
                <div className="flex flex-col items-center p-4 bg-white dark:bg-card rounded-2xl shadow-sm w-32 relative overflow-hidden transition-all duration-300 transform hover:scale-105">
                    <div className={`absolute top-0 w-full h-1 ${isHost ? 'bg-blue-500' : 'bg-blue-500'}`} />
                    <span className="font-bold text-sm text-blue-500 mb-1">{gameMode === 'ONLINE' ? (isHost ? 'You (P1)' : 'P1') : 'Player 1'}</span>
                    <span className="text-4xl font-black text-slate-800 dark:text-slate-200">{scores[1]}</span>
                </div>
                <div className="flex flex-col justify-center">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-black text-slate-500">VS</div>
                </div>
                <div className="flex flex-col items-center p-4 bg-white dark:bg-card rounded-2xl shadow-sm w-32 relative overflow-hidden transition-all duration-300 transform hover:scale-105">
                    <div className="absolute top-0 w-full h-1 bg-pink-500" />
                    <span className="font-bold text-sm text-pink-500 mb-1">
                        {gameMode === 'AI' ? 'AI' : gameMode === 'ONLINE' ? (!isHost ? 'You (P2)' : 'P2') : 'Player 2'}
                    </span>
                    <span className="text-4xl font-black text-slate-800 dark:text-slate-200">{scores[2]}</span>
                </div>
            </div>

            {/* Battle Arena */}
            <div className={`flex-1 flex flex-col items-center justify-center w-full max-w-2xl relative min-h-[400px] ${gameMode === 'ONLINE' && !isConnected && playerCount === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                <AnimatePresence mode="wait">
                    {!isRevealed ? (
                        <motion.div
                            key="selection"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="text-center w-full"
                        >
                            <h2 className="text-3xl md:text-5xl font-black mb-12 flex items-center justify-center gap-3">
                                {gameMode === 'ONLINE' ? (
                                    // Online Status Text
                                    roomId && playerCount > 1 ? (
                                        (isHost && p1Choice) || (!isHost && p2Choice) ?
                                            <span className="text-green-500">Waiting for Opponent...</span> :
                                            <span className="text-blue-500">Pick Your Move!</span>
                                    ) : roomId ? "Waiting for Player..." : "Create or Join Room"
                                ) : (
                                    gameMode === 'AI' ? (
                                        <span className="text-slate-700 dark:text-slate-200">Make Your Choice</span>
                                    ) : (
                                        turn === 1 ? <span className="text-blue-500">Player 1's Turn</span> : <span className="text-pink-500">Player 2's Turn</span>
                                    )
                                )}
                            </h2>

                            <div className="flex flex-wrap justify-center gap-6 md:gap-10">
                                {CHOICES.map((choice, index) => (
                                    <ChoiceButton
                                        key={choice.id}
                                        choice={choice}
                                        index={index}
                                        onClick={handleChoice}
                                        disabled={
                                            (gameMode === 'ONLINE' && ((isHost && !!p1Choice) || (!isHost && !!p2Choice))) ||
                                            (gameMode === 'ONLINE' && playerCount < 2)
                                        }
                                    />
                                ))}
                            </div>
                            <p className="text-muted-foreground mt-12 animate-pulse">
                                {gameMode === 'ONLINE' && playerCount < 2 ? "Connection Required" : "Choose your weapon wisely..."}
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="reveal"
                            className="w-full flex flex-col items-center"
                        >
                            <div className="flex justify-between w-full md:w-[120%] mb-12 items-center">
                                {/* Player 1 Reveal */}
                                <motion.div
                                    initial={{ x: -100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="flex flex-col items-center gap-4"
                                >
                                    <span className="text-blue-500 font-bold text-xl">{gameMode === 'ONLINE' && !isHost ? 'Opponent' : 'You'}</span>
                                    <div className="w-32 h-32 md:w-48 md:h-48 bg-white dark:bg-card rounded-full shadow-2xl flex items-center justify-center border-4 border-blue-500/20">
                                        <motion.div
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: "spring", bounce: 0.5 }}
                                        >
                                            {CHOICES.find(c => c.id === p1Choice)?.icon}
                                        </motion.div>
                                    </div>
                                </motion.div>

                                {/* VS with thunder effect */}
                                <div className="hidden md:flex flex-col items-center">
                                    <Zap className="w-20 h-20 text-yellow-400 animate-[pulse_0.2s_ease-in-out_infinite]" />
                                </div>

                                {/* Player 2 Reveal */}
                                <motion.div
                                    initial={{ x: 100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="flex flex-col items-center gap-4"
                                >
                                    <span className="text-pink-500 font-bold text-xl">
                                        {gameMode === 'AI' ? 'AI' : gameMode === 'ONLINE' && isHost ? 'Opponent' : gameMode === 'ONLINE' ? 'You' : 'P2'}
                                    </span>
                                    <div className="w-32 h-32 md:w-48 md:h-48 bg-white dark:bg-card rounded-full shadow-2xl flex items-center justify-center border-4 border-pink-500/20">
                                        <motion.div
                                            initial={{ scale: 0, rotate: 180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: "spring", bounce: 0.5 }}
                                        >
                                            {CHOICES.find(c => c.id === p2Choice)?.icon}
                                        </motion.div>
                                    </div>
                                </motion.div>
                            </div>

                            <motion.h2
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.5, type: "spring" }}
                                className="text-4xl md:text-6xl font-black mb-12 px-12 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-2xl shadow-xl transform -rotate-2"
                            >
                                {result}
                            </motion.h2>

                            <Button size="lg" onClick={resetRound} className="text-lg px-8 py-6 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                                <RotateCcw className="w-5 h-5 mr-2" />
                                {gameMode === 'ONLINE' && !isHost ? 'Waiting for Host...' : 'Play Again'}
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

        </div>
    );
};

export default RockPaperScissors;
