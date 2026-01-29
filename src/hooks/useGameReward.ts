import { toast } from "sonner";
import confetti from "canvas-confetti";

interface RewardResponse {
    success: boolean;
    coins?: number;
    message?: string;
    new_balance?: number;
}

export const useGameReward = () => {
    // Simple local reward system (no database dependency)
    const processWin = async (gameKey: string): Promise<number> => {
        try {
            // Get current coins from localStorage
            const currentCoins = parseInt(localStorage.getItem('futora_coins') || '1000', 10);
            
            // Award coins based on game
            const rewardAmount = 10; // Fixed reward for now
            const newBalance = currentCoins + rewardAmount;
            
            // Save to localStorage
            localStorage.setItem('futora_coins', newBalance.toString());

            // Visual Feedback
            toast.success(`+${rewardAmount} Coins!`, {
                description: "Victory Reward",
                duration: 3000,
                className: "bg-yellow-500/10 border-yellow-500/50 text-yellow-500",
                icon: "🪙"
            });

            // Confetti for the win
            confetti({
                particleCount: 30,
                spread: 60,
                origin: { y: 0.7 },
                colors: ['#FFD700', '#FFA500']
            });

            return rewardAmount;
        } catch (e) {
            console.error("Reward System Error:", e);
        }
        return 0;
    };

    return { processWin };
};