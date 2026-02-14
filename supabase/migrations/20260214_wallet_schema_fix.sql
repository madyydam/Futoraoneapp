-- Migration to fix missing wallet and transaction tables
-- This aligns the schema with the Wallet.tsx UI requirements

-- 1. Create native_wallets table
CREATE TABLE IF NOT EXISTS public.native_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'INR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. Create native_transactions table
CREATE TABLE IF NOT EXISTS public.native_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.native_wallets(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer', 'payment', 'cashback')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add RLS Policies
ALTER TABLE public.native_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.native_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.native_wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON public.native_transactions
    FOR SELECT USING (
        wallet_id IN (SELECT id FROM public.native_wallets WHERE user_id = auth.uid())
    );

-- 4. Trigger for automatic wallet creation for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER AS $$
DECLARE
    new_wallet_id UUID;
BEGIN
    INSERT INTO public.native_wallets (user_id, balance)
    VALUES (NEW.id, 1000.00)
    RETURNING id INTO new_wallet_id;

    INSERT INTO public.native_transactions (wallet_id, type, amount, description, status)
    VALUES (new_wallet_id, 'cashback', 1000.00, 'Welcome Bonus 🎁', 'completed');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_wallet') THEN
        CREATE TRIGGER on_auth_user_created_wallet
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();
    END IF;
END $$;

-- 5. Fix for existing users who might not have a wallet
INSERT INTO public.native_wallets (user_id, balance)
SELECT id, 1000.00 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Log bonus for those who just got a wallet
INSERT INTO public.native_transactions (wallet_id, type, amount, description, status)
SELECT id, 'cashback', 1000.00, 'Welcome Bonus 🎁', 'completed'
FROM public.native_wallets w
WHERE NOT EXISTS (
    SELECT 1 FROM public.native_transactions t WHERE t.wallet_id = w.id AND t.description = 'Welcome Bonus 🎁'
);
