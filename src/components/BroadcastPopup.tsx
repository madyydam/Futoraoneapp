import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Megaphone, ArrowRight, Star, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBroadcastPopup } from "@/hooks/useBroadcastPopup";

export const BroadcastPopup = () => {
    const { popup, markAsSeen } = useBroadcastPopup();

    if (!popup) return null;

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'feature_launch':
                return {
                    icon: <Star className="w-6 h-6" />,
                    color: "from-purple-600 to-indigo-600",
                    shadow: "shadow-purple-200",
                    bg: "bg-purple-50",
                    text: "text-purple-600",
                    cta: "Explore New Feature"
                };
            case 'announcement':
                return {
                    icon: <Megaphone className="w-6 h-6" />,
                    color: "from-blue-600 to-cyan-600",
                    shadow: "shadow-blue-200",
                    bg: "bg-blue-50",
                    text: "text-blue-600",
                    cta: "Got it, thanks!"
                };
            default:
                return {
                    icon: <ShieldCheck className="w-6 h-6" />,
                    color: "from-emerald-600 to-teal-600",
                    shadow: "shadow-emerald-200",
                    bg: "bg-emerald-50",
                    text: "text-emerald-600",
                    cta: "Okay"
                };
        }
    };

    const styles = getTypeStyles(popup.type);

    return (
        <AnimatePresence>
            {popup && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto"
                        onClick={() => markAsSeen(popup.id)}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl pointer-events-auto border border-slate-100"
                    >
                        {/* Header Gradient */}
                        <div className={`h-24 bg-gradient-to-r ${styles.color} relative overflow-hidden`}>
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    rotate: [0, 10, -10, 0]
                                }}
                                transition={{ duration: 10, repeat: Infinity }}
                                className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-black/20">
                                    <div className={styles.text}>{styles.icon}</div>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8 pt-6 space-y-6 text-center">
                            <div className="space-y-2">
                                {popup.title && (
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                                        {popup.title}
                                    </h3>
                                )}
                                <p className="text-slate-500 font-medium text-lg leading-relaxed px-2">
                                    {popup.message}
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={() => markAsSeen(popup.id)}
                                    className={`w-full h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-lg shadow-xl ${styles.shadow} transition-all active:scale-95 group flex items-center justify-center gap-2`}
                                >
                                    {styles.cta} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                                <button
                                    onClick={() => markAsSeen(popup.id)}
                                    className="text-slate-400 hover:text-slate-600 font-bold text-sm uppercase tracking-widest transition-colors py-2"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>

                        {/* Close button (top right) */}
                        <button
                            onClick={() => markAsSeen(popup.id)}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 text-white flex items-center justify-center transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
