import React, { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, ExternalLink, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { walletSupabase } from "@/integrations/supabase/walletClient";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export const WalletCard = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: wallet, isLoading } = useQuery({
        queryKey: ["futora_wallet_balance"],
        queryFn: async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || !user.email) {
                    console.log("Wallet Sync: No user or email found", user);
                    return null;
                }

                console.log("Wallet Sync: Fetching for email", user.email);

                const { data, error } = await (walletSupabase as any)
                    .from("wallets")
                    .select("id, balance_paise")
                    .ilike("email", user.email.trim())
                    .maybeSingle();

                if (error) {
                    console.error("Wallet Sync: Fetch Error:", error);
                    return { balance_paise: 0 };
                }

                console.log("Wallet Sync: Data received:", data);
                return data || { balance_paise: 0 };
            } catch (err) {
                return { balance_paise: 0 };
            }
        },
    });

    // Real-time subscription
    useEffect(() => {
        if (!wallet?.id) {
            return;
        }


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
                    if (payload.new && payload.new.balance_paise !== undefined) {
                        queryClient.setQueryData(["futora_wallet_balance"], payload.new);
                    }
                }
            )
            .subscribe((status, err) => {
                if (err) console.error("Sync: Subscription Error:", err);
            });

        return () => {
            walletSupabase.removeChannel(channel);
        };
    }, [wallet?.id, queryClient]);

    const handleRefresh = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await queryClient.invalidateQueries({ queryKey: ["futora_wallet_balance"] });
        // Optionally toast
    };

    const handleRedirect = () => {
        navigate("/wallet");
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleRedirect}
            className="cursor-pointer group relative z-10 my-6"
        >
            <Card className="relative overflow-hidden border border-yellow-500/20 dark:border-yellow-500/30 shadow-lg shadow-yellow-500/5 hover:shadow-yellow-500/20 transition-all duration-300 bg-gradient-to-br from-[#1a1500] to-[#0a0a0a] dark:from-[#1a1500] dark:to-[#050505]">

                {/* Decorative Background */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-[50px] rounded-full pointer-events-none" />

                <CardContent className="p-5 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                        {/* Icon Container */}
                        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 p-[1px] shadow-inner">
                            <div className="w-full h-full rounded-2xl bg-[#0F0F0F] flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-yellow-500/10" />
                                <Wallet className="w-7 h-7 text-yellow-500 drop-shadow-md" />
                            </div>
                        </div>

                        {/* Balance Info */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium text-yellow-500/80 uppercase tracking-widest">Futora Wallet</h3>
                                <ExternalLink className="w-3 h-3 text-yellow-500/50 group-hover:text-yellow-400 transition-colors" />
                            </div>

                            <div className="flex items-baseline gap-2 mt-0.5">
                                {isLoading ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
                                ) : (
                                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 filter drop-shadow-sm">
                                        {((wallet as any)?.balance_paise / 100 || 0).toLocaleString()}
                                    </span>
                                )}
                                <span className="text-xs font-bold text-yellow-500/40">COINS</span>
                            </div>
                        </div>
                    </div>

                    {/* Action / Refresh */}
                    <div className="flex flex-col items-end gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRefresh}
                            className="w-8 h-8 rounded-full text-yellow-500/50 hover:text-yellow-500 hover:bg-yellow-500/10"
                        >
                            <Loader2 className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        </Button>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-500 group-hover:translate-x-1 transition-transform">
                            <span>Manage</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                    </div>
                </CardContent>

                {/* Bottom Highlight */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
            </Card>
        </motion.div>
    );
};
