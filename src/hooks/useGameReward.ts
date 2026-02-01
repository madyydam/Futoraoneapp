import { useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { walletSupabase } from "@/integrations/supabase/walletClient";
import { toast } from "sonner";
import confetti from 'canvas-confetti';

const REWARD_AMOUNT = 10; // Coins per win

export const useGameReward = () => {
    const triggerWinReward = useCallback(async () => {
        try {
            // Celebrate immediately!
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FFD700', '#FFA500', '#FF4500']
            });

            // 1. Get current user email
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) {
                console.error("Reward Error: No user logged in");
                return;
            }

            // 2. Fetch current wallet
            const { data: wallet, error: fetchError } = await (walletSupabase as any)
                .from("wallets")
                .select("id, balance_paise")
                .eq("email", user.email)
                .single();

            if (fetchError || !wallet) {
                console.error("Reward Error: Wallet not found", fetchError);
                toast.error("Could not sync wallet for reward.");
                return;
            }

            // 3. Update Balance (Add 10 coins = 1000 paise if logic assumes paise, or simple units)
            // Assuming wallet stores "paise" (100 paise = 1 coin) based on 'balance_paise' name.
            // User asked for "10 coins". So 10 * 100 = 1000 paise.
            const rewardInPaise = REWARD_AMOUNT * 100;
            const newBalance = (wallet.balance_paise || 0) + rewardInPaise;

            const { error: updateError } = await (walletSupabase as any)
                .from("wallets")
                .update({ balance_paise: newBalance })
                .eq("id", wallet.id);

            if (updateError) {
                console.error("Reward Error: Could not update balance", updateError);
                toast.error("Failed to deposit coins.");
            } else {
                // 4. Create Transaction Record (Sync with FutoraPay History)
                const { error: txError } = await (walletSupabase as any)
                    .from("transactions")
                    .insert({
                        wallet_id: wallet.id,
                        amount_paise: rewardInPaise,
                        description: "Game Win Reward",
                        type: "reward",
                        side: "CREDIT", // Important for UI to show green
                        category: "game_reward",
                        status: "completed"
                    });

                if (txError) {
                    console.error("Reward Warning: Could not create transaction record", txError);
                    // Don't fail the whole flow if history fails, money is what matters
                }

                toast.success(`You won! +${REWARD_AMOUNT} Coins added to your wallet! 🪙`);
            }

        } catch (err) {
            console.error("Reward Hook Error:", err);
        }
    }, []);

    return { triggerWinReward };
};
