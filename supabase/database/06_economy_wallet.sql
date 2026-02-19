/*
================================================================================
SECTION 06: ECONOMY & WALLET — Coins, Transactions, Feature Locks, Games
================================================================================
Tables: user_wallet, coin_transactions, feature_locks, user_feature_unlocks,
        native_wallets, native_transactions, games, game_sessions,
        reviews, tech_matches, gig_listings, gig_applications,
        founder_listings, founder_applications
================================================================================
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- COIN ECONOMY (FutoraCoin system)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_wallet (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins INTEGER NOT NULL DEFAULT 1000,
  reward_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (coins >= 0)
);

CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('EARN', 'SPEND')),
  coins INTEGER NOT NULL CHECK (coins > 0),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON public.coin_transactions(user_id);

CREATE TABLE IF NOT EXISTS public.feature_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT UNIQUE,
  required_coins INTEGER NOT NULL CHECK (required_coins >= 0)
);

CREATE TABLE IF NOT EXISTS public.user_feature_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, feature_name)
);

CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_key TEXT UNIQUE,
  game_name TEXT,
  coin_reward INTEGER DEFAULT 10,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_key TEXT,
  result TEXT CHECK (result IN ('WIN','LOSE','DRAW')),
  coins_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- NATIVE WALLET (INR, real money transactions)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.native_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.native_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.native_wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer', 'payment', 'cashback')),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- MARKETPLACE: GIGS, FOUNDERS, REVIEWS, TECH MATCHES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gig_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR' NOT NULL,
  status TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'assigned', 'completed')),
  location TEXT DEFAULT 'Remote' NOT NULL,
  skills_required TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gig_listings_user_id ON public.gig_listings(user_id);

CREATE TABLE IF NOT EXISTS public.gig_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID REFERENCES public.gig_listings(id) ON DELETE CASCADE,
  applicant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  proposal TEXT NOT NULL,
  bid_amount NUMERIC,
  expected_timeline TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.founder_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_needed TEXT NOT NULL,
  idea_description TEXT NOT NULL,
  equity_range TEXT NOT NULL,
  stage TEXT NOT NULL,
  industry TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_founder_listings_user_id ON public.founder_listings(user_id);

CREATE TABLE IF NOT EXISTS public.founder_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.founder_listings(id) ON DELETE CASCADE,
  applicant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  contact_info TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tech_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  liked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(liker_id, liked_id)
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID REFERENCES auth.users(id) NOT NULL,
  reviewee_id UUID REFERENCES auth.users(id) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(reviewer_id, reviewee_id)
);

-- Trust score trigger (updates profile trust_score from reviews)
CREATE OR REPLACE FUNCTION public.update_trust_score()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating NUMERIC;
BEGIN
  SELECT AVG(rating) INTO avg_rating FROM public.reviews WHERE reviewee_id = NEW.reviewee_id;
  UPDATE public.profiles SET trust_score = COALESCE(ROUND(avg_rating * 20), 50) WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_trust_score();

-- ─────────────────────────────────────────────────────────────────────────────
-- WALLET TRIGGER: auto-create native wallet for new users
-- ─────────────────────────────────────────────────────────────────────────────

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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_wallet') THEN
    CREATE TRIGGER on_auth_user_created_wallet
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();
  END IF;
END $$;

-- Backfill wallets for existing users (safe to re-run)
INSERT INTO public.native_wallets (user_id, balance)
SELECT id, 1000.00 FROM auth.users ON CONFLICT (user_id) DO NOTHING;

-- Launch reward popup function
CREATE OR REPLACE FUNCTION public.claim_launch_reward_popup()
RETURNS BOOLEAN AS $$
DECLARE
  should_show BOOLEAN;
BEGIN
  SELECT NOT reward_claimed INTO should_show FROM public.user_wallet WHERE id = auth.uid() FOR UPDATE;
  IF should_show IS NULL OR NOT should_show THEN RETURN FALSE; END IF;
  UPDATE public.user_wallet SET reward_claimed = TRUE, updated_at = NOW() WHERE id = auth.uid();
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.native_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.native_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gig_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet" ON public.user_wallet;
CREATE POLICY "Users can view own wallet" ON public.user_wallet FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own coin transactions" ON public.coin_transactions;
CREATE POLICY "Users can view own coin transactions" ON public.coin_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own native wallet" ON public.native_wallets;
CREATE POLICY "Users can view own native wallet" ON public.native_wallets FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own native transactions" ON public.native_transactions;
CREATE POLICY "Users can view own native transactions" ON public.native_transactions
  FOR SELECT USING (wallet_id IN (SELECT id FROM public.native_wallets WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Gig listings are public" ON public.gig_listings;
CREATE POLICY "Gig listings are public" ON public.gig_listings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create gig listings" ON public.gig_listings;
CREATE POLICY "Users can create gig listings" ON public.gig_listings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Founder listings are public" ON public.founder_listings;
CREATE POLICY "Founder listings are public" ON public.founder_listings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create founder listings" ON public.founder_listings;
CREATE POLICY "Users can create founder listings" ON public.founder_listings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.feature_locks (feature_name, required_coins)
VALUES ('tech_match', 1000) ON CONFLICT (feature_name) DO NOTHING;

INSERT INTO public.games (game_key, game_name, coin_reward) VALUES
  ('tic_tac_toe', 'Tic Tac Toe', 10),
  ('rock_paper_scissors', 'Rock Paper Scissors', 10),
  ('memory_match', 'Memory Match', 10)
ON CONFLICT (game_key) DO NOTHING;
