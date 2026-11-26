import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useAuth } from "@/hooks/useAuth";

const COIN_REWARD = 10;
const XP_REWARD = 50;

export const useGameReward = (gameKey = "arcade") => {
  const [showRewardModal, setShowRewardModal] = useState(false);
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  const triggerWinReward = useCallback(async () => {
    try {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.3 },
        colors: ["#FFD700", "#FFA500", "#FF4500"],
      });

      setShowRewardModal(true);

      if (!userId) {
        toast.error("Please log in to claim game rewards.");
        return;
      }

      const { data, error: rpcError } = await (supabase.rpc as any)("process_game_win", {
        p_game_key: gameKey,
        p_idempotency_key: crypto.randomUUID(),
      });

      if (rpcError) {
        throw rpcError;
      }

      const result = data as { total_wins?: number } | null;
      if (result?.total_wins === 10) {
        toast.success("New Achievement: Game Wizard! 🧙‍♂️");
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["native_wallet_v2", userId] }),
        queryClient.invalidateQueries({ queryKey: ["native_transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["userProfile", userId] }),
      ]);

      window.dispatchEvent(new CustomEvent("leaderboard-update"));
    } catch (err) {
      console.error("Reward Hook Error:", err);
      toast.error(err instanceof Error ? err.message : "Could not process game reward.");
    }
  }, [gameKey, queryClient, userId]);

  return {
    triggerWinReward,
    showRewardModal,
    setShowRewardModal,
    COIN_REWARD,
    XP_REWARD,
  };
};
