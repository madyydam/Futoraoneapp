import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, RotateCcw, Trophy, Circle, X, Cpu, Users, Globe, Copy } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGameReward } from "@/hooks/useGameReward";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { useGameSounds } from "@/hooks/useGameSounds";
import { HowToPlay } from "@/components/games/HowToPlay";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Player = "X" | "O" | null;
type GameMode = "PVP" | "AI" | "ONLINE";
type Difficulty = "EASY" | "HARD";

// --- Pure Helper Functions (Moved Outside) ---

const checkWinner = (squares: Player[]): "X" | "O" | "Draw" | null => {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return squares[a] as "X" | "O";
        }
    }
    if (!squares.includes(null)) return "Draw";
    return null;
};

const scoresMap = { O: 10, X: -10, Draw: 0 };

const minimax = (currentBoard: Player[], depth: number, isMaximizing: boolean): number => {
    const result = checkWinner(currentBoard);
    if (result !== null) return scoresMap[result as keyof typeof scoresMap];

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (currentBoard[i] === null) {
                currentBoard[i] = "O";
                const score = minimax(currentBoard, depth + 1, false);
                currentBoard[i] = null;
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) {
            if (currentBoard[i] === null) {
                currentBoard[i] = "X";
                const score = minimax(currentBoard, depth + 1, true);
                currentBoard[i] = null;
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
};

const getBestMove = (currentBoard: Player[]): number => {
    let bestScore = -Infinity;
    let move = -1;
    const emptySpots = currentBoard.filter(s => s === null).length;
    // Optimization for first move
    if (emptySpots === 9) return 4;
    if (emptySpots === 8 && currentBoard[4] === null) return 4;

    for (let i = 0; i < 9; i++) {
        if (currentBoard[i] === null) {
            currentBoard[i] = "O";
            const score = minimax(currentBoard, 0, false);
            currentBoard[i] = null;
            if (score > bestScore) {
                bestScore = score;
                move = i;
            }
        }
    }
    return move;
};

// --- Memoized Square Component ---
const MemoizedSquare = React.memo(({
    value,
    index,
    onClick,
    disabled,
    isWinnerSquare
}: {
    value: Player,
    index: number,
    onClick: (i: number) => void,
    disabled: boolean,
    isWinnerSquare: boolean
}) => {
    return (
        <motion.button
            whileHover={!disabled ? { scale: 1.05 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            className={`w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-2xl text-5xl font-bold flex items-center justify-center transition-colors duration-200 
                ${!disabled ? "hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer bg-slate-50 dark:bg-slate-900" : "cursor-default"}
                ${value === "X" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-500" : value === "O" ? "bg-pink-50 dark:bg-pink-900/20 text-pink-500" : ""}
            `}
            onClick={() => onClick(index)}
            disabled={disabled}
        >
            <AnimatePresence mode="wait">
                {value === "X" && (
                    <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <X className="w-12 h-12 sm:w-16 sm:h-16" strokeWidth={3} />
                    </motion.div>
                )}
                {value === "O" && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <Circle className="w-12 h-12 sm:w-16 sm:h-16" strokeWidth={3} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.button>
    );
});
MemoizedSquare.displayName = "MemoizedSquare";


const TicTacToe = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const playSound = useGameSounds();
    const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
    const [xIsNext, setXIsNext] = useState(true);
    const [winner, setWinner] = useState<"X" | "O" | "Draw" | null>(null);
    const [scores, setScores] = useState({ X: 0, O: 0 });
    const [gameMode, setGameMode] = useState<GameMode>("AI");
    const [difficulty, setDifficulty] = useState<Difficulty>("HARD");
    const [isAiTurn, setIsAiTurn] = useState(false);

    // Online State
    const [roomId, setRoomId] = useState("");
    const [showRoomDialog, setShowRoomDialog] = useState(false);
    const [isHost, setIsHost] = useState(false);

    // Join room from URL
    useEffect(() => {
        const room = searchParams.get("room");
        if (room) {
            setRoomId(room);
            setGameMode("ONLINE");
            setIsHost(false); // If joining via link, not host usually (unless created self)
        }
    }, [searchParams]);

    const { isConnected, playerCount, sendMove, myPlayerId } = useMultiplayerGame({
        gameId: 'tictactoe',
        roomId: roomId,
        initialState: { board, xIsNext },
        onStateUpdate: (newState) => {
            if (gameMode === 'ONLINE') {
                setBoard(newState.board);
                setXIsNext(newState.xIsNext);
                // State updates will trigger checkWinner effect
            }
        }
    });

    const isMyTurn = gameMode === 'ONLINE'
        ? (isHost && xIsNext) || (!isHost && !xIsNext) // Host is X, Joiner is O
        : true; // Local game always my turn (except AI)

    const handleMove = useCallback((i: number, isAi = false) => {
        if (winner || board[i]) return;
        if (!isAi && isAiTurn) return;

        // Online Check
        if (gameMode === 'ONLINE' && !isMyTurn) {
            toast.error("Not your turn!");
            return;
        }

        playSound('pop');
        const newBoard = [...board];
        const nextPlayer = xIsNext ? "X" : "O";
        newBoard[i] = nextPlayer;

        setBoard(newBoard);
        setXIsNext(!xIsNext);

        if (gameMode === 'ONLINE') {
            sendMove({ board: newBoard, xIsNext: !xIsNext });
        }
    }, [board, gameMode, isAiTurn, isMyTurn, playSound, sendMove, winner, xIsNext]);

    const resetGame = useCallback((force = false) => {
        if (gameMode === 'ONLINE' && !force && !isHost) {
            toast("Host has reset the game");
            sendMove({ board: Array(9).fill(null), xIsNext: true });
        }

        playSound('click');
        setBoard(Array(9).fill(null));
        setWinner(null);
        setXIsNext(true);
        setIsAiTurn(false);
    }, [gameMode, isHost, playSound, sendMove]);

    const createRoom = useCallback(() => {
        const newRoomId = Math.random().toString(36).substring(7);
        setRoomId(newRoomId);
        setIsHost(true);
        setGameMode("ONLINE");
        setShowRoomDialog(true);
        setScores({ X: 0, O: 0 });
        if (isHost && gameMode === 'ONLINE') {
            sendMove({ board: Array(9).fill(null), xIsNext: true });
        } else {
            // Local reset
            setBoard(Array(9).fill(null));
            setWinner(null);
            setXIsNext(true);
        }
    }, [gameMode, isHost, sendMove]);


    // Initial Load Stats
    useEffect(() => {
        const savedScores = localStorage.getItem("tictactoe_scores");
        if (savedScores) setScores(JSON.parse(savedScores));
    }, []);

    // Save Stats
    useEffect(() => {
        localStorage.setItem("tictactoe_scores", JSON.stringify(scores));
    }, [scores]);

    // Derived effect for winner
    useEffect(() => {
        const calculatedWinner = checkWinner(board);
        if (calculatedWinner && !winner) {
            setWinner(calculatedWinner);
            if (calculatedWinner !== "Draw") {
                playSound('win');
                if (gameMode !== 'ONLINE') {
                    setScores(prev => ({ ...prev, [calculatedWinner]: prev[calculatedWinner as keyof typeof prev] + 1 }));
                }

                if ((calculatedWinner === 'X' && isHost) || (calculatedWinner === 'O' && !isHost) || gameMode !== 'AI') {
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: calculatedWinner === "X" ? ['#3b82f6', '#2563eb'] : ['#ec4899', '#db2777']
                    });
                }
            } else {
                playSound('draw');
            }
        }
    }, [board, gameMode, isHost, playSound, winner]);

    const makeAiMove = useCallback(() => {
        if (winner) return;
        let moveIndex: number = -1;

        if (checkWinner(board)) return;

        if (difficulty === "EASY") {
            const available = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
            if (available.length > 0) {
                moveIndex = available[Math.floor(Math.random() * available.length)];
            }
        } else {
            moveIndex = getBestMove(board);
        }

        if (moveIndex !== -1) {
            handleMove(moveIndex, true);
        }
        setIsAiTurn(false);
    }, [board, difficulty, handleMove, winner]);

    // AI MOVE LOGIC
    useEffect(() => {
        if (gameMode === "AI" && !xIsNext && !winner) {
            setIsAiTurn(true);
            const timer = setTimeout(() => {
                makeAiMove();
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [xIsNext, gameMode, winner, makeAiMove]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center py-6 px-4">
            {/* Header */}
            <div className="w-full max-w-2xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 self-start md:self-auto">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/games")} className="hover:bg-slate-200 dark:hover:bg-slate-800">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <HowToPlay
                        title="Tic Tac Toe"
                        description="Three marks in a row wins!"
                        rules={[
                            "Players take turns putting their marks in empty squares.",
                            "Get 3 marks in a row to win.",
                        ]}
                    />
                    {gameMode === 'ONLINE' && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 rounded-full text-xs font-bold">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            {isConnected ? `${playerCount} Connected` : 'Connecting...'}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    {gameMode === 'ONLINE' ? (
                        <Button variant="destructive" size="sm" onClick={() => { setGameMode('AI'); setRoomId(""); }}>
                            Leave Room
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant={gameMode === "AI" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setGameMode("AI")}
                                className="gap-2"
                            >
                                <Cpu className="w-4 h-4" /> AI
                            </Button>
                            <Button
                                variant={gameMode === "PVP" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setGameMode("PVP")}
                                className="gap-2"
                            >
                                <Users className="w-4 h-4" /> Local
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={createRoom}
                                className="gap-2 border-emerald-500 text-emerald-500 hover:bg-emerald-50"
                            >
                                <Globe className="w-4 h-4" /> Online
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Scoreboard */}
            <div className="flex gap-4 md:gap-12 mb-12">
                <Card className={`p-4 md:px-8 flex flex-col items-center min-w-[120px] border-2 transition-all duration-300 ${xIsNext && !winner ? "border-blue-500 shadow-lg scale-105 ring-2 ring-blue-200" : "border-transparent"}`}>
                    <X className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                        {gameMode === 'ONLINE' ? (isHost ? 'You' : 'P1') : 'You'}
                    </span>
                    <span className="text-3xl font-black text-blue-500">{scores.X}</span>
                </Card>
                <div className="flex flex-col justify-center items-center">
                    <span className="text-4xl font-black text-slate-200 dark:text-slate-800">VS</span>
                </div>
                <Card className={`p-4 md:px-8 flex flex-col items-center min-w-[120px] border-2 transition-all duration-300 ${!xIsNext && !winner ? "border-pink-500 shadow-lg scale-105 ring-2 ring-pink-200" : "border-transparent"}`}>
                    <Circle className="w-8 h-8 text-pink-500 mb-2" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                        {gameMode === 'ONLINE' ? (!isHost ? 'You' : 'P2') : (gameMode === 'AI' ? 'AI' : 'P2')}
                    </span>
                    <span className="text-3xl font-black text-pink-500">{scores.O}</span>
                </Card>
            </div>

            {/* Game Board */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-6 bg-white dark:bg-card rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-800"
            >
                <div className="grid grid-cols-3 gap-3 relative">
                    {/* Interaction Blocker for AI Turn or Online Wait */}
                    {(isAiTurn || (gameMode === 'ONLINE' && !isMyTurn)) && !winner && (
                        <div className="absolute inset-0 z-10 cursor-wait bg-transparent" />
                    )}

                    {board.map((square, i) => (
                        <MemoizedSquare
                            key={i}
                            value={square}
                            index={i}
                            onClick={handleMove}
                            disabled={!!square || !!winner || isAiTurn || (gameMode === 'ONLINE' && !isMyTurn)}
                            isWinnerSquare={false} // Would need logic to highlight, for now false
                        />
                    ))}
                </div>
            </motion.div>

            {/* Turn Indicator */}
            <div className="mt-12 h-16 flex flex-col items-center gap-2">
                <AnimatePresence mode="wait">
                    {winner ? (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold shadow-xl flex items-center gap-3 text-lg"
                        >
                            <Trophy className="w-6 h-6 text-yellow-400" />
                            {winner === "Draw" ? "Game Draw!" : `${winner === 'O' && gameMode === 'AI' ? 'AI' : 'Player ' + winner} Wins!`}
                        </motion.div>
                    ) : (
                        <motion.div
                            key={xIsNext ? "X" : "O"}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            className="text-xl font-medium flex items-center gap-2 bg-white dark:bg-card px-6 py-2 rounded-full shadow-sm"
                        >
                            {gameMode === 'ONLINE' ? (
                                isMyTurn ? "Your Turn" : "Opponent's Turn"
                            ) : (
                                <>It's <span className={xIsNext ? "text-blue-500 font-bold" : "text-pink-500 font-bold"}>
                                    {gameMode === 'AI' && !xIsNext ? "AI's" : (xIsNext ? "X's" : "O's")}
                                </span> Turn</>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <Button variant="ghost" className="mt-2" onClick={() => resetGame()}>
                    <RotateCcw className="w-4 h-4 mr-2" /> Reset
                </Button>
            </div>

            {/* Room Invite Dialog */}
            <Dialog open={showRoomDialog} onOpenChange={setShowRoomDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite a Friend</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <p className="text-sm text-muted-foreground">Share this Code or Link with your friend to play.</p>
                        <div className="flex gap-2">
                            <Input readOnly value={roomId} className="font-mono text-center font-bold tracking-widest text-lg" />
                            <Button onClick={() => {
                                navigator.clipboard.writeText(roomId);
                                toast.success("Code copied!");
                            }}>Copy</Button>
                        </div>
                        <div className="text-center text-xs text-muted-foreground">OR</div>
                        <Button variant="outline" className="w-full" onClick={() => {
                            const url = `${window.location.origin}/games/tic-tac-toe?room=${roomId}`;
                            navigator.clipboard.writeText(url);
                            toast.success("Link copied!");
                        }}>
                            <Copy className="w-4 h-4 mr-2" /> Copy Invite Link
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TicTacToe;
