import { memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Rocket, Zap, Heart, Gamepad2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OpportunityCard } from "./OpportunityCard";

interface OpportunitySectionProps {
    onNavigate: (path: string) => void;
}

export const OpportunitySection = memo(({ onNavigate }: OpportunitySectionProps) => {
    const { data: isTechMatchUnlocked = false, refetch } = useQuery({
        queryKey: ['techMatchUnlockStatus'],
        queryFn: async () => {
            const localStatus = localStorage.getItem('techMatchUnlocked');
            if (localStatus === 'true') return true;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            const { data: profile } = await supabase
                .from('profiles')
                .select('is_tech_match_unlocked')
                .eq('id', user.id)
                .single();

            if ((profile as any)?.is_tech_match_unlocked) {
                localStorage.setItem('techMatchUnlocked', 'true');
                return true;
            }

            const { data: wallet } = await (supabase as any).from('native_wallets').select('id').eq('user_id', user.id).single();

            if (wallet) {
                const { data: tx } = await (supabase as any)
                    .from('native_transactions')
                    .select('id')
                    .eq('wallet_id', (wallet as any).id)
                    .ilike('description', '%Unlocked Tech Match%')
                    .limit(1);

                if (tx && tx.length > 0) {
                    localStorage.setItem('techMatchUnlocked', 'true');
                    return true;
                }
            }

            return false;
        },
        staleTime: 1000 * 60 * 5,
        initialData: () => localStorage.getItem('techMatchUnlocked') === 'true',
    });

    const queryClient = useQueryClient();

    const handleTechMatchClick = async () => {
        if (isTechMatchUnlocked) {
            onNavigate('/tech-match');
            return;
        }

        const confirm = window.confirm("Unlock Tech Match for 1000 Coins?");
        if (!confirm) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Please log in.");
                return;
            }

            const { data: wallet, error: walletError } = await (supabase as any)
                .from("native_wallets")
                .select("id, balance")
                .eq("user_id", user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (walletError || !wallet) {
                toast.error("Could not access wallet. Please contact support.");
                return;
            }

            if ((wallet.balance || 0) < 1000) {
                const { data: tx } = await (supabase as any)
                    .from("native_transactions")
                    .select("id")
                    .eq("wallet_id", wallet.id)
                    .ilike("description", "%Unlocked Tech Match%")
                    .limit(1);

                if (tx && tx.length > 0) {
                    await supabase.from('profiles').update({ is_tech_match_unlocked: true } as any).eq('id', user.id);
                    localStorage.setItem('techMatchUnlocked', 'true');
                    await refetch();
                    toast.success("Purchase Verified & Restored! 🔄");
                    return;
                }

                toast.error(`Insufficient Balance. You have ${wallet.balance || 0} coins, need 1000.`);
                return;
            }

            const { error: updateError } = await (supabase as any)
                .from("native_wallets")
                .update({ balance: (wallet.balance || 0) - 1000 })
                .eq("id", wallet.id);

            if (updateError) throw updateError;

            await (supabase as any)
                .from("native_transactions")
                .insert({
                    wallet_id: wallet.id,
                    amount: -1000,
                    description: "Unlocked Tech Match 🔓",
                    type: "payment",
                    status: "completed"
                });

            await supabase
                .from('profiles')
                .update({ is_tech_match_unlocked: true } as any)
                .eq('id', user.id);

            localStorage.setItem('techMatchUnlocked', 'true');

            await Promise.all([
                refetch(),
                queryClient.invalidateQueries({ queryKey: ["native_wallet_v2"] }),
                queryClient.invalidateQueries({ queryKey: ["userProfile"] })
            ]);

            toast.success("Tech Match Unlocked! 🔓");
        } catch (error: any) {
            toast.error(`Unlock failed: ${error.message || error.details || "Unknown error"}`);
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
                    onClick={() => onNavigate('/founders-corner')}
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
                    onClick={() => onNavigate('/gig-marketplace')}
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
                    onClick={() => onNavigate('/games')}
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
