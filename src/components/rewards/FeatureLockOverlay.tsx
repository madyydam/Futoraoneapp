import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lock, Coins, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FeatureLockOverlayProps {
    children: React.ReactNode;
    featureName: string;
}

export const FeatureLockOverlay = ({ children, featureName }: FeatureLockOverlayProps) => {
    const [isUnlocked, setIsUnlocked] = useState<boolean>(true); // Default to unlocked for now
    const [isLoading, setIsLoading] = useState(false);
    const [requiredCoins] = useState<number>(1000);
    const { toast } = useToast();

    useEffect(() => {
        // Check localStorage for unlock status (simple implementation without DB)
        const unlockedFeatures = JSON.parse(localStorage.getItem('futora_unlocked_features') || '[]');
        setIsUnlocked(unlockedFeatures.includes(featureName) || true); // Default unlocked
    }, [featureName]);

    const handleUnlock = async () => {
        setIsLoading(true);
        
        // Simulate unlock process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Save to localStorage
        const unlockedFeatures = JSON.parse(localStorage.getItem('futora_unlocked_features') || '[]');
        unlockedFeatures.push(featureName);
        localStorage.setItem('futora_unlocked_features', JSON.stringify(unlockedFeatures));
        
        setIsUnlocked(true);
        toast({
            title: "Feature Unlocked! 🔓",
            description: "You have successfully unlocked this premium feature.",
            className: "bg-green-500 text-white border-none",
        });
        
        setIsLoading(false);
    };

    if (isUnlocked) {
        return <>{children}</>;
    }

    return (
        <div className="relative w-full h-full min-h-[50vh]">
            <AnimatePresence>
                {!isUnlocked && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-xl p-6"
                    >
                        <div className="max-w-md w-full text-center space-y-6">
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-20 h-20 mx-auto bg-gray-900 rounded-full flex items-center justify-center border-2 border-white/10"
                            >
                                <Lock className="w-10 h-10 text-gray-400" />
                            </motion.div>

                            <div>
                                <h2 className="text-2xl font-bold mb-2">Premium Feature Locked</h2>
                                <p className="text-muted-foreground">
                                    Unlock this feature with your earned coins.
                                </p>
                            </div>

                            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4">
                                <div className="text-sm text-yellow-500 uppercase font-bold tracking-wider mb-1">Unlock Cost</div>
                                <div className="text-3xl font-bold text-white flex items-center justify-center gap-2">
                                    <Coins className="text-yellow-500" /> {requiredCoins}
                                </div>
                            </div>

                            <Button
                                onClick={handleUnlock}
                                disabled={isLoading}
                                className="w-full h-12 text-lg font-bold bg-white text-black hover:bg-white/90"
                            >
                                {isLoading ? <Loader2 className="animate-spin mr-2" /> : 'Unlock Now'}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={!isUnlocked ? 'filter blur-sm pointer-events-none select-none h-full overflow-hidden' : ''}>
                {children}
            </div>
        </div>
    );
};