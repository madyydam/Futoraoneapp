import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";

export const CoinRewardPopup = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Check if user has seen the welcome popup using localStorage
        const hasSeenPopup = localStorage.getItem('futora_welcome_popup_seen');
        
        if (!hasSeenPopup) {
            // Show popup for first-time users after a short delay
            const timer = setTimeout(() => {
                setIsOpen(true);
                triggerConfetti();
                localStorage.setItem('futora_welcome_popup_seen', 'true');
            }, 2000);
            
            return () => clearTimeout(timer);
        }
    }, []);

    const triggerConfetti = () => {
        const duration = 3000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#FFD700', '#FFA500', '#FF4500']
            });
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#FFD700', '#FFA500', '#FF4500']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };

        frame();
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md border-none bg-gradient-to-br from-yellow-500/10 to-black text-white p-0 overflow-hidden [&>button]:hidden">
                <div className="relative p-8 flex flex-col items-center justify-center text-center">
                    {/* 3D Coin Animation */}
                    <motion.div
                        initial={{ scale: 0, rotateY: 0 }}
                        animate={{ scale: 1, rotateY: 360 }}
                        transition={{
                            scale: { duration: 0.5, type: "spring" },
                            rotateY: { duration: 2, repeat: Infinity, ease: "linear" }
                        }}
                        className="w-32 h-32 mb-6 relative"
                    >
                        <div className="absolute inset-0 rounded-full bg-yellow-500 blur-2xl opacity-30" />
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 shadow-xl flex items-center justify-center border-4 border-yellow-200">
                            <span className="text-5xl font-bold text-yellow-950">₹1</span>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent mb-2">
                            Welcome to Futora! 🎉
                        </h2>
                        <p className="text-gray-300 mb-6 text-lg">
                            You've earned <span className="font-bold text-white">₹1</span>
                            <br />
                            Converted to <span className="font-bold text-yellow-400">1000 Futora Coins</span> 🪙
                        </p>

                        <div className="bg-white/10 rounded-xl p-4 mb-6 backdrop-blur-sm border border-white/5">
                            <p className="text-sm text-gray-400 mb-2">Use coins to</p>
                            <div className="flex items-center justify-center gap-2">
                                <Coins className="w-4 h-4 text-yellow-400" />
                                <span className="font-semibold">Unlock Premium Features</span>
                            </div>
                        </div>

                        <Button
                            onClick={handleClose}
                            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold text-lg h-12 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                        >
                            Start Exploring 🚀
                        </Button>
                    </motion.div>
                </div>
            </DialogContent>
        </Dialog>
    );
};