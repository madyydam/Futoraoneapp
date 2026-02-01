import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_WALLET_SUPABASE_URL || "https://placeholder-wallet.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_WALLET_SUPABASE_ANON_KEY || "placeholder-key";

// Secondary client specifically for the Futora Wallet platform
// We disable auth persistence to prevent conflicts with the primary Supabase project
export const walletSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});
