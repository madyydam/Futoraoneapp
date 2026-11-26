import { memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Rocket, Zap, Heart, Gamepad2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OpportunityCard } from "./OpportunityCard";
import { useAuth } from "@/hooks/useAuth";

interface OpportunitySectionProps {
  onNavigate: (path: string) => void;
}

export const OpportunitySection = memo(({ onNavigate }: OpportunitySectionProps) => {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  const { data: isTechMatchUnlocked = false, refetch } = useQuery({
    queryKey: ["techMatchUnlockStatus", userId],
    queryFn: async () => {
      if (!userId) return false;

      const [profileRes, unlockRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("is_tech_match_unlocked")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("user_feature_unlocks" as never)
          .select("id")
          .eq("user_id", userId)
          .eq("feature_name", "tech_match")
          .maybeSingle(),
      ]);

      return Boolean(
        (profileRes.data as { is_tech_match_unlocked?: boolean } | null)?.is_tech_match_unlocked ||
          unlockRes.data
      );
    },
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
  });

  const handleTechMatchClick = async () => {
    if (isTechMatchUnlocked) {
      onNavigate("/tech-match");
      return;
    }

    if (!userId) {
      toast.error("Please log in first.");
      onNavigate("/auth");
      return;
    }

    const confirm = window.confirm("Unlock Tech Match for 1,000 Coins?");
    if (!confirm) return;

    try {
      const { error } = await (supabase.rpc as any)("unlock_feature", {
        p_feature_name: "tech_match",
        p_idempotency_key: crypto.randomUUID(),
      });

      if (error) throw error;

      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ["native_wallet_v2", userId] }),
        queryClient.invalidateQueries({ queryKey: ["native_transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["userProfile", userId] }),
      ]);

      toast.success("Tech Match Unlocked! 🔓");
      onNavigate("/tech-match");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unlock failed");
    }
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-green-600 bg-clip-text text-transparent">
          Opportunities Hub
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <OpportunityCard
          title="Founders Corner"
          description="Find your perfect co-founder or join the next unicorn."
          icon={Rocket}
          gradient="bg-gradient-to-r from-orange-500 to-pink-600 text-white"
          onClick={() => onNavigate("/founders-corner")}
          buttonText="Find Matches"
          buttonVariant="secondary"
          buttonClassName="font-semibold text-pink-600 hover:text-pink-700"
          delay={0.1}
          id="opportunity-section"
        />
        <OpportunityCard
          title="Gig Market"
          description="Find micro-gigs, freelance tasks, and earn while you learn."
          icon={Zap}
          gradient="bg-gradient-to-r from-yellow-400 to-green-500 text-black"
          onClick={() => onNavigate("/gig-marketplace")}
          buttonText="Find Gigs"
          buttonClassName="font-bold bg-white text-green-700 hover:bg-white/90 border-0"
          delay={0.2}
          id="gigs-section"
        />
        <OpportunityCard
          title="Tech Match"
          description="Find your player 2. Date other devs."
          icon={Heart}
          gradient="bg-gradient-to-r from-pink-500 to-rose-500 text-white"
          onClick={handleTechMatchClick}
          buttonText={isTechMatchUnlocked ? "Connect" : "Unlock"}
          buttonVariant="secondary"
          buttonClassName="font-bold text-rose-600 hover:text-rose-700"
          delay={0.3}
          isLocked={!isTechMatchUnlocked}
          id="tech-match-card"
        />
        <OpportunityCard
          title="Game Zone"
          description="Play multiplayer games with friends."
          icon={Gamepad2}
          gradient="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
          onClick={() => onNavigate("/games")}
          buttonText="Play Now"
          buttonVariant="secondary"
          buttonClassName="font-bold text-indigo-600 hover:text-indigo-700"
          delay={0.4}
          id="game-zone-card"
        />
      </div>
    </section>
  );
});

OpportunitySection.displayName = "OpportunitySection";
