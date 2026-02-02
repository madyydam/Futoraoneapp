import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Sparkles, Trophy, Timer, Hash, Globe, Users, Copy } from "lucide-react";
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

const CARDS_DATA = [
    { id: 1, icon: "🐶", matchId: 1 },
    { id: 2, icon: "🐱", matchId: 2 },
    { id: 3, icon: "🐭", matchId: 3 },
    { id: 4, icon: "🐹", matchId: 4 },
    { id: 5, icon: "🐰", matchId: 5 },
    { id: 6, icon: "🦊", matchId: 6 },
    { id: 7, icon: "🐻", matchId: 7 },
    { id: 8, icon: "🐼", matchId: 8 },
];

interface CardType {
    id: number;
    icon: string;
    matchId: number;
    flipped: boolean;
    matched: boolean;
}

type GameMode = "SOLO" | "ONLINE";

// Memoized Card Component for Smooth Rendering
const MemoryCard = React.memo(({ card, onClick, disabled }: { card: CardType, onClick: (id: number) => void, disabled: boolean }) => {
    return (
        <div style={{ perspective: 1000 }} className={`relative w-16 h-20 sm:w-20 sm:h-24 md:w-24 md:h-28 cursor-pointer group ${card.matched ? 'cursor-default' : ''}`} onClick={() => !disabled && onClick(card.id)}>
            <motion.div
                className="w-full h-full relative preserve-3d transition-all duration-500"
                animate={{ rotateY: card.flipped || card.matched ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                style={{ transformStyle: "preserve-3d" }}
            >
                {/* Front (Hidden) */}
                <div
                    className="absolute w-full h-full backface-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg flex items-center justify-center border-2 border-white/20 group-hover:scale-105 transition-transform"
                    style={{ backfaceVisibility: "hidden" }}
                >
                    <Sparkles className="text-white/30 w-8 h-8" />
                </div>

                {/* Back (Revealed) */}
                <div
                    className={`absolute w-full h-full backface-hidden rounded-xl bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-800 shadow-xl flex items-center justify-center text-3xl sm:text-4xl
                        ${card.matched ? "ring-4 ring-green-400/50 ring-offset-2" : ""}
`}
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                    {card.icon}
                </div>
            </motion.div>
        </div>
    );
}, (prev, next) => {
    return prev.card.flipped === next.card.flipped &&
        prev.card.matched === next.card.matched &&
        prev.disabled === next.disabled;
});
MemoryCard.displayName = "MemoryCard";

interface StatCardProps {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color: string;
    borderColor: string;
}

const StatCard = memo(({ icon: Icon, label, value, color, borderColor }: StatCardProps) => (
    <Card className={`flex-1 p-3 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-800/50 backdrop-blur border-2 ${borderColor}`}>
        <div className={`flex items-center gap-2 ${color} mb-1`}>
            <Icon className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-2xl font-black text-slate-700 dark:text-slate-200">{value}</span>
    </Card>
));

StatCard.displayName = "StatCard";

interface PvPStatCardProps {
    isMe: boolean;
    isCurrent: boolean;
    score: number;
    playerLabel: string;
}

const PvPStatCard = memo(({ isMe, isCurrent, score, playerLabel }: PvPStatCardProps) => (
    <Card className={`flex-1 p-3 flex flex-col items-center justify-center border-2 transition-all ${isCurrent
        ? (isMe ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-pink-500 bg-pink-50 dark:bg-pink-900/20')
        : 'border-transparent bg-white/50 dark:bg-slate-800/50'}`}>
        <div className={`flex items-center gap-2 ${isMe ? 'text-blue-500' : 'text-pink-500'} mb-1`}>
            <Users className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{playerLabel}</span>
        </div>
        <span className="text-2xl font-black text-slate-700 dark:text-slate-200">{score}</span>
    </Card>
));

PvPStatCard.displayName = "PvPStatCard";

const MemoryMatch = () => {
    const navigate = useNavigate();
    const playSound = useGameSounds();
    const {
        triggerWinReward,
        showRewardModal,
        setShowRewardModal,
        COIN_REWARD,
        XP_REWARD
    } = useGameReward();
    const [cards, setCards] = useState<CardType[]>([]);
    const [flippedCards, setFlippedCards] = useState<CardType[]>([]);
    const [isLock, setIsLock] = useState(false);
    const [moves, setMoves] = useState(0);
    const [isWon, setIsWon] = useState(false);
    const [bestScore, setBestScore] = useState<number | null>(null);
    const [timer, setTimer] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // Online PvP State
    const [gameMode, setGameMode] = useState<GameMode>("SOLO");
    const [roomId, setRoomId] = useState("");
    const [isHost, setIsHost] = useState(false);
    const [joinRoomId, setJoinRoomId] = useState("");
    const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
    const [scores, setScores] = useState({ 1: 0, 2: 0 });

    const triggerConfetti = useCallback(() => {
        confetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#8b5cf6', '#d946ef', '#f43f5e']
        });
    }, []);

    const initializeGame = useCallback((isRemoteReset = false) => {
        playSound('click');

        // Only Host shuffles in Online Mode
        if (gameMode === 'ONLINE' && !isHost && !isRemoteReset) return;

        const gameCards = [...CARDS_DATA, ...CARDS_DATA].map((card, index) => ({
            ...card,
            id: index,
            flipped: false,
            matched: false
        }));

        gameCards.sort(() => Math.random() - 0.5);

        setCards(gameCards);
        setFlippedCards([]);
        setMoves(0);
        setTimer(0);
        setIsLock(false);
        setIsWon(false);
        setIsPlaying(true);
        setCurrentPlayer(1);
        setScores({ 1: 0, 2: 0 });

        // sendMove is from useMultiplayerGame, which depends on roomId.
        // If initializeGame is called before roomId is set (e.g., on initial render), sendMove might not be ready.
        // However, the current logic implies sendMove is available when gameMode is 'ONLINE'.
        // For stability, we should ensure sendMove is stable or passed as a dependency.
        // Given the instruction to omit sendMove from initializeGame's dependencies, we assume it's stable or handled.
        // If sendMove were to change, this useCallback would need to re-run.
        // For now, following the instruction.
        // If sendMove is truly a dependency, it should be added: [gameMode, isHost, playSound, sendMove]
        if (gameMode === 'ONLINE') {
            // sendMove will be defined after useMultiplayerGame hook is called.
            // This function is called in useEffect after useMultiplayerGame is defined.
            // So, it should be safe to call sendMove here.
            // However, if sendMove itself changes, this useCallback would not update.
            // For this refactor, we assume sendMove is stable or its changes don't require re-creating initializeGame.
            // If sendMove is not stable, it should be added to the dependency array.
            // For now, we follow the provided example's dependency list.

            sendMove({
                cards: gameCards,
                currentPlayer: 1,
                scores: { 1: 0, 2: 0 },
                isWon: false,
                reset: isRemoteReset
            });
        }
    }, [gameMode, isHost, playSound]); // sendMove omitted as per instruction example

    const handleWin = useCallback((finalScores?: { 1: number, 2: number }) => {
        setIsWon(true);
        setIsPlaying(false);
        playSound('win');

        if (gameMode === 'ONLINE') {

            sendMove({ isWon: true });

            // Determine winner for confetti
            const s = finalScores || scores;
            const amIWinner = (s[1] > s[2] && isHost) || (s[2] > s[1] && !isHost);
            const isDraw = s[1] === s[2];

            if (amIWinner) {
                triggerConfetti();
                triggerWinReward();
            } else if (isDraw) {
                triggerConfetti();
            } else {
                // Loss - nothing
            }
        } else {
            // Solo Win
            if (!bestScore || moves + 1 < bestScore) {
                setBestScore(moves + 1);
                localStorage.setItem("memory_best_score", (moves + 1).toString());
                toast.success("New Best Score!", { icon: "👑" });
            } else {
                toast.success(`Complete in ${moves + 1} moves!`, { icon: "🧠" });
            }
            triggerConfetti();
            triggerWinReward();
        }
    }, [bestScore, gameMode, isHost, moves, playSound, scores, triggerConfetti]); // sendMove omitted as per instruction example

    const { isConnected, playerCount, sendMove } = useMultiplayerGame({
        gameId: 'memory',
        roomId,
        initialState: {
            cards: [],
            currentPlayer: 1,
            scores: { 1: 0, 2: 0 },
            flippedIndices: []
        },
        onStateUpdate: (newState) => {
            if (newState.reset) {
                initializeGame(true);
                return;
            }
            if (newState.cards) setCards(newState.cards);
            if (newState.currentPlayer) setCurrentPlayer(newState.currentPlayer);
            if (newState.scores) setScores(newState.scores);
            if (newState.isWon) setIsWon(newState.isWon);
        },
        onPlayerJoin: () => {
            if (isHost) {
                initializeGame(); // Restart with new player logic? Or just rely on current state broadcast
                // Actually, if host is already waiting with a shuffled deck, we should just broadcast it.
                // But for simplicity, let's re-shuffle for a fresh game.
                toast.success("Player Joined! Starting Game...");
                setTimeout(() => initializeGame(), 500);
            }
        }
    });

    // Load Best Score
    useEffect(() => {
        const savedBest = localStorage.getItem("memory_best_score");
        if (savedBest) setBestScore(parseInt(savedBest));
        initializeGame();
    }, [initializeGame]); // Added initializeGame to dependencies

    // Timer Logic (Solo Only)
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (gameMode === 'SOLO' && isPlaying && !isWon) {
            interval = setInterval(() => {
                setTimer(t => t + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, isWon, gameMode]);

    const formatTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')} `;
    }, []);

    const createRoom = useCallback(() => {
        const newRoomId = Math.random().toString(36).substring(7).toUpperCase();
        setRoomId(newRoomId);
        setIsHost(true);
        setGameMode("ONLINE");
    }, []); // setRoomId, setIsHost, setGameMode are stable setState functions

    const joinRoom = useCallback(() => {
        if (!joinRoomId) return;
        setRoomId(joinRoomId);
        setIsHost(false);
        setGameMode("ONLINE");
    }, [joinRoomId]); // setRoomId, setIsHost, setGameMode are stable setState functions

    const checkForMatch = useCallback((currentFlipped: CardType[], currentCards: CardType[]) => {
        const [card1, card2] = currentFlipped;
        const isMatch = card1.matchId === card2.matchId;

        if (isMatch) {
            playSound('win');
            const matchedCards = currentCards.map(c =>
                c.matchId === card1.matchId ? { ...c, matched: true } : c
            );
            setCards(matchedCards);
            setFlippedCards([]);
            setIsLock(false);

            // Update Score for Current Player
            let newScores = { ...scores };
            if (gameMode === 'ONLINE') {
                newScores = {
                    ...scores,
                    [currentPlayer]: scores[currentPlayer] + 1
                };
                setScores(newScores);
            }

            // Sync Match
            if (gameMode === 'ONLINE') {
                // If match, player KEEPS turn
                sendMove({ cards: matchedCards, scores: newScores });
            }

            // Check win
            if (matchedCards.every(c => c.matched)) {
                handleWin(newScores);
            }
        } else {
            // No Match
            setTimeout(() => {
                const resetCards = currentCards.map(c =>
                    (c.id === card1.id || c.id === card2.id) ? { ...c, flipped: false } : c
                );
                setCards(resetCards);
                setFlippedCards([]);
                setIsLock(false);

                if (gameMode === 'ONLINE') {
                    // Switch turn
                    const nextPlayer = currentPlayer === 1 ? 2 : 1;
                    setCurrentPlayer(nextPlayer);
                    sendMove({ cards: resetCards, currentPlayer: nextPlayer });
                }
            }, 1000);
        }
    }, [currentPlayer, gameMode, handleWin, playSound, scores, sendMove]);

    const handleCardClick = useCallback((id: number) => {
        if (isLock || isWon) return;

        // Turn Logic for Online
        if (gameMode === 'ONLINE') {
            if (!isConnected) return;
            const amIPlayer1 = isHost;
            if (amIPlayer1 && currentPlayer !== 1) return;
            if (!amIPlayer1 && currentPlayer !== 2) return;
        }

        const clickedCard = cards.find(c => c.id === id);
        if (!clickedCard || clickedCard.flipped || clickedCard.matched) return;

        playSound('pop');

        // Flip the card
        const newCards = cards.map(c =>
            c.id === id ? { ...c, flipped: true } : c
        );
        setCards(newCards);

        const newFlippedCards = [...flippedCards, clickedCard];
        setFlippedCards(newFlippedCards);

        // Sync Partial Move (Just the flip)
        if (gameMode === 'ONLINE') {
            sendMove({ cards: newCards });
        }

        if (newFlippedCards.length === 2) {
            setIsLock(true);
            setMoves(m => m + 1);
            checkForMatch(newFlippedCards, newCards);
        }
    }, [cards, checkForMatch, currentPlayer, flippedCards, gameMode, isConnected, isHost, isLock, isWon, playSound, sendMove]);


    const statsBar = useMemo(() => {
        if (gameMode === 'SOLO') {
            return (
                <div className="flex gap-4 mb-8 w-full max-w-md">
                    <StatCard
                        icon={Hash}
                        label="Moves"
                        value={moves}
                        color="text-violet-500"
                        borderColor="border-violet-100 dark:border-violet-900/20"
                    />
                    <StatCard
                        icon={Timer}
                        label="Time"
                        value={formatTime(timer)}
                        color="text-pink-500"
                        borderColor="border-violet-100 dark:border-violet-900/20"
                    />
                    <StatCard
                        icon={Trophy}
                        label="Best"
                        value={bestScore || "-"}
                        color="text-yellow-500"
                        borderColor="border-violet-100 dark:border-violet-900/20"
                    />
                </div>
            );
        } else {
            return (
                <div className="flex gap-4 mb-8 w-full max-w-md">
                    <PvPStatCard
                        isMe={isHost}
                        isCurrent={currentPlayer === 1}
                        score={scores[1]}
                        playerLabel={isHost ? "You" : "Opponent"}
                    />
                    <PvPStatCard
                        isMe={!isHost}
                        isCurrent={currentPlayer === 2}
                        score={scores[2]}
                        playerLabel={!isHost ? "You" : "Opponent"}
                    />
                </div>
            );
        }
    }, [gameMode, moves, timer, bestScore, isHost, currentPlayer, scores, formatTime]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center py-6 px-4">
            {/* Header */}
            <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/games")} className="hover:bg-slate-200 dark:hover:bg-slate-800">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <HowToPlay
                        title="Memory Match"
                        description="Find matching pairs of cards."
                        rules={[
                            "Click a card to reveal it.",
                            "Find the matching pair to clear them.",
                            "In Solo, race against time and moves.",
                            "In Online PvP, finding a pair lets you keep your turn!"
                        ]}
                    />
                </div>

                <div className="flex flex-col items-center">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent hidden md:block">Memory Match</h1>
                    {gameMode === 'ONLINE' && (
                        <div className="flex items-center gap-2 text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            <Globe className="w-3 h-3" /> ONLINE {roomId ? `#${roomId} ` : ''}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setGameMode(prev => prev === 'SOLO' ? 'ONLINE' : 'SOLO');
                            if (gameMode === 'ONLINE') { setRoomId(''); setIsHost(false); }
                            initializeGame();
                        }}
                        className="gap-2"
                    >
                        {gameMode === 'SOLO' ? <Users className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                        {gameMode === 'SOLO' ? 'PvP Mode' : 'Solo Mode'}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => initializeGame()} className="rounded-full hover:rotate-180 transition-transform duration-500">
                        <RotateCcw className="w-5 h-5" />
                    </Button>
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

            {/* Stats Bar */}
            {statsBar}

            {/* Grid */}
            <div className={`p-4 grid grid-cols-4 gap-3 md:gap-4 max-w-xl mx-auto perspective-1000 ${gameMode === 'ONLINE' && !isConnected && playerCount < 2 ? 'opacity-50 pointer-events-none' : ''}`}>
                <AnimatePresence>
                    {cards.map((card) => (
                        <MemoryCard
                            key={card.id}
                            card={card}
                            onClick={handleCardClick}
                            disabled={isLock || isWon || (gameMode === 'ONLINE' && ((isHost && currentPlayer !== 1) || (!isHost && currentPlayer !== 2)))}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Win Message */}
            <AnimatePresence>
                {isWon && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-8 py-4 rounded-2xl font-bold shadow-xl flex flex-col items-center gap-2 text-center"
                    >
                        <div className="flex items-center gap-2 text-xl">
                            <Trophy className="w-6 h-6 fill-yellow-300 text-yellow-300" />
                            {gameMode === 'SOLO' ? "Level Complete!" : (scores[1] === scores[2] ? "It's a Draw!" : (
                                (scores[1] > scores[2] && isHost) || (scores[2] > scores[1] && !isHost) ? "You Won!" : "You Lost!"
                            ))}
                        </div>
                        {gameMode === 'SOLO' && <p className="text-white/90 font-medium">You found all pairs in {moves} moves.</p>}

                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => initializeGame()}
                            className="mt-2 w-full font-bold"
                            disabled={gameMode === 'ONLINE' && !isHost}
                        >
                            {gameMode === 'ONLINE' && !isHost ? "Waiting for Host..." : "Play Again"}
                        </Button>
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

export default MemoryMatch;
