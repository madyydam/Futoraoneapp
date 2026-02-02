import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

import { toast } from "sonner";

export const useWalletSync = () => {
    useEffect(() => {
        const syncWallet = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || !user.email) return;

                // 1. Check if wallet exists
                // @ts-ignore
                const { data: existingWallet } = await supabase
                    .from("native_wallets")
                    .select("id")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (!existingWallet) {
                    console.log("Wallet Sync: Creating new native wallet for", user.email);

                    // 2. Create Wallet with Signup Bonus (1000.00 Coins)
                    // @ts-ignore
                    const { data: newWallet, error } = await supabase
                        .from("native_wallets")
                        .insert([
                            {
                                user_id: user.id,
                                balance: 1000.00, // 1000.00 Coins
                            }
                        ])
                        .select()
                        .single();

                    if (error) {
                        console.error("Wallet Sync: Creation Failed", error);
                    } else {
                        // Log bonus transaction
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
