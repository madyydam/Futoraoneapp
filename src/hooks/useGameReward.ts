import { useCallback, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from 'canvas-confetti';

const COIN_REWARD = 10; // Coins per win
const XP_REWARD = 50;   // XP per win

export const useGameReward = () => {
    const [showRewardModal, setShowRewardModal] = useState(false);

    const triggerWinReward = useCallback(async () => {
        try {
            // Celebrate immediately!
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.3 },
                colors: ['#FFD700', '#FFA500', '#FF4500']
            });

            // Show the premium centered modal
            setShowRewardModal(true);

            // 1. Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error("Reward Error: No user logged in");
                return;
            }

            // Optimized: Use process_game_win RPC (Handles XP, Wins, Balance, Transactions in one go)
            const { error: rpcError } = await (supabase.rpc as any)('process_game_win', {
                u_id: user.id,
                xp_amt: XP_REWARD,
                coin_amt: COIN_REWARD
            });

            if (rpcError) {
                console.warn("Reward RPC failed, using manual fallback", rpcError);

                // --- FALLBACK LOGIC (Existing manual updates) ---

                // 2. Fetch current wallet
                const { data: wallet } = await (supabase
                    .from("native_wallets" as any)
                    .select("id, balance")
                    .eq("user_id", user.id)
                    .maybeSingle() as any);

                if (wallet) {
                    const newBalance = (wallet.balance || 0) + COIN_REWARD;
                    await (supabase
                        .from("native_wallets" as any)
                        .update({ balance: newBalance })
                        .eq("id", wallet.id) as any);

                    // Log Transaction
                    await (supabase
                        .from("native_transactions" as any)
                        .insert({
                            wallet_id: wallet.id,
                            amount: COIN_REWARD,
                            description: "Game Win Reward 🎮",
                            type: "cashback",
                            status: "completed"
                        }) as any);
                }

                // 3. Update Profile (XP + Wins)
                const { data: profile } = await supabase.from('profiles').select('xp, total_wins').eq('id', user.id).single() as any;
                const newWinCount = (profile?.total_wins || 0) + 1;

                await supabase
                    .from("profiles")
                    .update({
                        xp: (profile?.xp || 0) + XP_REWARD,
                        total_wins: newWinCount,
                        last_activity_date: new Date().toISOString()
                    } as any)
                    .eq('id', user.id);

                // --- END FALLBACK ---
            }

            // Achievement Checks (Still checking locally for immediate feedback)
            const { data: profileStats } = await supabase.from('profiles').select('total_wins').eq('id', user.id).single() as any;
            const finalWinCount = profileStats?.total_wins || 0;

            if (finalWinCount === 10) {
                await (supabase.rpc as any)('unlock_achievement', { ach_id: 'game_wizard' });
                toast.success("New Achievement: Game Wizard! 🧙‍♂️");
            }

            // ... existing achievement logic ...

            // 4. Force refresh of any leaderboard components
            window.dispatchEvent(new CustomEvent('leaderboard-update'));

        } catch (err) {
            console.error("Reward Hook Error:", err);
            toast.error("An error occurred while processing rewards.");
        }
    }, [setShowRewardModal]);

    return {
        triggerWinReward,
        showRewardModal,
        setShowRewardModal,
        COIN_REWARD,
        XP_REWARD
    };
};
