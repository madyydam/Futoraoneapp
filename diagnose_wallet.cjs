
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const walletUrl = process.env.VITE_WALLET_SUPABASE_URL;
const walletKey = process.env.VITE_WALLET_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceKey);
const walletSupabase = createClient(walletUrl, walletKey);

async function diagnose() {
    console.log("Starting diagnosis...");

    // 1. Find the user by username
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .ilike('username', 'Madhurdhadve');

    if (pError) {
        console.error("Error fetching profile:", pError);
        return;
    }

    if (profiles.length === 0) {
        console.log("No profile found for username: Madhurdhadve");
        // Try to list all profiles to see what we have
        const { data: allProfiles } = await supabase.from('profiles').select('username').limit(5);
        console.log("Sample profiles:", allProfiles);
        return;
    }

    const profile = profiles[0];
    console.log("Found profile:", profile);

    // 2. Get the user's email from Auth (requires service role)
    const { data: { user }, error: uError } = await supabase.auth.admin.getUserById(profile.id);

    if (uError) {
        console.error("Error fetching auth user:", uError);
    } else {
        console.log("Auth user email:", user.email);

        // 3. Check the wallet project for this email
        const { data: wallet, error: wError } = await walletSupabase
            .from('wallets')
            .select('*')
            .ilike('email', user.email.trim())
            .maybeSingle();

        if (wError) {
            console.error("Error fetching wallet:", wError);
        } else {
            console.log("Wallet data found:", wallet);

            if (!wallet) {
                console.log("Listing some existing wallets for comparison...");
                const { data: samples, error: sError } = await walletSupabase
                    .from('wallets')
                    .select('email, balance_paise')
                    .limit(5);

                if (sError) console.error("Error listing samples:", sError);
                else console.log("Sample wallets in secondary project:", samples);
            }
        }
    }
}

diagnose();
