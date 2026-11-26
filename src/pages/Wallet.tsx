import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Wallet as WalletIcon, CreditCard, User, Zap, Eye, EyeOff, Copy, MapPin, Shield, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

interface WalletData {
  id: string;
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "transfer" | "payment" | "cashback";
  amount: number;
  description: string;
  created_at: string;
  status: "completed" | "pending" | "failed";
}

interface ProfileData {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  trust_score: number | null;
  banner_url: string | null;
  theme_color: string | null;
}

const QuickAction = React.memo(
  ({
    icon: Icon,
    label,
    color = "bg-zinc-800",
    onClick,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    color?: string;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-2 group">
      <div
        className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform shadow-lg shadow-black/50`}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</span>
    </button>
  )
);
QuickAction.displayName = "QuickAction";

const TransactionItem = React.memo(({ tx }: { tx: Transaction }) => {
  const isCredit = tx.amount >= 0 && ["deposit", "cashback"].includes(tx.type);
  return (
    <div className="flex items-center justify-between p-4 bg-card/30 backdrop-blur-md rounded-2xl border border-white/5 mb-2 hover:bg-card/50 transition-colors">
      <div className="flex items-center gap-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isCredit ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          }`}
        >
          {isCredit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
        </div>
        <div>
          <p className="font-bold text-sm text-white">{tx.description}</p>
          <p className="text-[10px] text-muted-foreground uppercase font-medium">
            {new Date(tx.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <span className={`font-black tracking-tight ${isCredit ? "text-emerald-400" : "text-white"}`}>
        {isCredit ? "+" : "-"} {Math.abs(tx.amount).toLocaleString()} 🪙
      </span>
    </div>
  );
});
TransactionItem.displayName = "TransactionItem";

export default function Wallet() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, userId, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState("home");
  const [showBalance, setShowBalance] = useState(true);
  const [showAllTx, setShowAllTx] = useState(false);

  // Transfer state
  const [recipientUsername, setRecipientUsername] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(false);

  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ["native_wallet_v2", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("native_wallets")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as WalletData | null;
    },
    enabled: Boolean(userId),
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["native_transactions", walletData?.id, showAllTx],
    queryFn: async () => {
      if (!walletData?.id) return [];
      const { data, error } = await supabase
        .from("native_transactions")
        .select("*")
        .eq("wallet_id", walletData.id)
        .order("created_at", { ascending: false })
        .limit(showAllTx ? 50 : 10);
      if (error) throw error;
      return (data || []) as Transaction[];
    },
    enabled: Boolean(walletData?.id),
  });

  const { data: profile } = useQuery({
    queryKey: ["user_profile_wallet", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio, location, trust_score, banner_url, theme_color")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data as ProfileData;
    },
    enabled: Boolean(userId),
  });

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(transferAmount);
    if (!recipientUsername.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Invalid Transfer",
        description: "Enter a valid recipient @username and positive coin amount.",
        variant: "destructive",
      });
      return;
    }

    setTransferring(true);
    try {
      const { error } = await (supabase.rpc as any)("transfer_wallet_coins", {
        p_recipient_username: recipientUsername.trim(),
        p_amount: numericAmount,
        p_note: transferNote.trim() || null,
        p_idempotency_key: crypto.randomUUID(),
      });

      if (error) throw error;

      toast({
        title: "Coins Sent!",
        description: `Transferred ${numericAmount.toLocaleString()} coins to @${recipientUsername.replace(/^@/, "")}.`,
      });
      setRecipientUsername("");
      setTransferAmount("");
      setTransferNote("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["native_wallet_v2", userId] }),
        queryClient.invalidateQueries({ queryKey: ["native_transactions"] }),
      ]);
      setActiveTab("home");
    } catch (error) {
      toast({
        title: "Transfer Failed",
        description: error instanceof Error ? error.message : "Could not complete transfer.",
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  const copyHandle = () => {
    if (!profile?.username) return;
    navigator.clipboard.writeText(`@${profile.username}`);
    setCopiedHandle(true);
    setTimeout(() => setCopiedHandle(false), 2000);
    toast({ title: "Copied!", description: `@${profile.username} copied to clipboard.` });
  };

  const loading = authLoading || walletLoading || txLoading;
  const cardLast4 = walletData?.id ? walletData.id.replace(/-/g, "").slice(-4).toUpperCase() : "0000";

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-cyan-500/30">
      <div className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-sm font-black tracking-widest uppercase text-cyan-400">Futora Wallet</h1>
            <p className="text-[10px] text-muted-foreground font-bold">In-App Coin Economy</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/games")}
          className="rounded-full hover:bg-white/10"
          title="Earn Coins in Arcade"
        >
          <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
        </Button>
      </div>

      <div className="flex-1 p-4 pb-24 max-w-md mx-auto w-full space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <AnimatePresence mode="wait">
            <TabsContent value="home" className="space-y-6 mt-0">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-600 to-purple-600 rounded-[2rem] opacity-20 blur-xl" />
                <Card className="bg-[#0A0A0A] border-white/10 rounded-[2rem] overflow-hidden relative shadow-2xl">
                  <CardContent className="p-8 relative z-10">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">
                        Total Coin Balance
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowBalance(!showBalance)}
                        className="text-muted-foreground hover:text-white transition-colors"
                      >
                        {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="mb-6">
                      {loading ? (
                        <Skeleton className="h-12 w-48 bg-white/10 rounded-lg" />
                      ) : (
                        <h2 className="text-5xl font-black text-white tracking-tighter">
                          {showBalance ? `${(walletData?.balance ?? 0).toLocaleString()} 🪙` : "••••••"}
                        </h2>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                        1,000 Coins Welcome Bonus Included
                      </span>
                      <div className="w-10 h-10 bg-gradient-to-tr from-cyan-400 to-purple-500 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)]" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <div className="flex justify-around items-start px-2">
                <QuickAction
                  icon={ArrowUpRight}
                  label="Send"
                  color="bg-gradient-to-b from-cyan-500 to-blue-600 border-none"
                  onClick={() => setActiveTab("transfer")}
                />
                <QuickAction icon={ArrowDownLeft} label="Receive" onClick={copyHandle} />
                <QuickAction icon={Zap} label="Earn" onClick={() => navigate("/games")} />
                <QuickAction icon={CreditCard} label="Card" onClick={() => setActiveTab("cards")} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Recent Activity</h3>
                  <Button
                    variant="link"
                    onClick={() => setShowAllTx((s) => !s)}
                    className="text-cyan-400 text-xs font-bold"
                  >
                    {showAllTx ? "Show Less" : "See All"}
                  </Button>
                </div>
                {transactions.length > 0 ? (
                  transactions.map((tx) => <TransactionItem key={tx.id} tx={tx} />)
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-xs">No transactions yet</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="transfer" className="mt-0">
              <Card className="bg-[#0A0A0A] border-white/10 min-h-[60vh] rounded-[2rem] p-6">
                <form onSubmit={handleTransfer} className="space-y-6">
                  <div className="text-center mb-4">
                    <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-1">Futora Wallet</h2>
                    <h3 className="text-white text-lg font-black">Send Coins</h3>
                  </div>

                  <div className="text-center">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">
                      Enter Amount (Coins)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max={walletData?.balance ?? 100000}
                      step="1"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="text-5xl font-black bg-transparent border-none text-center w-full focus-visible:ring-0 p-0 h-auto placeholder:text-white/10"
                      placeholder="0"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[100, 250, 500, 1000].map((amt) => (
                      <Button
                        key={amt}
                        type="button"
                        variant="outline"
                        onClick={() => setTransferAmount(String(amt))}
                        className="border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-500/50 rounded-xl font-bold"
                      >
                        {amt}
                      </Button>
                    ))}
                  </div>

                  <Input
                    placeholder="Recipient @username"
                    value={recipientUsername}
                    onChange={(e) => setRecipientUsername(e.target.value)}
                    className="bg-white/5 border-white/10 rounded-xl h-12 px-4 text-center font-medium"
                    required
                  />

                  <Input
                    placeholder="Note (optional)"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    maxLength={120}
                    className="bg-white/5 border-white/10 rounded-xl h-12 px-4 text-center font-medium"
                  />

                  <Button
                    type="submit"
                    disabled={transferring || !user}
                    className="w-full h-14 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-black tracking-widest uppercase shadow-lg shadow-cyan-900/20"
                  >
                    {transferring ? "Sending..." : "Send Coins"}
                  </Button>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="cards" className="mt-0 space-y-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-black text-white">Member Pass</h2>
              </div>

              <motion.div
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                className="aspect-[1.586/1] w-full rounded-[1.5rem] bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 p-6 relative overflow-hidden shadow-2xl shadow-cyan-900/20"
              >
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-black italic tracking-tighter text-lg">FutoraOne</h3>
                      <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">In-App Wallet</p>
                    </div>
                    <span className="px-2 py-1 bg-white/20 rounded-md text-[10px] font-bold text-white backdrop-blur-md">
                      Active
                    </span>
                  </div>

                  <div className="space-y-4">
                    <p className="font-mono text-2xl font-bold text-white tracking-widest drop-shadow-md">
                      FUTO •••• •••• {cardLast4}
                    </p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[8px] text-white/60 font-bold uppercase mb-1">Account Holder</p>
                        <p className="text-sm font-bold text-white uppercase tracking-wider">
                          {profile?.full_name || profile?.username || "MEMBER"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] text-white/60 font-bold uppercase mb-1">Handle</p>
                        <p className="text-sm font-bold text-white font-mono">@{profile?.username || "user"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setShowBalance((s) => !s)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10"
                >
                  {showBalance ? <EyeOff className="w-5 h-5 text-white" /> : <Eye className="w-5 h-5 text-white" />}
                  <span className="text-[10px] font-bold text-muted-foreground">
                    {showBalance ? "Hide Balance" : "Show Balance"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={copyHandle}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10"
                >
                  {copiedHandle ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-white" />}
                  <span className="text-[10px] font-bold text-muted-foreground">Copy @Handle</span>
                </button>
              </div>
            </TabsContent>

            <TabsContent value="profile" className="mt-0 space-y-6">
              <Card className="bg-[#0A0A0A] border-white/10 rounded-[2rem] overflow-hidden relative shadow-2xl">
                <div
                  className="h-24 w-full bg-cover bg-center opacity-40"
                  style={{
                    backgroundImage: profile?.banner_url ? `url(${profile.banner_url})` : undefined,
                    backgroundColor: profile?.theme_color || "#1e1b4b",
                  }}
                />
                <CardContent className="px-6 pb-6 pt-0 -mt-10 relative z-10">
                  <Avatar className="h-24 w-24 border-4 border-[#0A0A0A] shadow-xl mb-4">
                    <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="bg-zinc-800 text-cyan-400 text-2xl font-black">
                      {profile?.full_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-white tracking-tight">{profile?.full_name}</h2>
                    <Shield className="w-5 h-5 text-cyan-500 fill-cyan-500/20" />
                  </div>
                  <p className="text-cyan-500/80 font-bold text-sm">@{profile?.username}</p>
                  {profile?.bio && <p className="text-zinc-400 text-xs mt-3 leading-relaxed">{profile.bio}</p>}
                  <div className="flex items-center gap-4 mt-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{profile?.location || "India"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-yellow-500" />
                      <span>Trust Score: {profile?.trust_score ?? 50}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </AnimatePresence>

          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 rounded-full p-2 shadow-2xl z-50">
            <TabsList className="w-full h-12 bg-transparent grid grid-cols-4 gap-1 p-0">
              <TabsTrigger value="home" className="flex flex-col gap-1 h-full data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 rounded-full">
                <WalletIcon className="w-5 h-5" />
                <span className="text-[8px] font-bold">Home</span>
              </TabsTrigger>
              <TabsTrigger value="transfer" className="flex flex-col gap-1 h-full data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 rounded-full">
                <ArrowUpRight className="w-5 h-5" />
                <span className="text-[8px] font-bold">Send</span>
              </TabsTrigger>
              <TabsTrigger value="cards" className="flex flex-col gap-1 h-full data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 rounded-full">
                <CreditCard className="w-5 h-5" />
                <span className="text-[8px] font-bold">Pass</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex flex-col gap-1 h-full data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 rounded-full">
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
