import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, RotateCcw, Trophy, User, Cpu, Users, Globe, Copy } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { useGameSounds } from "@/hooks/useGameSounds";
import { HowToPlay } from "@/components/games/HowToPlay";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const GRID_SIZE = 4; // 4x4 dots = 3x3 boxes

interface Line {
    r: number;
    c: number;
    vertical: boolean;
}

type GameMode = "PVP" | "AI" | "ONLINE";

const DotsAndBoxes = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const playSound = useGameSounds();
    const [hLines, setHLines] = useState<number[][]>(
        Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE - 1).fill(0))
    );
    const [vLines, setVLines] = useState<number[][]>(
        Array(GRID_SIZE - 1).fill(null).map(() => Array(GRID_SIZE).fill(0))
    );
    const [boxes, setBoxes] = useState<number[][]>(
        Array(GRID_SIZE - 1).fill(null).map(() => Array(GRID_SIZE - 1).fill(0))
    );
    const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
    const [scores, setScores] = useState({ 1: 0, 2: 0 });
    const [winner, setWinner] = useState<number | null>(null);
    const [gameMode, setGameMode] = useState<GameMode>("AI");
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
        gameId: 'dotsandboxes',
        roomId: roomId,
        initialState: { hLines, vLines, boxes, currentPlayer, scores, winner },
        onStateUpdate: (newState) => {
            if (gameMode === 'ONLINE') {
                setHLines(newState.hLines);
                setVLines(newState.vLines);
                setBoxes(newState.boxes);
                setCurrentPlayer(newState.currentPlayer);
                setScores(newState.scores);
                if (newState.winner !== undefined) setWinner(newState.winner);
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
        const savedScores = localStorage.getItem("dots_scores");
        if (savedScores) setScores(JSON.parse(savedScores));
    }, []);

    // Save Stats
    useEffect(() => {
        localStorage.setItem("dots_scores", JSON.stringify(scores));
    }, [scores]);

    const resetGame = (force = false) => {
        if (gameMode === 'ONLINE' && !force && !isHost) {
            toast("Host has reset the game");
            // Send reset state
            sendMove({
                hLines: Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE - 1).fill(0)),
                vLines: Array(GRID_SIZE - 1).fill(null).map(() => Array(GRID_SIZE).fill(0)),
                boxes: Array(GRID_SIZE - 1).fill(null).map(() => Array(GRID_SIZE - 1).fill(0)),
                currentPlayer: 1,
                scores: { 1: 0, 2: 0 },
                winner: null
            });
        }

        playSound('click');
        setHLines(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE - 1).fill(0)));
        setVLines(Array(GRID_SIZE - 1).fill(null).map(() => Array(GRID_SIZE).fill(0)));
        setBoxes(Array(GRID_SIZE - 1).fill(null).map(() => Array(GRID_SIZE - 1).fill(0)));
        setCurrentPlayer(1);
        setScores({ 1: 0, 2: 0 });
        setWinner(null);
        setIsAiTurn(false);
    };

    const checkBoxes = (
        h: number[][],
        v: number[][],
        lastMove: { r: number; c: number; vertical: boolean }
    ) => {
        let captured = false;
        const newBoxes = [...boxes.map(row => [...row])];

        const checkPossibilities = [];
        if (lastMove.vertical) {
            if (lastMove.c > 0) checkPossibilities.push({ r: lastMove.r, c: lastMove.c - 1 });
            if (lastMove.c < GRID_SIZE - 1) checkPossibilities.push({ r: lastMove.r, c: lastMove.c });
        } else {
            if (lastMove.r > 0) checkPossibilities.push({ r: lastMove.r - 1, c: lastMove.c });
            if (lastMove.r < GRID_SIZE - 1) checkPossibilities.push({ r: lastMove.r, c: lastMove.c });
        }

        for (const box of checkPossibilities) {
            const hasTop = h[box.r][box.c] !== 0;
            const hasBottom = h[box.r + 1][box.c] !== 0;
            const hasLeft = v[box.r][box.c] !== 0;
            const hasRight = v[box.r][box.c + 1] !== 0;

            if (hasTop && hasBottom && hasLeft && hasRight && newBoxes[box.r][box.c] === 0) {
                newBoxes[box.r][box.c] = currentPlayer;
                captured = true;
            }
        }

        if (captured) {
            playSound('pop');
            return { captured: true, newBoxes };
        }
        return { captured: false, newBoxes };
    };

    // AI Logic
    useEffect(() => {
        if (gameMode === "AI" && currentPlayer === 2 && !winner) {
            setIsAiTurn(true);
            const timer = setTimeout(() => {
                makeAiMove();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [currentPlayer, gameMode, winner]);

    const makeAiMove = () => {
        // AI Strategy... same as before plus slight fix to use executeMove
        const moves: { r: number, c: number, v: boolean }[] = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE - 1; c++) {
                if (hLines[r][c] === 0) moves.push({ r, c, v: false });
            }
        }
        for (let r = 0; r < GRID_SIZE - 1; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (vLines[r][c] === 0) moves.push({ r, c, v: true });
            }
        }

        if (moves.length === 0) return;

        // 1. Check for scoring moves
        for (const move of moves) {
            if (isCompletingMove(move)) {
                executeMove(move.r, move.c, move.v, true);
                setIsAiTurn(false);
                return;
            }
        }

        // 2. Filter out moves that give away a box
        const safeMoves = moves.filter(m => !givesAwayBox(m));

        let selectedMove;
        if (safeMoves.length > 0) {
            selectedMove = safeMoves[Math.floor(Math.random() * safeMoves.length)];
        } else {
            selectedMove = moves[Math.floor(Math.random() * moves.length)];
        }

        if (selectedMove) {
            executeMove(selectedMove.r, selectedMove.c, selectedMove.v, true);
        }
        setIsAiTurn(false);
    };

    const isCompletingMove = (move: { r: number, c: number, v: boolean }) => {
        // ... (Keep existing logic)
        const sides = (r: number, c: number) => {
            let count = 0;
            if (hLines[r][c] !== 0 || (move.v === false && move.r === r && move.c === c)) count++;
            if (hLines[r + 1][c] !== 0 || (move.v === false && move.r === r + 1 && move.c === c)) count++;
            if (vLines[r][c] !== 0 || (move.v === true && move.r === r && move.c === c)) count++;
            if (vLines[r][c + 1] !== 0 || (move.v === true && move.r === r && move.c === c + 1)) count++;
            return count;
        };

        if (move.v) {
            if (move.c > 0 && sides(move.r, move.c - 1) === 4) return true;
            if (move.c < GRID_SIZE - 1 && sides(move.r, move.c) === 4) return true;
        } else {
            if (move.r > 0 && sides(move.r - 1, move.c) === 4) return true;
            if (move.r < GRID_SIZE - 1 && sides(move.r, move.c) === 4) return true;
        }
        return false;
    };

    const givesAwayBox = (move: { r: number, c: number, v: boolean }) => {
        const sides = (r: number, c: number) => {
            let count = 0;
            if (hLines[r][c] !== 0 || (move.v === false && move.r === r && move.c === c)) count++;
            if (hLines[r + 1][c] !== 0 || (move.v === false && move.r === r + 1 && move.c === c)) count++;
            if (vLines[r][c] !== 0 || (move.v === true && move.r === r && move.c === c)) count++;
            if (vLines[r][c + 1] !== 0 || (move.v === true && move.r === r && move.c === c + 1)) count++;
            return count;
        };

        if (move.v) {
            if (move.c > 0 && sides(move.r, move.c - 1) === 3) return true;
            if (move.c < GRID_SIZE - 1 && sides(move.r, move.c) === 3) return true;
        } else {
            if (move.r > 0 && sides(move.r - 1, move.c) === 3) return true;
            if (move.r < GRID_SIZE - 1 && sides(move.r, move.c) === 3) return true;
        }
        return false;
    };

    const executeMove = (r: number, c: number, vertical: boolean, isAi = false) => {
        const newHLines = [...hLines.map(row => [...row])];
        const newVLines = [...vLines.map(row => [...row])];

        if (vertical) {
            newVLines[r][c] = currentPlayer;
            setVLines(newVLines);
        } else {
            newHLines[r][c] = currentPlayer;
            setHLines(newHLines);
        }

        const { captured, newBoxes } = checkBoxes(newHLines, newVLines, { r, c, vertical });

        let nextPlayer = currentPlayer;
        let finalBoxes = boxes;

        let newScores = { ...scores };
        let newWinner = winner;

        if (captured) {
            setBoxes(newBoxes);
            finalBoxes = newBoxes;
            const p1Score = newBoxes.flat().filter(b => b === 1).length;
            const p2Score = newBoxes.flat().filter(b => b === 2).length;
            newScores = { 1: p1Score, 2: p2Score };
            setScores(newScores);

            if (p1Score + p2Score === (GRID_SIZE - 1) * (GRID_SIZE - 1)) {
                if (p1Score > p2Score) newWinner = 1;
                else if (p2Score > p1Score) newWinner = 2;
                else newWinner = 0;
                setWinner(newWinner);
            }
            // Player continues turn if captured
        } else {
            nextPlayer = currentPlayer === 1 ? 2 : 1;
            setCurrentPlayer(nextPlayer);
        }

        if (gameMode === 'ONLINE') {
            sendMove({
                hLines: newHLines,
                vLines: newVLines,
                boxes: finalBoxes,
                currentPlayer: nextPlayer,
                scores: newScores,
                winner: newWinner
            });
        }
    };

    const handleLineClick = (r: number, c: number, vertical: boolean) => {
        if (winner !== null) return;
        if (isAiTurn) return;
        if (vertical && vLines[r][c] !== 0) return;
        if (!vertical && hLines[r][c] !== 0) return;

        if (gameMode === 'ONLINE' && !isMyTurn) {
            toast.error("Not your turn!");
            return;
        }

        playSound('click');
        executeMove(r, c, vertical);
    };

    useEffect(() => {
        if (winner !== null) {
            if (winner === 0) {
                toast.info("It's a draw!", { icon: "🤝" });
                playSound('draw');
            } else {
                toast.success(`${winner === 2 && gameMode === 'AI' ? 'AI' : 'Player ' + winner} Wins!`, { icon: "🏆" });
                playSound('win');
                if (!(gameMode === 'AI' && winner === 2)) {
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: winner === 1 ? ['#3b82f6', '#1d4ed8'] : ['#ec4899', '#be185d']
                    });
                }
            }
        }
    }, [winner, gameMode, playSound]);

    const toggleGameMode = () => {
        playSound('click');
        setGameMode(prev => prev === "AI" ? "PVP" : "AI");
        resetGame();
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center py-6 px-4">
            {/* Header */}
            <div className="w-full max-w-2xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 self-start md:self-auto">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/games")} className="hover:bg-slate-200 dark:hover:bg-slate-800">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <HowToPlay
                        title="Dots & Boxes"
                        description="Connect dots to close boxes and score points."
                        rules={[
                            "Players take turns joining dots with lines.",
                            "Complete a square to score and get an extra turn.",
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

            {/* Score Board */}
            <div className="flex gap-4 md:gap-12 mb-8">
                <Card className={`p-4 md:px-8 flex flex-col items-center min-w-[120px] border-2 transition-all duration-300 ${currentPlayer === 1 && !winner ? "border-blue-500 shadow-lg scale-105 ring-2 ring-blue-200" : "border-transparent"}`}>
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full mb-2">
                        <User className="w-6 h-6 text-blue-500" />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                        {gameMode === 'ONLINE' ? (isHost ? 'You' : 'P1') : 'You'}
                    </span>
                    <span className="text-3xl font-black text-blue-500">{scores[1]}</span>
                </Card>
                <div className="flex flex-col justify-center items-center">
                    <span className="text-xs font-bold text-slate-400">VS</span>
                </div>
                <Card className={`p-4 md:px-8 flex flex-col items-center min-w-[120px] border-2 transition-all duration-300 ${currentPlayer === 2 && !winner ? "border-pink-500 shadow-lg scale-105 ring-2 ring-pink-200" : "border-transparent"}`}>
                    <div className="bg-pink-100 dark:bg-pink-900/30 p-2 rounded-full mb-2">
                        {gameMode === 'AI' ? <Cpu className="w-6 h-6 text-pink-500" /> : <User className="w-6 h-6 text-pink-500" />}
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                        {gameMode === 'ONLINE' ? (!isHost ? 'You' : 'P2') : (gameMode === 'AI' ? 'AI' : 'P2')}
                    </span>
                    <span className="text-3xl font-black text-pink-500">{scores[2]}</span>
                </Card>
            </div>

            {/* Game Board */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-8 bg-white dark:bg-card rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] select-none touch-none border border-slate-100 dark:border-slate-800 relative"
            >
                {/* AI Blocker or Online Wait */}
                {(isAiTurn || (gameMode === 'ONLINE' && !isMyTurn)) && !winner && (
                    <div className="absolute inset-0 z-20 cursor-wait bg-transparent" />
                )}

                <div className="flex flex-col">
                    {Array(GRID_SIZE).fill(0).map((_, r) => (
                        <div key={`row-${r}`} className="flex flex-col">
                            {/* Row of Dots and Horizontal Lines */}
                            <div className="flex items-center">
                                {Array(GRID_SIZE).fill(0).map((_, c) => (
                                    <React.Fragment key={`dot-${r}-${c}`}>
                                        <div className="w-4 h-4 rounded-full bg-slate-800 dark:bg-slate-200 z-20 shadow-sm" />
                                        {c < GRID_SIZE - 1 && (
                                            <div
                                                onClick={() => handleLineClick(r, c, false)}
                                                className={`h-4 w-16 cursor-pointer transition-all duration-300 relative group
                                                    ${hLines[r][c] !== 0 ? "z-10" : "z-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"}
                                                `}
                                            >
                                                {hLines[r][c] !== 0 && (
                                                    <motion.div
                                                        initial={{ scaleX: 0 }}
                                                        animate={{ scaleX: 1 }}
                                                        className={`absolute inset-0 h-2 my-1 rounded-full ${hLines[r][c] === 1 ? "bg-blue-500" : "bg-pink-500"}`}
                                                    />
                                                )}
                                                {/* Hover hint logic only if my turn */}
                                                {(gameMode !== 'ONLINE' || isMyTurn) && hLines[r][c] === 0 && !winner && (
                                                    <div className="absolute inset-0 h-2 my-1 rounded-full bg-slate-300 dark:bg-slate-700 opacity-0 group-hover:opacity-50 transition-opacity" />
                                                )}
                                            </div>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>

                            {/* Row of Vertical Lines and Boxes */}
                            {r < GRID_SIZE - 1 && (
                                <div className="flex items-center h-16">
                                    {Array(GRID_SIZE).fill(0).map((_, c) => (
                                        <React.Fragment key={`vline-${r}-${c}`}>
                                            <div
                                                onClick={() => handleLineClick(r, c, true)}
                                                className={`w-4 h-full cursor-pointer transition-all duration-300 relative group -ml-[0.5px]
                                                    ${vLines[r][c] !== 0 ? "z-10" : "z-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"}
                                                `}
                                            >
                                                {vLines[r][c] !== 0 && (
                                                    <motion.div
                                                        initial={{ scaleY: 0 }}
                                                        animate={{ scaleY: 1 }}
                                                        className={`absolute inset-0 w-2 mx-1 rounded-full ${vLines[r][c] === 1 ? "bg-blue-500" : "bg-pink-500"}`}
                                                    />
                                                )}
                                                {/* Hover check */}
                                                {(gameMode !== 'ONLINE' || isMyTurn) && vLines[r][c] === 0 && !winner && (
                                                    <div className="absolute inset-0 w-2 mx-1 rounded-full bg-slate-300 dark:bg-slate-700 opacity-0 group-hover:opacity-50 transition-opacity" />
                                                )}
                                            </div>
                                            {c < GRID_SIZE - 1 && (
                                                <div className="w-16 h-full flex items-center justify-center">
                                                    <AnimatePresence>
                                                        {boxes[r][c] !== 0 && (
                                                            <motion.div
                                                                initial={{ scale: 0, rotate: -45 }}
                                                                animate={{ scale: 1, rotate: 0 }}
                                                                className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm 
                                                                    ${boxes[r][c] === 1 ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-pink-600"}
                                                                `}
                                                                style={{ willChange: "transform" }}
                                                            >
                                                                {boxes[r][c] === 1 ? <User className="w-6 h-6" /> : (gameMode === 'AI' ? <Cpu className="w-6 h-6" /> : <User className="w-6 h-6" />)}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>

            <div className="mt-8 h-12">
                <AnimatePresence mode="wait">
                    {winner !== null ? (
                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-xl font-bold flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-full"
                        >
                            <Trophy className="w-5 h-5 text-yellow-400" />
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
                                    <span className={currentPlayer === 1 ? "text-blue-500 font-bold" : "text-pink-500 font-bold"}>
                                        {gameMode === 'AI' && currentPlayer === 2 ? "AI's" : (currentPlayer === 1 ? "Your" : "P2's")}
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
                            const url = `${window.location.origin}/games/dots-and-boxes?room=${roomId}`;
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

export default DotsAndBoxes;
