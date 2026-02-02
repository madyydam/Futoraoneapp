import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Trophy, Cpu, Users, Globe, Copy } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useGameSounds } from "@/hooks/useGameSounds";
import { HowToPlay } from "@/components/games/HowToPlay";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGameReward } from "@/hooks/useGameReward";
import { WinCelebration } from "@/components/games/WinCelebration";

const ROWS = 6;
const COLS = 7;
type Player = 1 | 2;
type GameMode = "PVP" | "AI" | "ONLINE";

const ConnectFour = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const playSound = useGameSounds();
    const {
        triggerWinReward,
        showRewardModal,
        setShowRewardModal,
        COIN_REWARD,
        XP_REWARD
    } = useGameReward();
    const [board, setBoard] = useState<number[][]>(
        Array(ROWS).fill(null).map(() => Array(COLS).fill(0))
    );
    const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
    const [winner, setWinner] = useState<number | null>(null);
    const [scores, setScores] = useState({ 1: 0, 2: 0 });
    const [gameMode, setGameMode] = useState<GameMode>("PVP");
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
            setIsHost(false);
        }
    }, [searchParams]);

    const { isConnected, playerCount, sendMove, myPlayerId } = useMultiplayerGame({
        gameId: 'connect4',
        roomId: roomId,
        initialState: { board, currentPlayer },
        onStateUpdate: (newState) => {
            if (gameMode === 'ONLINE') {
                setBoard(newState.board);
                setCurrentPlayer(newState.currentPlayer);
            }
        }
    });

    const myPlayerNum = isHost ? 1 : 2;
    const isMyTurn = gameMode === 'ONLINE' ? (currentPlayer === myPlayerNum) : true;

    const createRoom = () => {
        const newRoomId = Math.random().toString(36).substring(7);
        setRoomId(newRoomId);
        setIsHost(true);
        setGameMode("ONLINE");
        setShowRoomDialog(true);
        setScores({ 1: 0, 2: 0 });
        resetGame(true);
    };

    // Initial Load Stats
    useEffect(() => {
        const savedScores = localStorage.getItem("connect4_scores");
        if (savedScores) setScores(JSON.parse(savedScores));
    }, []);

    // Save Stats
    useEffect(() => {
        localStorage.setItem("connect4_scores", JSON.stringify(scores));
    }, [scores]);

    // AI Logic Trigger
    useEffect(() => {
        if (gameMode === "AI" && currentPlayer === 2 && !winner) {
            setIsAiTurn(true);
            const timer = setTimeout(() => {
                makeAiMove();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [currentPlayer, gameMode, winner]);

    const checkWin = (b: number[][], row: number, col: number, player: number) => {
        const directions = [
            [0, 1],  // Horizontal
            [1, 0],  // Vertical
            [1, 1],  // Diagonal /
            [1, -1]  // Diagonal \
        ];

        for (const [dr, dc] of directions) {
            let count = 1;
            let r = row + dr;
            let c = col + dc;
            while (r >= 0 && r < ROWS && c >= 0 && c < COLS && b[r][c] === player) {
                count++;
                r += dr;
                c += dc;
            }
            r = row - dr;
            c = col - dc;
            while (r >= 0 && r < ROWS && c >= 0 && c < COLS && b[r][c] === player) {
                count++;
                r -= dr;
                c -= dc;
            }
            if (count >= 4) return true;
        }
        return false;
    };

    const makeAiMove = () => {
        let col = -1;

        const getRow = (b: number[][], c: number) => {
            for (let r = ROWS - 1; r >= 0; r--) {
                if (b[r][c] === 0) return r;
            }
            return -1;
        };

        for (let c = 0; c < COLS; c++) {
            const r = getRow(board, c);
            if (r !== -1) {
                const tempBoard = board.map(arr => [...arr]);
                tempBoard[r][c] = 2; // AI is P2
                if (checkWin(tempBoard, r, c, 2)) {
                    col = c;
                    break;
                }
            }
        }

        if (col === -1) {
            for (let c = 0; c < COLS; c++) {
                const r = getRow(board, c);
                if (r !== -1) {
                    const tempBoard = board.map(arr => [...arr]);
                    tempBoard[r][c] = 1; // Opponent is P1
                    if (checkWin(tempBoard, r, c, 1)) {
                        col = c;
                        break;
                    }
                }
            }
        }

        if (col === -1) {
            const center = 3;
            const availableCols = [];
            for (let c = 0; c < COLS; c++) if (board[0][c] === 0) availableCols.push(c);
            availableCols.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));

            if (availableCols.length > 0) {
                const best = availableCols[0];
                const others = availableCols.slice(1);
                col = (Math.random() < 0.8 || others.length === 0) ? best : others[Math.floor(Math.random() * others.length)];
            }
        }

        if (col !== -1) {
            handleColumnClick(col, true);
        }
        setIsAiTurn(false);
    };

    const handleColumnClick = (col: number, isAi = false) => {
        if (winner) return;
        if (!isAi && isAiTurn) return; // Block user input during AI turn logic

        // Online Check
        if (gameMode === 'ONLINE' && !isMyTurn) {
            toast.error("Not your turn!");
            return;
        }

        let row = ROWS - 1;
        while (row >= 0 && board[row][col] !== 0) {
            row--;
        }

        if (row < 0) return;

        playSound('pop');
        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = currentPlayer;

        setBoard(newBoard);

        const nextPlayer = currentPlayer === 1 ? 2 : 1;

        if (checkWin(newBoard, row, col, currentPlayer)) {
            setWinner(currentPlayer);
            if (gameMode !== 'ONLINE') {
                setScores(prev => ({ ...prev, [currentPlayer]: prev[currentPlayer as keyof typeof prev] + 1 }));
            }
            // Online: Only host updates score or both? Keep simple: both but derived.
            // Wait, logic here is local. If I won, I show trophy.

            toast.success(`${currentPlayer === 2 && gameMode === 'AI' ? 'AI' : 'Player ' + currentPlayer} Wins!`, { icon: "🏆" });
            playSound('win');
            if (!(gameMode === 'AI' && currentPlayer === 2)) {
                confetti({
                    particleCount: 150,
                    spread: 80,
                    origin: { y: 0.6 },
                    colors: currentPlayer === 1 ? ['#ef4444', '#b91c1c'] : ['#eab308', '#ca8a04']
                });

                // Reward logic: AI mode (P1 win) or Online mode (My turn win)
                if (gameMode === 'AI' && currentPlayer === 1) {
                    triggerWinReward();
                } else if (gameMode === 'ONLINE' && currentPlayer === myPlayerNum) {
                    triggerWinReward();
                }
            }
            // If game over, nextPlayer doesn't matter much for turn, but state needs syncing?
            // Usually we keep next player valid.
        } else {
            if (newBoard.flat().every(cell => cell !== 0)) {
                setWinner(0); // Draw
                toast.info("It's a Draw!", { icon: "🤝" });
                playSound('draw');
            } else {
                setCurrentPlayer(nextPlayer as Player);
            }
        }

        if (gameMode === 'ONLINE') {
            // If won, we strictly sync board and current player.
            // But we already updated local via `handleColumnClick` (Optimistic).
            // But wait, if I am P1, I set `currentPlayer` to 2.
            // Receiver (P2) gets { board, currentPlayer: 2 }.
            // P2 sees `currentPlayer` is 2. `2 === 2 (myPlayerNum)` -> True. P2 turn. Correct.
            sendMove({ board: newBoard, currentPlayer: nextPlayer });
        }
    };

    const resetGame = (force = false) => {
        if (gameMode === 'ONLINE' && !force && !isHost) {
            toast("Host has reset the game");
            sendMove({ board: Array(ROWS).fill(null).map(() => Array(COLS).fill(0)), currentPlayer: 1 });
        }

        playSound('click');
        setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
        setWinner(null);
        setCurrentPlayer(1);
        setIsAiTurn(false);
    };

    const toggleGameMode = () => {
        playSound('click');
        setGameMode(prev => prev === "AI" ? "PVP" : "AI");
        resetGame();
        setScores({ 1: 0, 2: 0 });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center py-6 px-4">
            {/* Header */}
            <div className="w-full max-w-2xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 self-start md:self-auto">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/games")} className="hover:bg-slate-200 dark:hover:bg-slate-800">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <HowToPlay
                        title="Connect Four"
                        description="Be the first to connect four of your colored discs in a row."
                        rules={[
                            "Players take turns dropping discs into the grid.",
                            "Connect 4 pieces vertically, horizontally, or diagonally to win."
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
            <div className="flex gap-4 md:gap-12 mb-8">
                <Card className={`p-4 md:px-8 flex flex-col items-center min-w-[120px] border-2 transition-all duration-300 ${currentPlayer === 1 && !winner ? "border-red-500 shadow-lg scale-105 ring-2 ring-red-200" : "border-transparent"}`}>
                    <div className="w-8 h-8 rounded-full bg-red-500 shadow-inner mb-2 border-2 border-red-600" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                        {gameMode === 'ONLINE' ? (isHost ? 'You' : 'P1') : 'You'}
                    </span>
                    <span className="text-3xl font-black text-red-500">{scores[1]}</span>
                </Card>
                <div className="flex flex-col justify-center items-center">
                    <span className="text-4xl font-black text-slate-200 dark:text-slate-800">VS</span>
                </div>
                <Card className={`p-4 md:px-8 flex flex-col items-center min-w-[120px] border-2 transition-all duration-300 ${currentPlayer === 2 && !winner ? "border-yellow-500 shadow-lg scale-105 ring-2 ring-yellow-200" : "border-transparent"}`}>
                    <div className="w-8 h-8 rounded-full bg-yellow-400 shadow-inner mb-2 border-2 border-yellow-500" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                        {gameMode === 'ONLINE' ? (!isHost ? 'You' : 'P2') : (gameMode === 'AI' ? 'AI' : 'P2')}
                    </span>
                    <span className="text-3xl font-black text-yellow-500">{scores[2]}</span>
                </Card>
            </div>

            {/* Game Board */}
            <div className="p-3 md:p-4 bg-blue-600 rounded-3xl shadow-[0_20px_50px_rgba(37,99,235,0.3)] relative mx-auto w-full max-w-[90vw] md:max-w-fit">
                {/* Leg stands (visual) */}
                <div className="absolute -bottom-8 -left-4 w-4 h-32 bg-blue-700 rounded-full rotate-12 -z-10 hidden md:block"></div>
                <div className="absolute -bottom-8 -right-4 w-4 h-32 bg-blue-700 rounded-full -rotate-12 -z-10 hidden md:block"></div>

                <div className="bg-blue-500 p-2 md:p-4 rounded-2xl border-4 border-blue-400 box-content relative">
                    {/* Blocker for AI turn or Online Wait */}
                    {(isAiTurn || (gameMode === 'ONLINE' && !isMyTurn)) && !winner && (
                        <div className="absolute inset-0 z-20 cursor-wait bg-transparent" />
                    )}

                    <div className="grid grid-cols-7 gap-1 md:gap-3 bg-blue-500">
                        {board.map((row, rIdx) => (
                            row.map((cell, cIdx) => (
                                <div
                                    key={`${rIdx}-${cIdx}`}
                                    className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-slate-100 dark:bg-slate-900 shadow-inner flex items-center justify-center cursor-pointer relative overflow-hidden group"
                                    onClick={() => handleColumnClick(cIdx)}
                                >
                                    {/* Column Hover Effect Only if my turn */}
                                    {(gameMode !== 'ONLINE' || isMyTurn) && !winner && !isAiTurn && (
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-full z-0 pointer-events-none" />
                                    )}

                                    <AnimatePresence>
                                        {cell !== 0 && (
                                            <motion.div
                                                initial={{ y: -300, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                                className={`w-full h-full rounded-full shadow-[inset_-4px_-4px_8px_rgba(0,0,0,0.2)] border-4 z-10
                                                    ${cell === 1
                                                        ? "bg-red-500 border-red-400"
                                                        : "bg-yellow-400 border-yellow-300"}
                                                `}
                                                style={{ willChange: "transform" }}
                                            >
                                                {/* Shine effect */}
                                                <div className="absolute top-2 left-2 w-1/3 h-1/3 bg-white/30 rounded-full blur-[1px]" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))
                        ))}
                    </div>
                </div>
            </div>

            {/* Turn Indicator / Winner Message */}
            <div className="mt-8 h-12">
                <AnimatePresence mode="wait">
                    {winner ? (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="bg-green-500 text-white px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2"
                        >
                            <Trophy className="w-5 h-5 fill-current" />
                            {winner === 0 ? "It's a Draw!" : `${winner === 2 && gameMode === 'AI' ? 'AI' : 'Player ' + winner} Wins!`}
                        </motion.div>
                    ) : (
                        <motion.div
                            key={currentPlayer}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            className="text-muted-foreground font-medium flex items-center gap-2"
                        >
                            {gameMode === 'ONLINE' ? (
                                isMyTurn ? "Your Turn" : "Opponent's Turn"
                            ) : (
                                <>
                                    It's <span className={currentPlayer === 1 ? "text-red-500 font-bold" : "text-yellow-500 font-bold"}>
                                        {gameMode === 'AI' && currentPlayer === 2 ? "AI's" : (currentPlayer === 1 ? "Your" : "Player 2's")}
                                    </span> Turn
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
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
                            const url = `${window.location.origin}/games/connect-four?room=${roomId}`;
                            navigator.clipboard.writeText(url);
                            toast.success("Link copied!");
                        }}>
                            <Copy className="w-4 h-4 mr-2" /> Copy Invite Link
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
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

export default ConnectFour;
