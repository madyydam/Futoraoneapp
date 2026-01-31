import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_WALLET_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_WALLET_SUPABASE_ANON_KEY;

// Secondary client specifically for the Futora Wallet platform
export const walletSupabase = createClient(supabaseUrl, supabaseAnonKey);
