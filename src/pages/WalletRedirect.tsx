import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, ArrowRight, Mail, ShieldCheck, ExternalLink, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CartoonLoader } from "@/components/CartoonLoader";

const WalletRedirect = () => {
    const navigate = useNavigate();
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getEmail = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || null);
            }
            setLoading(false);
        };
        getEmail();
    }, []);

    const handleContinue = () => {
        window.open("https://futorawallet.vercel.app/", "_blank", "noopener,noreferrer");
    };

    if (loading) return <CartoonLoader />;

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col p-4 sm:p-6 overflow-hidden relative">
            {/* Background Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-yellow-500/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-yellow-600/5 blur-[100px] rounded-full pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 mb-8 flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(-1)}
                    className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-2xl"
                >
                    <ChevronLeft className="w-6 h-6" />
                </Button>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-white/5 border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Secure Sync</span>
                </div>
            </div>

            <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center relative z-10 pb-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] bg-gradient-to-br from-yellow-300 to-yellow-600 p-[1px] mb-8 shadow-[0_0_50px_rgba(234,179,8,0.2)]">
                        <div className="w-full h-full rounded-[31px] bg-[#0A0A0A] flex items-center justify-center">
                            <Wallet className="w-10 h-10 text-yellow-500" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-black mb-4 tracking-tight">
                        Futora <span className="bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 bg-clip-text text-transparent">Wallet</span>
                    </h1>
                    <p className="text-zinc-400 text-lg">Your universal gateway to digital assets and rewards.</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="bg-[#0A0A0A]/50 border-white/5 backdrop-blur-xl overflow-hidden mb-6 rounded-[24px]">
                        <CardContent className="p-0">
                            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                                        <ShieldCheck className="w-5 h-5 text-yellow-500" />
                                    </div>
                                    <h2 className="font-bold text-lg">Sync Instructions</h2>
                                </div>
                                <p className="text-sm text-zinc-400 leading-relaxed italic">
                                    "To see your coins on both platforms, you MUST use the same account details."
                                </p>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-yellow-500/60 ml-1">Current Account Email</label>
                                    <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white/5 border border-white/10 group hover:border-white/20 transition-all">
                                        <Mail className="w-5 h-5 text-zinc-500 group-hover:text-yellow-500 transition-colors" />
                                        <span className="font-medium text-zinc-200">{userEmail || "Not logged in"}</span>
                                    </div>
                                </div>

                                <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-2xl p-4 flex gap-4 items-start">
                                    <div className="mt-1 w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-[10px] font-bold text-yellow-500">i</span>
                                    </div>
                                    <p className="text-xs text-yellow-500/80 leading-relaxed font-medium">
                                        Use this email to sign up or log in on <span className="font-bold text-yellow-500">futorawallet.vercel.app</span> to sync your existing coin balance.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Button
                        onClick={handleContinue}
                        className="w-full h-16 rounded-[20px] bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-black text-lg hover:shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:scale-[1.02] transition-all group flex items-center justify-center gap-3"
                    >
                        CONNECT WALLET
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </motion.div>

                <p className="text-center mt-6 text-[11px] text-zinc-600 font-medium tracking-wide">
                    SECURED BY FUTORA ENCRYPTION PROTOCOL
                </p>
            </div>
        </div>
    );
};

export default WalletRedirect;
