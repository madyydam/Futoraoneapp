import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Trophy, Hash, Zap, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { useGameSounds } from "@/hooks/useGameSounds";
import { HowToPlay } from "@/components/games/HowToPlay";
import { Card } from "@/components/ui/card";
import { useGameReward } from "@/hooks/useGameReward";
import { WinCelebration } from "@/components/games/WinCelebration";

type Tile = number | null;
type Board = Tile[][];

const GRID_SIZE = 4;
const GOAL = 2048;

const NumberMerge = () => {
    const navigate = useNavigate();
    const playSound = useGameSounds();
    const {
        triggerWinReward,
        showRewardModal,
        setShowRewardModal,
        COIN_REWARD,
        XP_REWARD
    } = useGameReward();
    const [board, setBoard] = useState<Board>([]);
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("number_merge_best");
        if (saved) setBestScore(parseInt(saved));
        initGame();

        // Add keyboard controls
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameOver) return;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    move('up');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    move('down');
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    move('left');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    move('right');
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameOver, board]);

    const createEmptyBoard = (): Board => {
        return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    };

    const addRandomTile = (currentBoard: Board): Board => {
        const newBoard = currentBoard.map(row => [...row]);
        const emptyTiles: [number, number][] = [];

        for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
                if (newBoard[i][j] === null) {
                    emptyTiles.push([i, j]);
                }
            }
        }

        if (emptyTiles.length > 0) {
            const [row, col] = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
            newBoard[row][col] = Math.random() < 0.9 ? 2 : 4;
        }

        return newBoard;
    };

    const initGame = () => {
        let newBoard = createEmptyBoard();
        newBoard = addRandomTile(newBoard);
        newBoard = addRandomTile(newBoard);
        setBoard(newBoard);
        setScore(0);
        setGameOver(false);
        setWon(false);
    };

    const move = (direction: 'up' | 'down' | 'left' | 'right') => {
        const newBoard = JSON.parse(JSON.stringify(board)) as Board;
        let moved = false;
        let scoreGained = 0;

        const slide = (row: Tile[]): [Tile[], number] => {
            const filtered = row.filter(v => v !== null);
            const result: Tile[] = [];
            let points = 0;
            let i = 0;

            while (i < filtered.length) {
                if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
                    const merged = (filtered[i]! * 2);
                    result.push(merged);
                    points += merged;

                    if (merged === GOAL && !won) {
                        setWon(true);
                        setTimeout(() => {
                            confetti({
                                particleCount: 200,
                                spread: 100,
                                origin: { y: 0.6 }
                            });
                            toast.success("You reached 2048! 🎉");
                            triggerWinReward();
                        }, 300);
                    }
                    i += 2;
                } else {
                    result.push(filtered[i]!);
                    i++;
                }
            }

            while (result.length < GRID_SIZE) {
                result.push(null);
            }

            return [result, points];
        };

        if (direction === 'left') {
            for (let i = 0; i < GRID_SIZE; i++) {
                const [newRow, points] = slide(newBoard[i]);
                if (JSON.stringify(newRow) !== JSON.stringify(newBoard[i])) moved = true;
                newBoard[i] = newRow;
                scoreGained += points;
            }
        } else if (direction === 'right') {
            for (let i = 0; i < GRID_SIZE; i++) {
                const reversed = [...newBoard[i]].reverse();
                const [newRow, points] = slide(reversed);
                if (JSON.stringify(newRow.reverse()) !== JSON.stringify(newBoard[i])) moved = true;
                newBoard[i] = newRow.reverse();
                scoreGained += points;
            }
        } else if (direction === 'up') {
            for (let j = 0; j < GRID_SIZE; j++) {
                const column = newBoard.map(row => row[j]);
                const [newColumn, points] = slide(column);
                if (JSON.stringify(newColumn) !== JSON.stringify(column)) moved = true;
                for (let i = 0; i < GRID_SIZE; i++) {
                    newBoard[i][j] = newColumn[i];
                }
                scoreGained += points;
            }
        } else if (direction === 'down') {
            for (let j = 0; j < GRID_SIZE; j++) {
                const column = newBoard.map(row => row[j]).reverse();
                const [newColumn, points] = slide(column);
                if (JSON.stringify(newColumn.reverse()) !== JSON.stringify(newBoard.map(row => row[j]))) moved = true;
                const reversedColumn = newColumn.reverse();
                for (let i = 0; i < GRID_SIZE; i++) {
                    newBoard[i][j] = reversedColumn[i];
                }
                scoreGained += points;
            }
        }

        if (moved) {
            playSound('pop');
            const boardWithNewTile = addRandomTile(newBoard);
            setBoard(boardWithNewTile);
            const newScore = score + scoreGained;
            setScore(newScore);

            if (newScore > bestScore) {
                setBestScore(newScore);
                localStorage.setItem("number_merge_best", newScore.toString());
            }

            if (checkGameOver(boardWithNewTile)) {
                setGameOver(true);
                playSound('lose');
                toast.error("Game Over! No more moves.", { icon: "💀" });
                if (score > 100) {
                    triggerWinReward();
                }
            }
        }
    };

    const checkGameOver = (currentBoard: Board): boolean => {
        // Check for empty tiles
        for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
                if (currentBoard[i][j] === null) return false;
            }
        }

        // Check for possible merges
        for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
                const current = currentBoard[i][j];
                if (j < GRID_SIZE - 1 && current === currentBoard[i][j + 1]) return false;
                if (i < GRID_SIZE - 1 && current === currentBoard[i + 1][j]) return false;
            }
        }

        return true;
    };

    const getTileColor = (value: number | null) => {
        if (!value) return "bg-slate-200 dark:bg-slate-800";
        const colors: Record<number, string> = {
            2: "bg-blue-100 text-blue-800",
            4: "bg-blue-200 text-blue-900",
            8: "bg-orange-300 text-white",
            16: "bg-orange-400 text-white",
            32: "bg-orange-500 text-white",
            64: "bg-red-400 text-white",
            128: "bg-yellow-400 text-white",
            256: "bg-yellow-500 text-white",
            512: "bg-green-400 text-white",
            1024: "bg-green-500 text-white",
            2048: "bg-purple-500 text-white",
        };
        return colors[value] || "bg-purple-600 text-white";
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center py-6 px-4">
            <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/games")}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <HowToPlay
                        title="Number Merge (2048)"
                        description="Merge tiles to reach 2048!"
                        rules={[
                            "Use arrow keys or swipe to move tiles.",
                            "When two tiles with the same number touch, they merge!",
                            "Keep merging to reach 2048.",
                            "Game ends when no moves are left."
                        ]}
                    />
                </div>

                <h1 className="text-3xl font-black bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent hidden md:block">Number Merge</h1>

                <Button variant="outline" size="icon" onClick={initGame}>
                    <RotateCcw className="w-5 h-5" />
                </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-4 mb-8">
                <Card className="p-4 bg-white/50 backdrop-blur min-w-[120px]">
                    <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                            <Hash className="w-3 h-3" /> SCORE
                        </div>
                        <div className="text-3xl font-black text-orange-600">{score}</div>
                    </div>
                </Card>
                <Card className="p-4 bg-white/50 backdrop-blur min-w-[120px]">
                    <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                            <Trophy className="w-3 h-3" /> BEST
                        </div>
                        <div className="text-3xl font-black text-yellow-600">{bestScore}</div>
                    </div>
                </Card>
            </div>

            {/* Game Board */}
            <div className="bg-slate-300 dark:bg-slate-800 p-4 rounded-2xl shadow-2xl">
                <div className="grid grid-cols-4 gap-3 w-[320px] md:w-[400px]">
                    {board.map((row, i) =>
                        row.map((tile, j) => (
                            <motion.div
                                key={`${i}-${j}`}
                                initial={{ scale: tile ? 0 : 1 }}
                                animate={{ scale: 1 }}
                                className={`aspect-square rounded-xl flex items-center justify-center font-black text-2xl md:text-3xl shadow-lg transition-all ${getTileColor(tile)}`}
                            >
                                {tile || ""}
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Mobile Controls */}
            <div className="mt-8 md:hidden">
                <div className="grid grid-cols-3 gap-2 w-48">
                    <div></div>
                    <Button size="lg" variant="outline" onClick={() => move('up')} disabled={gameOver}>
                        ↑
                    </Button>
                    <div></div>
                    <Button size="lg" variant="outline" onClick={() => move('left')} disabled={gameOver}>
                        ←
                    </Button>
                    <div></div>
                    <Button size="lg" variant="outline" onClick={() => move('right')} disabled={gameOver}>
                        →
                    </Button>
                    <div></div>
                    <Button size="lg" variant="outline" onClick={() => move('down')} disabled={gameOver}>
                        ↓
                    </Button>
                    <div></div>
                </div>
            </div>

            <p className="text-sm text-muted-foreground mt-4 hidden md:block">Use arrow keys to play</p>

            {/* Game Over / Win Dialog */}
            <AnimatePresence>
                {(gameOver || won) && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={initGame}
                    >
                        <Card className="p-8 max-w-md text-center">
                            {won ? (
                                <>
                                    <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
                                    <h2 className="text-4xl font-black mb-2 text-yellow-600">You Won!</h2>
                                    <p className="text-lg mb-4">You reached 2048!</p>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-4xl font-black mb-2">Game Over!</h2>
                                    <p className="text-lg mb-4">Final Score: {score}</p>
                                </>
                            )}
                            <Button size="lg" onClick={initGame} className="w-full">
                                Play Again
                            </Button>
                        </Card>
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

export default NumberMerge;
