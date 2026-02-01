import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, Download, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const InstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Force show for debugging if URL has ?debug_install=true
        if (window.location.search.includes('debug_install=true')) {
            setIsVisible(true);
        }

        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);

        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

        if (isStandalone) return;

        // Auto-show after 5 seconds
        const autoShowTimer = setTimeout(() => {
            const hasDismissed = localStorage.getItem('pwa-dismissed');
            if (!hasDismissed || (Date.now() - parseInt(hasDismissed) > 86400000)) {
                // For iOS we show instructions, so we can always show if not dismissed
                // For Android we need the prompt
                if (isIOSDevice || window.dispatchEvent(new Event('beforeinstallprompt'))) {
                    setIsVisible(true);
                }
            }
        }, 5000);

        const handler = (e: any) => {
            console.log('PWA: beforeinstallprompt event fired');
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true); // Show automatically when we have the prompt
        };

        window.addEventListener('beforeinstallprompt', handler);

        const showHandler = () => {
            console.log('PWA: Manual show event received');
            setIsVisible(true);
        };
        window.addEventListener('show-pwa-install', showHandler);

        return () => {
            clearTimeout(autoShowTimer);
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('show-pwa-install', showHandler);
        };
    }, []); // Stable effect

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            console.warn('PWA: Install button clicked but deferredPrompt is null');
            // If it's not ready, tell the user to wait or use browser menu
            alert("App installation is not quite ready yet. Please wait a few seconds or use your browser's 'Add to Home Screen' option.");
            return;
        }

        try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`PWA: User choice outcome: ${outcome}`);

            if (outcome === 'accepted') {
                setIsVisible(false);
            }
            setDeferredPrompt(null);
        } catch (err) {
            console.error('PWA: Error during installation:', err);
        }
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 50, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 50, opacity: 0, scale: 0.95 }}
                className="fixed bottom-6 left-4 right-4 z-[100] md:left-auto md:right-6 md:w-[400px]"
            >
                <div className="relative group">
                    {/* Animated Glow Backdrop */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>

                    <div className="relative bg-card/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-5 overflow-hidden">
                        {/* Decorative Background Element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

                        <div className="flex flex-col gap-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="h-14 w-14 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                                            <Download className="h-7 w-7" />
                                        </div>
                                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-ping"></div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-foreground tracking-tight">FutoraOne App</h3>
                                        <p className="text-sm text-muted-foreground font-medium">
                                            {isIOS ? "Install for the premium experience" : "Experience the future of tech social"}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => {
                                        setIsVisible(false);
                                        localStorage.setItem('pwa-dismissed', Date.now().toString());
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="relative px-1">
                                {isIOS ? (
                                    <div className="text-sm text-muted-foreground bg-white/5 rounded-xl p-4 border border-white/5 space-y-3">
                                        <p className="font-semibold text-foreground flex items-center gap-2">
                                            <Share className="h-4 w-4 text-primary" /> How to install:
                                        </p>
                                        <div className="flex flex-col gap-2 pl-1">
                                            <div className="flex items-center gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">1</span>
                                                <p>Tap the <span className="text-foreground font-medium">Share</span> button in Safari</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">2</span>
                                                <p>Select <span className="font-bold text-foreground">Add to Home Screen</span></p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-3 mt-1">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsVisible(false);
                                                localStorage.setItem('pwa-dismissed', Date.now().toString());
                                            }}
                                            className="flex-1 rounded-xl border-white/10 hover:bg-white/5"
                                        >
                                            Maybe Later
                                        </Button>
                                        <Button
                                            onClick={handleInstallClick}
                                            className="flex-[1.5] rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 shadow-lg shadow-primary/20 font-bold group"
                                        >
                                            Install Now
                                            <Download className="ml-2 h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
