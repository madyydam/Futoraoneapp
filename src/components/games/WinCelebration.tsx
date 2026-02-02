import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Coins, Zap } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface WinCelebrationProps {
    isOpen: boolean;
    onClose: () => void;
    coins: number;
    xp: number;
}

export const WinCelebration = ({ isOpen, onClose, coins, xp }: WinCelebrationProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-transparent border-none shadow-none flex items-center justify-center p-0">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 text-center relative overflow-hidden shadow-2xl border-4 border-yellow-400/50"
                        >
                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(234,179,8,0.1)_0%,_transparent_70%)]" />

                            {/* Rotating Rays Effect */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute -top-20 -left-20 w-[400px] h-[400px] opacity-10 bg-[conic-gradient(from_0deg,_transparent,_#eab308,_transparent)] blur-xl pointer-events-none"
                            />

                            <div className="relative z-10 space-y-6">
                                {/* Trophy Icon */}
                                <motion.div
                                    initial={{ y: 20 }}
                                    animate={{ y: 0 }}
                                    transition={{ type: "spring", bounce: 0.6 }}
                                    className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-yellow-500/40 border-4 border-white/20"
                                >
                                    <Trophy className="w-12 h-12 text-white" />
                                </motion.div>

                                <div>
                                    <motion.h2
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="text-4xl font-black bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent uppercase tracking-tighter"
                                    >
                                        Victory!
                                    </motion.h2>
                                    <p className="text-muted-foreground font-medium">You dominated the field!</p>
                                </div>

                                {/* Reward Pills */}
                                <div className="flex gap-3 justify-center">
                                    <motion.div
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="bg-yellow-50 dark:bg-yellow-950/30 px-5 py-3 rounded-2xl border border-yellow-200/50 flex items-center gap-2 shadow-sm"
                                    >
                                        <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-inner">
                                            <Coins className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-yellow-700 dark:text-yellow-500 font-bold uppercase leading-none">Coins</p>
                                            <p className="text-xl font-black text-yellow-900 dark:text-yellow-400">+{coins}</p>
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="bg-blue-50 dark:bg-blue-950/30 px-5 py-3 rounded-2xl border border-blue-200/50 flex items-center gap-2 shadow-sm"
                                    >
                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-inner">
                                            <Zap className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-blue-700 dark:text-blue-500 font-bold uppercase leading-none">XP</p>
                                            <p className="text-xl font-black text-blue-900 dark:text-blue-400">+{xp}</p>
                                        </div>
                                    </motion.div>
                                </div>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="pt-4"
                                >
                                    <Button
                                        onClick={onClose}
                                        className="w-full h-14 text-lg font-bold bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
                                    >
                                        CLAIM REWARDS
                                    </Button>
                                </motion.div>
                            </div>

                            {/* Floating Stars */}
                            {[...Array(5)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute text-yellow-400/30"
                                    animate={{
                                        y: [-10, 10],
                                        opacity: [0.2, 0.5],
                                        scale: [1, 1.2]
                                    }}
                                    transition={{
                                        duration: 2 + i,
                                        repeat: Infinity,
                                        repeatType: "reverse"
                                    }}
                                    style={{
                                        top: `${20 + (i * 15)}%`,
                                        left: `${10 + (i * 20)}%`
                                    }}
                                >
                                    <Star size={16 + (i * 4)} fill="currentColor" />
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
};
