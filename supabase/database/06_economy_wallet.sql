/*
================================================================================
SECTION 06: ECONOMY & WALLET — Coins, Transactions, Feature Locks, Games
================================================================================
Tables: user_wallet, coin_transactions, feature_locks, user_feature_unlocks,
        native_wallets, native_transactions, games, game_sessions,
        reviews, tech_matches, gig_listings, gig_applications,
        founder_listings, founder_applications
RPCs:   claim_launch_reward_popup, unlock_feature, process_game_win,
        transfer_wallet_coins
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
-- NATIVE WALLET (INR, real money / Futora Coin ledger)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.native_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id),
  CONSTRAINT native_wallets_balance_non_negative CHECK (balance >= 0)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'native_wallets_balance_non_negative'
  ) THEN
    ALTER TABLE public.native_wallets
      ADD CONSTRAINT native_wallets_balance_non_negative CHECK (balance >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.native_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.native_wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer', 'payment', 'cashback')),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  idempotency_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.native_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_native_tx_idempotency
  ON public.native_transactions(wallet_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_gig_applications_unique
  ON public.gig_applications(gig_id, applicant_id);

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_founder_applications_unique
  ON public.founder_applications(listing_id, applicant_id);

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
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating NUMERIC;
BEGIN
  SELECT AVG(rating) INTO avg_rating FROM public.reviews WHERE reviewee_id = NEW.reviewee_id;
  UPDATE public.profiles SET trust_score = COALESCE(ROUND(avg_rating * 20), 50) WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_trust_score();

-- ─────────────────────────────────────────────────────────────────────────────
-- WALLET CLEANUP & BACKFILL (created atomically by handle_new_user() in 01_core.sql)
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_wallet();

-- Backfill wallets for existing users (safe to re-run)
INSERT INTO public.native_wallets (user_id, balance)
SELECT id, 1000.00 FROM auth.users ON CONFLICT (user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- ATOMIC ECONOMY RPCs (server-authoritative, deadlock-safe, idempotent)
-- ─────────────────────────────────────────────────────────────────────────────

-- Launch reward popup function
DROP FUNCTION IF EXISTS public.claim_launch_reward_popup();
CREATE OR REPLACE FUNCTION public.claim_launch_reward_popup()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  should_show BOOLEAN;
BEGIN
  SELECT NOT reward_claimed INTO should_show FROM public.user_wallet WHERE id = auth.uid() FOR UPDATE;
  IF should_show IS NULL OR NOT should_show THEN RETURN FALSE; END IF;
  UPDATE public.user_wallet SET reward_claimed = TRUE, updated_at = NOW() WHERE id = auth.uid();
  RETURN TRUE;
END;
$$;

-- Atomic feature unlock (Tech Match = 1000 coins) with row-lock-first TOCTOU fix
DROP FUNCTION IF EXISTS public.unlock_feature(TEXT);
DROP FUNCTION IF EXISTS public.unlock_feature(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.unlock_feature(
  p_feature_name TEXT,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  v_cost INTEGER;
  v_wallet RECORD;
  v_new_balance DECIMAL(12,2);
  v_already_unlocked BOOLEAN;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT public.is_not_banned(me) THEN
    RAISE EXCEPTION 'Account is suspended';
  END IF;

  SELECT required_coins INTO v_cost FROM public.feature_locks WHERE feature_name = p_feature_name;
  IF v_cost IS NULL THEN
    IF p_feature_name = 'tech_match' THEN
      v_cost := 1000;
    ELSE
      RAISE EXCEPTION 'Unknown feature: %', p_feature_name;
    END IF;
  END IF;

  -- Lock user's wallet FIRST to eliminate concurrent double-charge TOCTOU race
  SELECT id, balance INTO v_wallet
  FROM public.native_wallets
  WHERE user_id = me
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.native_wallets (user_id, balance, currency)
    VALUES (me, 1000.00, 'INR')
    ON CONFLICT (user_id) DO NOTHING;

    SELECT id, balance INTO v_wallet FROM public.native_wallets WHERE user_id = me FOR UPDATE;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_feature_unlocks WHERE user_id = me AND feature_name = p_feature_name
  ) INTO v_already_unlocked;

  IF v_already_unlocked THEN
    IF p_feature_name = 'tech_match' THEN
      UPDATE public.profiles SET is_tech_match_unlocked = TRUE WHERE id = me;
    END IF;
    RETURN jsonb_build_object('unlocked', true, 'already_unlocked', true, 'balance', v_wallet.balance);
  END IF;

  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.native_transactions
    WHERE wallet_id = v_wallet.id AND idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('unlocked', true, 'idempotent_replay', true, 'balance', v_wallet.balance);
  END IF;

  IF v_wallet.balance < v_cost THEN
    RAISE EXCEPTION 'Insufficient balance: have %, need %', v_wallet.balance, v_cost;
  END IF;

  v_new_balance := v_wallet.balance - v_cost;

  UPDATE public.native_wallets
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = v_wallet.id;

  INSERT INTO public.native_transactions (wallet_id, type, amount, description, status, idempotency_key)
  VALUES (
    v_wallet.id,
    'payment',
    -v_cost,
    'Unlocked ' || initcap(replace(p_feature_name, '_', ' ')) || ' 🔓',
    'completed',
    p_idempotency_key
  );

  INSERT INTO public.user_feature_unlocks (user_id, feature_name)
  VALUES (me, p_feature_name)
  ON CONFLICT (user_id, feature_name) DO NOTHING;

  IF p_feature_name = 'tech_match' THEN
    UPDATE public.profiles SET is_tech_match_unlocked = TRUE WHERE id = me;
  END IF;

  RETURN jsonb_build_object('unlocked', true, 'balance', v_new_balance);
END;
$$;

-- Server-authoritative game reward RPC with rate limiting (prevents client tampering)
DROP FUNCTION IF EXISTS public.process_game_win(TEXT);
DROP FUNCTION IF EXISTS public.process_game_win(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.process_game_win(
  p_game_key TEXT DEFAULT 'arcade',
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  v_coin_reward INTEGER := 10;
  v_xp_reward INTEGER := 50;
  v_wallet RECORD;
  v_new_balance DECIMAL(12,2);
  v_new_wins INTEGER;
  v_allowed BOOLEAN;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT public.is_not_banned(me) THEN
    RAISE EXCEPTION 'Account suspended';
  END IF;

  -- Enforce server-side rate limits: max 1 win reward per 5 seconds, max 30 per hour
  SELECT public.check_rate_limit('game_win_burst_' || me::text, 1, INTERVAL '5 seconds') INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Rate limit exceeded: please wait before claiming another game reward';
  END IF;

  SELECT public.check_rate_limit('game_win_hourly_' || me::text, 30, INTERVAL '1 hour') INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Hourly game reward cap reached';
  END IF;

  SELECT COALESCE(coin_reward, 10) INTO v_coin_reward
  FROM public.games WHERE game_key = p_game_key AND active = TRUE;
  IF v_coin_reward IS NULL THEN v_coin_reward := 10; END IF;

  SELECT id, balance INTO v_wallet FROM public.native_wallets WHERE user_id = me FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.native_wallets (user_id, balance, currency)
    VALUES (me, 1000.00, 'INR')
    ON CONFLICT (user_id) DO NOTHING;
    SELECT id, balance INTO v_wallet FROM public.native_wallets WHERE user_id = me FOR UPDATE;
  END IF;

  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.native_transactions
    WHERE wallet_id = v_wallet.id AND idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('awarded', false, 'idempotent_replay', true, 'balance', v_wallet.balance);
  END IF;

  v_new_balance := v_wallet.balance + v_coin_reward;

  UPDATE public.native_wallets
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = v_wallet.id;

  INSERT INTO public.native_transactions (wallet_id, type, amount, description, status, idempotency_key)
  VALUES (v_wallet.id, 'cashback', v_coin_reward, 'Game Win Reward 🎮 (' || p_game_key || ')', 'completed', p_idempotency_key);

  INSERT INTO public.game_sessions (user_id, game_key, result, coins_awarded)
  VALUES (me, p_game_key, 'WIN', v_coin_reward);

  PERFORM public.give_xp(me, v_xp_reward);

  UPDATE public.profiles
  SET total_wins = COALESCE(total_wins, 0) + 1
  WHERE id = me
  RETURNING total_wins INTO v_new_wins;

  IF v_new_wins >= 10 THEN
    INSERT INTO public.achievements (id, name, description, icon)
    VALUES ('game_wizard', 'Game Wizard', 'Won 10 arcade games', 'gamepad')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (me, 'game_wizard')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'awarded', true,
    'coins', v_coin_reward,
    'xp', v_xp_reward,
    'balance', v_new_balance,
    'total_wins', v_new_wins
  );
END;
$$;

-- In-app P2P coin transfer RPC (deadlock-safe ordered row locking)
DROP FUNCTION IF EXISTS public.transfer_wallet_coins(TEXT, DECIMAL, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.transfer_wallet_coins(
  p_recipient_username TEXT,
  p_amount DECIMAL(12,2),
  p_note TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  v_recipient_id UUID;
  v_sender_wallet RECORD;
  v_recipient_wallet RECORD;
  v_clean_username TEXT;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF NOT public.is_not_banned(me) THEN RAISE EXCEPTION 'Account suspended'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'Invalid transfer amount';
  END IF;

  v_clean_username := lower(trim(leading '@' from COALESCE(p_recipient_username, '')));
  SELECT id INTO v_recipient_id FROM public.profiles WHERE lower(username) = v_clean_username;
  IF v_recipient_id IS NULL THEN
    RAISE EXCEPTION 'Recipient @% not found', v_clean_username;
  END IF;
  IF v_recipient_id = me THEN
    RAISE EXCEPTION 'Cannot transfer coins to yourself';
  END IF;

  -- Lock wallets in deterministic UUID order to prevent deadlocks
  IF me < v_recipient_id THEN
    SELECT id, balance INTO v_sender_wallet FROM public.native_wallets WHERE user_id = me FOR UPDATE;
    SELECT id, balance INTO v_recipient_wallet FROM public.native_wallets WHERE user_id = v_recipient_id FOR UPDATE;
  ELSE
    SELECT id, balance INTO v_recipient_wallet FROM public.native_wallets WHERE user_id = v_recipient_id FOR UPDATE;
    SELECT id, balance INTO v_sender_wallet FROM public.native_wallets WHERE user_id = me FOR UPDATE;
  END IF;

  IF v_sender_wallet.id IS NULL OR v_recipient_wallet.id IS NULL THEN
    RAISE EXCEPTION 'Wallet record missing';
  END IF;

  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.native_transactions
    WHERE wallet_id = v_sender_wallet.id AND idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('transferred', true, 'idempotent_replay', true, 'balance', v_sender_wallet.balance);
  END IF;

  IF v_sender_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.native_wallets SET balance = balance - p_amount, updated_at = NOW() WHERE id = v_sender_wallet.id;
  UPDATE public.native_wallets SET balance = balance + p_amount, updated_at = NOW() WHERE id = v_recipient_wallet.id;

  INSERT INTO public.native_transactions (wallet_id, type, amount, description, status, idempotency_key)
  VALUES (
    v_sender_wallet.id,
    'transfer',
    -p_amount,
    COALESCE(NULLIF(trim(p_note), ''), 'Transfer to @' || v_clean_username),
    'completed',
    p_idempotency_key
  );

  INSERT INTO public.native_transactions (wallet_id, type, amount, description, status)
  VALUES (
    v_recipient_wallet.id,
    'deposit',
    p_amount,
    COALESCE(NULLIF(trim(p_note), ''), 'Received from @' || (SELECT username FROM public.profiles WHERE id = me)),
    'completed'
  );

  RETURN jsonb_build_object('transferred', true, 'balance', v_sender_wallet.balance - p_amount);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS (HARDENED)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.native_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.native_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gig_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gig_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet" ON public.user_wallet;
CREATE POLICY "Users can view own wallet" ON public.user_wallet
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own coin transactions" ON public.coin_transactions;
CREATE POLICY "Users can view own coin transactions" ON public.coin_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Feature locks readable" ON public.feature_locks;
CREATE POLICY "Feature locks readable" ON public.feature_locks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users view own unlocks" ON public.user_feature_unlocks;
CREATE POLICY "Users view own unlocks" ON public.user_feature_unlocks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Games readable" ON public.games;
CREATE POLICY "Games readable" ON public.games
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users view own game sessions" ON public.game_sessions;
CREATE POLICY "Users view own game sessions" ON public.game_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Wallets: STRICTLY SELECT-ONLY for owner or admin (mutations ONLY via RPCs)
DROP POLICY IF EXISTS "Users can view own native wallet" ON public.native_wallets;
DROP POLICY IF EXISTS "Users or admins view native wallet" ON public.native_wallets;
CREATE POLICY "Users or admins view native wallet" ON public.native_wallets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own native transactions" ON public.native_transactions;
DROP POLICY IF EXISTS "Users or admins view native transactions" ON public.native_transactions;
CREATE POLICY "Users or admins view native transactions" ON public.native_transactions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR wallet_id IN (SELECT id FROM public.native_wallets WHERE user_id = auth.uid())
  );

-- Marketplace: Gigs, Founders, Applications, Tech Matches, Reviews
DROP POLICY IF EXISTS "Gig listings are public" ON public.gig_listings;
CREATE POLICY "Gig listings are public" ON public.gig_listings
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can create gig listings" ON public.gig_listings;
CREATE POLICY "Users can create gig listings" ON public.gig_listings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_not_banned(auth.uid()));
DROP POLICY IF EXISTS "Users update own gigs" ON public.gig_listings;
CREATE POLICY "Users update own gigs" ON public.gig_listings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own gigs" ON public.gig_listings;
CREATE POLICY "Users delete own gigs" ON public.gig_listings
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Gig apps select" ON public.gig_applications;
CREATE POLICY "Gig apps select" ON public.gig_applications FOR SELECT TO authenticated
  USING (auth.uid() = applicant_id OR EXISTS (SELECT 1 FROM public.gig_listings g WHERE g.id = gig_id AND g.user_id = auth.uid()));
DROP POLICY IF EXISTS "Gig apps insert" ON public.gig_applications;
CREATE POLICY "Gig apps insert" ON public.gig_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = applicant_id AND public.is_not_banned(auth.uid()));
DROP POLICY IF EXISTS "Gig owners update app status" ON public.gig_applications;
CREATE POLICY "Gig owners update app status" ON public.gig_applications FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gig_listings g WHERE g.id = gig_id AND g.user_id = auth.uid()));

DROP POLICY IF EXISTS "Founder listings are public" ON public.founder_listings;
CREATE POLICY "Founder listings are public" ON public.founder_listings
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can create founder listings" ON public.founder_listings;
CREATE POLICY "Users can create founder listings" ON public.founder_listings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_not_banned(auth.uid()));
DROP POLICY IF EXISTS "Users update own founder listings" ON public.founder_listings;
CREATE POLICY "Users update own founder listings" ON public.founder_listings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own founder listings" ON public.founder_listings;
CREATE POLICY "Users delete own founder listings" ON public.founder_listings
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Founder apps select" ON public.founder_applications;
CREATE POLICY "Founder apps select" ON public.founder_applications FOR SELECT TO authenticated
  USING (auth.uid() = applicant_id OR EXISTS (SELECT 1 FROM public.founder_listings fl WHERE fl.id = listing_id AND fl.user_id = auth.uid()));
DROP POLICY IF EXISTS "Founder apps insert" ON public.founder_applications;
CREATE POLICY "Founder apps insert" ON public.founder_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = applicant_id AND public.is_not_banned(auth.uid()));
DROP POLICY IF EXISTS "Listing owners update founder app status" ON public.founder_applications;
CREATE POLICY "Listing owners update founder app status" ON public.founder_applications FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.founder_listings fl WHERE fl.id = listing_id AND fl.user_id = auth.uid()));

DROP POLICY IF EXISTS "Tech matches owner" ON public.tech_matches;
CREATE POLICY "Tech matches owner" ON public.tech_matches FOR ALL TO authenticated
  USING (auth.uid() = liker_id OR auth.uid() = liked_id)
  WITH CHECK (auth.uid() = liker_id);

DROP POLICY IF EXISTS "Reviews readable" ON public.reviews;
CREATE POLICY "Reviews readable" ON public.reviews
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users create own reviews" ON public.reviews;
CREATE POLICY "Users create own reviews" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id AND reviewer_id <> reviewee_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.feature_locks (feature_name, required_coins)
VALUES ('tech_match', 1000) ON CONFLICT (feature_name) DO NOTHING;
