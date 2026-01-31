import React, { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, ExternalLink, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { walletSupabase } from "@/integrations/supabase/walletClient";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export const WalletCard = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: wallet, isLoading } = useQuery({
        queryKey: ["futora_wallet_balance"],
        queryFn: async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || !user.email) return null;

                const { data, error } = await (walletSupabase as any)
                    .from("wallets")
                    .select("id, balance_paise")
                    .ilike("email", user.email.trim())
                    .maybeSingle();

                if (error) {
                    console.error("Fetch Error:", error);
                    return { balance_paise: 0 };
                }
                return data || { balance_paise: 0 };
            } catch (err) {
                return { balance_paise: 0 };
            }
        },
    });

    // Real-time subscription
    useEffect(() => {
        if (!wallet?.id) {
            console.log("Sync: Wallet ID not available yet for subscription");
            return;
        }

        console.log("Sync: Subscribing to wallet updates for ID:", wallet.id);

        const channel = walletSupabase
            .channel('wallet-sync-channel')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'wallets',
                    filter: `id=eq.${wallet.id}`
                },
                (payload) => {
                    console.log("Sync: Real-time update received!", payload);
                    if (payload.new && payload.new.balance_paise !== undefined) {
                        queryClient.setQueryData(["futora_wallet_balance"], payload.new);
                    }
                }
            )
            .subscribe((status, err) => {
                console.log(`Sync: Subscription status for ${wallet.id}:`, status);
                if (err) console.error("Sync: Subscription Error:", err);
            });

        return () => {
            console.log("Sync: Cleaning up subscription for ID:", wallet.id);
            walletSupabase.removeChannel(channel);
        };
    }, [wallet?.id, queryClient]);

    const handleRedirect = () => {
        navigate("/wallet-connect");
    };

    return (
        <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleRedirect}
            className="cursor-pointer"
        >
            <Card className="bg-[#0A0A0A] border-yellow-500/20 hover:border-yellow-500/50 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_30px_rgba(234,179,8,0.1)] overflow-hidden group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/[0.03] via-transparent to-transparent pointer-events-none" />
                <CardContent className="p-5 sm:p-6 flex items-center justify-between relative z-10 gap-4">
                    <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                        <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 p-[1px]">
                            <div className="w-full h-full rounded-2xl bg-[#0F0F0F] flex items-center justify-center">
                                <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-500" />
                            </div>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="font-bold text-white text-base sm:text-lg whitespace-nowrap">Futora Wallet</h3>
                                <ExternalLink className="w-3 h-3 text-yellow-500/40 group-hover:text-yellow-500 transition-colors flex-shrink-0" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                                ) : (
                                    <span className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-yellow-100 via-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                                        {((wallet as any)?.balance_paise / 100 || 0).toLocaleString()}
                                    </span>
                                )}
                                <span className="text-[10px] sm:text-[11px] font-bold text-yellow-500/30 uppercase tracking-[0.2em] whitespace-nowrap">Coins balance</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 text-right flex-shrink-0">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-500/5 border border-yellow-500/10 group-hover:bg-yellow-500/20 group-hover:border-yellow-500/30 transition-all">
                            <span className="text-[9px] sm:text-[10px] font-black text-yellow-500 uppercase tracking-widest px-0.5">Explore</span>
                            <ChevronRight className="w-3 h-3 text-yellow-500" />
                        </div>
                    </div>
                </CardContent>
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
            </Card>
        </motion.div>
    );
};
