import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Plus, Scan, Wallet as WalletIcon, MoreHorizontal, CreditCard, User, History, Zap, Lock, Eye, EyeOff, Copy, MapPin, Github, Linkedin, Instagram, Globe, Shield, QrCode, Settings, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// --- Types ---
interface WalletData {
    id: string;
    balance: number;
    currency: string;
}

interface Transaction {
    id: string;
    type: 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'cashback';
    amount: number;
    description: string;
    created_at: string;
    status: 'completed' | 'pending' | 'failed';
}

interface ProfileData {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
    location: string | null;
    github_url: string | null;
    linkedin_url: string | null;
    instagram_url: string | null;
    portfolio_url: string | null;
    banner_url: string | null;
    theme_color: string | null;
}

// --- Memoized Sub-Components ---

const QuickAction = React.memo(({ icon: Icon, label, color = "bg-zinc-800", onClick }: { icon: any, label: string, color?: string, onClick?: () => void }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group">
        <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform shadow-lg shadow-black/50`}>
            <Icon className="w-6 h-6 text-white" />
        </div>
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</span>
    </button>
));
QuickAction.displayName = "QuickAction";

const TransactionItem = React.memo(({ tx }: { tx: Transaction }) => {
    const isCredit = ['deposit', 'cashback'].includes(tx.type);
    return (
        <div className="flex items-center justify-between p-4 bg-card/30 backdrop-blur-md rounded-2xl border border-white/5 mb-2 hover:bg-card/50 transition-colors">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCredit ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {isCredit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div>
                    <p className="font-bold text-sm text-white">{tx.description}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
            </div>
            <span className={`font-black tracking-tight ${isCredit ? 'text-emerald-400' : 'text-white'}`}>
                {isCredit ? '+' : '-'} ₹{Math.abs(tx.amount).toLocaleString()}
            </span>
        </div>
    );
});
TransactionItem.displayName = "TransactionItem";

// --- Main Component ---
export default function Wallet() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("home");
    const [loading, setLoading] = useState(true);
    const [showBalance, setShowBalance] = useState(true);

    // Get current user once
    const { data: user } = useQuery({
        queryKey: ["auth_user"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        }
    });

    // --- Data Fetching ---
    const { data: walletData, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
        queryKey: ["native_wallet_v2", user?.id],
        queryFn: async () => {
            if (!user) return null;

            // @ts-ignore
            const { data: walletRecordRaw, error } = await supabase
                .from('native_wallets')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            let walletRecord = walletRecordRaw;

            // Auto-create wallet if missing (Welcome Bonus Logic)
            if (!walletRecord) {
                console.log("Creating new wallet...");
                // @ts-ignore
                const { data: newWallet, error: createError } = await supabase
                    .from('native_wallets')
                    .insert([{ user_id: user.id, balance: 1000.00 }])
                    .select()
                    .single();

                if (createError) throw createError;
                walletRecord = newWallet;

                if (newWallet) {
                    // @ts-ignore
                    await supabase.from('native_transactions').insert({
                        wallet_id: newWallet.id,
                        type: 'cashback',
                        amount: 1000.00,
                        description: 'Welcome Bonus 🎁',
                        status: 'completed'
                    });
                }
            }
            return walletRecord as unknown as WalletData;
        },
        enabled: !!user
    });

    const { data: transactionsData, isLoading: txLoading } = useQuery({
        queryKey: ["native_transactions", walletData?.id],
        queryFn: async () => {
            if (!walletData?.id) return [];
            // @ts-ignore
            const { data } = await supabase
                .from('native_transactions')
                .select('*')
                .eq('wallet_id', walletData.id)
                .order('created_at', { ascending: false })
                .limit(10);
            return (data || []) as unknown as Transaction[];
        },
        enabled: !!walletData?.id
    });

    const { data: profile } = useQuery({
        queryKey: ["user_profile_wallet", user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            return data as unknown as ProfileData;
        },
        enabled: !!user
    });

    useEffect(() => {
        if (walletLoading || txLoading) return;
        setLoading(false);
    }, [walletLoading, txLoading]);

    const currentWallet = walletData;
    const transactions = transactionsData || [];

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-cyan-500/30">

            {/* --- Top Navbar --- */}
            <div className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-white/10">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-sm font-black tracking-widest uppercase text-cyan-400">FutoraPay</h1>
                        <p className="text-[10px] text-muted-foreground font-bold">Good Evening</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10">
                        <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10">
                        <MoreHorizontal className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 p-4 pb-24 max-w-md mx-auto w-full space-y-6">

                {/* --- Tabs Navigation --- */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

                    <AnimatePresence mode="wait">

                        {/* === HOME TAB === */}
                        <TabsContent value="home" className="space-y-6 mt-0">
                            {/* Balance Card */}
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-600 to-purple-600 rounded-[2rem] opacity-20 blur-xl"></div>
                                <Card className="bg-[#0A0A0A] border-white/10 rounded-[2rem] overflow-hidden relative shadow-2xl">
                                    <CardContent className="p-8 relative z-10">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Total Balance</span>
                                            <button onClick={() => setShowBalance(!showBalance)} className="text-muted-foreground hover:text-white transition-colors">
                                                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <div className="mb-6">
                                            {loading ? (
                                                <Skeleton className="h-12 w-48 bg-white/10 rounded-lg" />
                                            ) : (
                                                <h2 className="text-5xl font-black text-white tracking-tighter">
                                                    {showBalance ? `₹${(currentWallet?.balance || 0).toLocaleString()}` : "••••••"}
                                                </h2>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                                                ▲ 12.5% vs last month
                                            </span>
                                            <div className="w-10 h-10 bg-gradient-to-tr from-cyan-400 to-purple-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(6,182,212,0.5)]"></div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Quick Actions */}
                            <div className="flex justify-between items-start px-2">
                                <QuickAction
                                    icon={ArrowUpRight}
                                    label="Send"
                                    color="bg-gradient-to-b from-cyan-500 to-blue-600 border-none"
                                    onClick={() => setActiveTab("transfer")}
                                />
                                <QuickAction icon={ArrowDownLeft} label="Receive" />
                                <QuickAction icon={Plus} label="Top Up" />
                                <QuickAction icon={Scan} label="Scan" />
                            </div>



                            {/* Recent Transactions */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Recent Activity</h3>
                                    <Button variant="link" className="text-cyan-400 text-xs font-bold">See All</Button>
                                </div>
                                {transactions?.length > 0 ? (
                                    transactions.map(tx => <TransactionItem key={tx.id} tx={tx} />)
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground text-xs">No transactions yet</div>
                                )}
                            </div>
                        </TabsContent>

                        {/* === TRANSFER TAB === */}
                        <TabsContent value="transfer" className="mt-0">
                            <Card className="bg-[#0A0A0A] border-white/10 min-h-[60vh] rounded-[2rem] p-6">
                                <div className="text-center mb-8">
                                    <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-1">FutoraPay</h2>
                                    <h3 className="text-white text-lg font-black">Transfer Money</h3>
                                </div>

                                <div className="flex justify-center mb-8">
                                    <TabsList className="bg-white/5 border border-white/10 rounded-full h-12 p-1">
                                        <TabsTrigger value="send" className="rounded-full px-6 h-full data-[state=active]:bg-cyan-500 data-[state=active]:text-black font-bold text-xs uppercase cursor-default">Send</TabsTrigger>
                                        <TabsTrigger value="req" className="rounded-full px-6 h-full data-[state=active]:bg-cyan-500 data-[state=active]:text-black font-bold text-xs uppercase cursor-default opacity-50">Request</TabsTrigger>
                                    </TabsList>
                                </div>

                                <div className="text-center mb-10">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 block">Enter Amount</label>
                                    <div className="relative inline-block">
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-black text-cyan-500">₹</span>
                                        <Input
                                            type="number"
                                            className="text-6xl font-black bg-transparent border-none text-center w-full pl-8 focus-visible:ring-0 p-0 h-auto placeholder:text-white/10"
                                            placeholder="0"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2 mb-8">
                                    {[100, 500, 1000, 2000].map(amt => (
                                        <Button key={amt} variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-500/50 rounded-xl font-bold">₹{amt}</Button>
                                    ))}
                                </div>

                                <Input
                                    placeholder="Search name, UPI ID..."
                                    className="bg-white/5 border-white/10 rounded-xl h-12 px-4 mb-4 text-center font-medium"
                                />

                                <Button className="w-full h-14 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-black tracking-widest uppercase shadow-lg shadow-cyan-900/20">
                                    Proceed to Pay
                                </Button>
                            </Card>
                        </TabsContent>

                        {/* === CARDS TAB === */}
                        <TabsContent value="cards" className="mt-0 space-y-8">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-2xl font-black text-white">My Cards</h2>
                                <Button size="icon" className="rounded-full bg-white/10 hover:bg-white/20"><Plus className="w-5 h-5" /></Button>
                            </div>

                            {/* Virtual Card Visual */}
                            <motion.div
                                initial={{ rotateY: 90, opacity: 0 }}
                                animate={{ rotateY: 0, opacity: 1 }}
                                className="aspect-[1.586/1] w-full rounded-[1.5rem] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 p-6 relative overflow-hidden shadow-2xl shadow-cyan-900/20"
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -mr-16 -mt-16"></div>
                                <div className="relative z-10 flex flex-col justify-between h-full">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-white font-heavy italic tracking-tighter text-lg">FutoraPay</h3>
                                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Personal Card</p>
                                        </div>
                                        <span className="px-2 py-1 bg-white/20 rounded-md text-[10px] font-bold text-white backdrop-blur-md">Active</span>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="font-mono text-2xl font-bold text-white tracking-widest drop-shadow-md">
                                            4532 •••• •••• 1801
                                        </p>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[8px] text-white/60 font-bold uppercase mb-1">Card Holder</p>
                                                <p className="text-sm font-bold text-white uppercase tracking-wider">{currentWallet?.id ? "MADHUR" : "GUEST"}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] text-white/60 font-bold uppercase mb-1">Expires</p>
                                                <p className="text-sm font-bold text-white font-mono">12/28</p>
                                            </div>
                                            <div className="h-8 w-12 bg-white/20 rounded flex items-center justify-center">
                                                <div className="w-6 h-6 border-2 border-white/50 rounded-full flex items-center justify-center"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Card Controls */}
                            <div className="grid grid-cols-4 gap-4">
                                {[
                                    { icon: Eye, label: "Show" },
                                    { icon: Copy, label: "Copy" },
                                    { icon: Lock, label: "Freeze" },
                                    { icon: User, label: "Settings" },
                                ].map((item, i) => (
                                    <button key={i} className="flex flex-col items-center gap-2 group">
                                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                            <item.icon className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground">{item.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Card Settings</h3>
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-500"><Zap className="w-4 h-4" /></div>
                                        <div>
                                            <p className="text-sm font-bold text-white">Online Transactions</p>
                                            <p className="text-[10px] text-muted-foreground">Enabled for all merchants</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* === PROFILE TAB === */}
                        <TabsContent value="profile" className="mt-0 space-y-6">
                            {/* Profile Header Card */}
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <Card className="bg-[#0A0A0A] border-white/10 rounded-[2rem] overflow-hidden relative shadow-2xl">
                                    <div
                                        className="h-24 w-full bg-cover bg-center opacity-40"
                                        style={{
                                            backgroundImage: profile?.banner_url ? `url(${profile.banner_url})` : undefined,
                                            backgroundColor: profile?.theme_color || '#1e1b4b'
                                        }}
                                    >
                                        {!profile?.banner_url && !profile?.theme_color && <div className="absolute inset-0 bg-gradient-to-r from-cyan-900 to-purple-900" />}
                                    </div>
                                    <CardContent className="px-6 pb-6 pt-0 -mt-10 relative z-10">
                                        <div className="flex items-end justify-between mb-4">
                                            <div className="relative">
                                                <Avatar className="h-24 w-24 border-4 border-[#0A0A0A] shadow-xl">
                                                    <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                                                    <AvatarFallback className="bg-zinc-800 text-cyan-400 text-2xl font-black">
                                                        {profile?.full_name?.[0] || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="absolute bottom-1 right-1 bg-emerald-500 w-5 h-5 rounded-full border-4 border-[#0A0A0A]" />
                                            </div>
                                            <div className="flex gap-2 mb-2">
                                                <Button variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/10 h-10 w-10">
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/10 h-10 w-10">
                                                    <QrCode className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-2xl font-black text-white tracking-tight">{profile?.full_name}</h2>
                                                <Shield className="w-5 h-5 text-cyan-500 fill-cyan-500/20" />
                                            </div>
                                            <p className="text-cyan-500/80 font-bold text-sm">@{profile?.username}</p>
                                        </div>

                                        {profile?.bio && (
                                            <p className="text-zinc-400 text-xs mt-3 leading-relaxed font-medium">
                                                {profile.bio}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-4 mt-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span>{profile?.location || "India"}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Zap className="w-3.5 h-3.5 text-yellow-500" />
                                                <span>Trust Score: 98</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Social Connectivity */}
                            <div className="grid grid-cols-2 gap-3">
                                <Card className="bg-white/5 border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-colors cursor-pointer group">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                                        <Github className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">GitHub</p>
                                        <p className="text-xs font-bold text-white">Connected</p>
                                    </div>
                                </Card>
                                <Card className="bg-white/5 border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-colors cursor-pointer group">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                                        <Linkedin className="w-5 h-5 text-sky-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">LinkedIn</p>
                                        <p className="text-xs font-bold text-white">View Profile</p>
                                    </div>
                                </Card>
                            </div>

                            {/* Wallet Settings / More Details */}
                            <div className="space-y-3 pb-8">
                                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-2">Account Links</h3>
                                <div className="space-y-2">
                                    {[
                                        { icon: Globe, label: "Portfolio Website", detail: profile?.portfolio_url || "Not Connected" },
                                        { icon: Instagram, label: "Instagram Handle", detail: profile?.instagram_url ? `@${profile.username}` : "Not Connected" },
                                        { icon: Lock, label: "Privacy Settings", detail: "Advanced Protection active" },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/40 rounded-2xl border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 transition-colors">
                                                    <item.icon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{item.label}</p>
                                                    <p className="text-xs font-bold text-white/90 truncate max-w-[150px]">{item.detail}</p>
                                                </div>
                                            </div>
                                            <MoreHorizontal className="w-5 h-5 text-zinc-600" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>
                    </AnimatePresence>

                    {/* Bottom Nav (Tabs List) - Sticky */}
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 rounded-full p-2 shadow-2xl z-50">
                        <TabsList className="w-full h-12 bg-transparent grid grid-cols-4 gap-1 p-0">
                            <TabsTrigger value="home" className="flex flex-col gap-1 h-full data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 rounded-full transition-all">
                                <WalletIcon className="w-5 h-5" />
                                <span className="text-[8px] font-bold">Home</span>
                            </TabsTrigger>
                            <TabsTrigger value="transfer" className="flex flex-col gap-1 h-full data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 rounded-full transition-all">
                                <ArrowUpRight className="w-5 h-5" />
                                <span className="text-[8px] font-bold">Transfer</span>
                            </TabsTrigger>
                            <TabsTrigger value="cards" className="flex flex-col gap-1 h-full data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 rounded-full transition-all">
                                <CreditCard className="w-5 h-5" />
                                <span className="text-[8px] font-bold">Cards</span>
                            </TabsTrigger>
                            <TabsTrigger value="profile" className="flex flex-col gap-1 h-full data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 rounded-full transition-all">
                                <User className="w-5 h-5" />
                                <span className="text-[8px] font-bold">Profile</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
