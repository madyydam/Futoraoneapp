import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, Download, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const InstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if device is iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);

        // Check if running in standalone mode (already installed)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

        if (isStandalone) return;

        if (isIOSDevice) {
            // Show prompt for iOS after a small delay
            const timer = setTimeout(() => setIsVisible(true), 3000);
            return () => clearTimeout(timer);
        }

        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setIsVisible(false);
        }
        setDeferredPrompt(null);
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
            >
                <div className="bg-popover border border-border shadow-lg rounded-xl p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
                                <Download className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">Install App</h3>
                                <p className="text-xs text-muted-foreground">
                                    {isIOS ? "Install for the best experience" : "Get the full experience"}
                                </p>
                            </div>
                        </div>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setIsVisible(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {isIOS ? (
                        <div className="text-sm text-muted-foreground space-y-2">
                            <p>To install on iOS:</p>
                            <div className="flex items-center gap-2">
                                1. Tap the <Share className="h-4 w-4 inline" /> Share button
                            </div>
                            <div className="flex items-center gap-2">
                                2. Select <span className="font-semibold text-foreground">Add to Home Screen</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-end">
                            <Button size="sm" onClick={handleInstallClick} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                Install
                            </Button>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
