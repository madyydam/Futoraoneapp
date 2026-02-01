import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { walletSupabase } from "@/integrations/supabase/walletClient";
import { toast } from "sonner";

export const useWalletSync = () => {
    useEffect(() => {
        const syncWallet = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || !user.email) return;

                // 1. Check if wallet exists
                const { data: existingWallet } = await (walletSupabase as any)
                    .from("wallets")
                    .select("id")
                    .eq("email", user.email)
                    .maybeSingle();

                if (!existingWallet) {
                    console.log("Wallet Sync: Creating new wallet for", user.email);

                    // 2. Create Wallet with Signup Bonus (1000 Coins = 100000 Paise)
                    const { error } = await (walletSupabase as any)
                        .from("wallets")
                        .insert([
                            {
                                email: user.email,
                                balance_paise: 100000, // 1000.00 Coins
                                name: user.user_metadata?.full_name || user.email.split('@')[0],
                                currency: 'INR' // Default or whatever the platform uses
                            }
                        ]);

                    if (error) {
                        console.error("Wallet Sync: Creation Failed", error);
                    } else {
                        toast.success("Welcome! 🎁 1,000 Coins added to your Futora Wallet!");
                    }
                }
            } catch (err) {
                console.error("Wallet Sync Error:", err);
            }
        };

        syncWallet();
    }, []);
};
