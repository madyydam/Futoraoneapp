import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, ExternalLink, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface WalletCardProps {
    customBalance?: number;
}

export const WalletCard = ({ customBalance }: WalletCardProps) => {
    const navigate = useNavigate();

    const { data: walletData, isLoading } = useQuery({
        queryKey: ["native_wallet_v2"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from('native_wallets')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error("Wallet Card Error:", error);
                return null;
            }

            return data;
        },
        enabled: customBalance === undefined,
    });

    const balance = customBalance !== undefined ? customBalance : walletData?.balance;

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
                            </div>

                            <div className="flex items-baseline gap-2 mt-0.5">
                                {isLoading ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
                                ) : (
                                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 filter drop-shadow-sm">
                                        {(balance || 0).toLocaleString()}
                                    </span>
                                )}
                                <span className="text-xs font-bold text-yellow-500/40">COINS</span>
                            </div>
                        </div>
                    </div>

                    {/* Action */}
                    <div className="flex flex-col items-end gap-2">
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
