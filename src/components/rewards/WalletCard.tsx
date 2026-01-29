import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Coins, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Transaction {
    id: string;
    reason: string;
    coins: number;
    type: 'EARN' | 'SPEND';
    created_at: string;
}

// Mock transactions for demo
const MOCK_TRANSACTIONS: Transaction[] = [
    { id: '1', reason: 'Welcome Bonus', coins: 1000, type: 'EARN', created_at: new Date().toISOString() },
    { id: '2', reason: 'Daily Login', coins: 50, type: 'EARN', created_at: new Date().toISOString() },
    { id: '3', reason: 'Post Created', coins: 25, type: 'EARN', created_at: new Date().toISOString() },
];

export const WalletCard = () => {
    const [coins, setCoins] = useState(1000);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load coins from localStorage or use default
        const savedCoins = localStorage.getItem('futora_coins');
        if (savedCoins) {
            setCoins(parseInt(savedCoins, 10));
        }
        setLoading(false);
    }, []);

    const fetchTransactions = async () => {
        // Use mock transactions for now
        setTransactions(MOCK_TRANSACTIONS);
    };

    return (
        <Card className="bg-gradient-to-br from-gray-900 to-black border-yellow-500/30 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Coins className="w-32 h-32" />
            </div>

            <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-400">Futora Wallet</h3>
                    <Dialog onOpenChange={(open) => open && fetchTransactions()}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-white">
                                <History className="w-4 h-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900 border-white/10 text-white">
                            <DialogHeader>
                                <DialogTitle>Transaction History</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                {transactions.length > 0 ? (
                                    transactions.map((tx) => (
                                        <div key={tx.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                                            <div>
                                                <p className="font-medium text-sm">{tx.reason}</p>
                                                <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <span className={`font-bold ${tx.type === 'EARN' ? 'text-green-500' : 'text-red-500'}`}>
                                                {tx.type === 'EARN' ? '+' : '-'}{tx.coins}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500 py-4">No transactions yet</p>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="flex items-center gap-4">
                    <motion.div
                        animate={{ rotateY: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center border-2 border-yellow-500 text-yellow-500"
                    >
                        <span className="text-2xl">🪙</span>
                    </motion.div>

                    <div>
                        <div className={`text-3xl font-bold text-white transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
                            {coins.toLocaleString()}
                        </div>
                        <div className="text-xs text-yellow-500/80 font-medium">
                            ₹1.00 = 1000 Coins
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};