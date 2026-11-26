/*
================================================================================
SECTION 01: CORE — Extensions, Types, Roles, Profiles, Push Tokens, Follows, Blocks
================================================================================
Tables: user_roles, profiles, user_push_tokens, follows, blocks, topic_follows,
        user_presence, profile_views
Functions: has_role, is_admin_user, is_not_banned, are_users_blocked,
           handle_updated_at, handle_new_user, guard_profile_privileged_columns,
           sync_profile_admin_flag
================================================================================
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- EXTENSIONS & TYPES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- USER ROLES & AUTHORIZATION HELPERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES TABLE & HARDENING COLUMNS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT,
  location TEXT DEFAULT 'Pune',
  theme_color TEXT,

  -- Social Links
  github_url TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  instagram_url TEXT,
  tech_skills TEXT[],

  -- Status & Verification
  is_verified BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  is_bot BOOLEAN NOT NULL DEFAULT FALSE,
  verification_category TEXT,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,

  -- Notifications
  fcm_token TEXT,
  one_signal_player_id TEXT,
  digest_mode BOOLEAN DEFAULT FALSE,
  last_digest_at TIMESTAMPTZ DEFAULT NOW(),

  -- Gamification & Features
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  last_activity_date TIMESTAMPTZ DEFAULT NOW(),
  badges TEXT[] DEFAULT '{}',
  trust_score INTEGER DEFAULT 50,
  is_tech_match_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  daily_challenges JSONB DEFAULT '[
    {"id": "story", "title": "Share a Story", "xp": 50, "completed": false, "current": 0, "target": 1},
    {"id": "likes", "title": "Like 5 Posts", "xp": 25, "completed": false, "current": 0, "target": 5},
    {"id": "comment", "title": "Leave a Comment", "xp": 30, "completed": false, "current": 0, "target": 1}
  ]'::jsonb,

  -- Vibe / Presence Status
  vibe_mood TEXT DEFAULT '😎',
  vibe_status TEXT,

  -- Settings
  settings JSONB DEFAULT '{
    "privacy": {"read_receipts": true, "online_status": true},
    "notifications": {"push": true, "email": true, "marketing": false},
    "theme": {"accent_color": "default"}
  }'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist cleanly when re-running on existing DBs
-- Idempotent column guards: add any profiles columns missing in the live DB
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Pune';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_color TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tech_skills TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_category TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS one_signal_player_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS digest_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_digest_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_wins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_tech_match_unlocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_challenges JSONB DEFAULT '[
    {"id": "story", "title": "Share a Story", "xp": 50, "completed": false, "current": 0, "target": 1},
    {"id": "likes", "title": "Like 5 Posts", "xp": 25, "completed": false, "current": 0, "target": 5},
    {"id": "comment", "title": "Leave a Comment", "xp": 30, "completed": false, "current": 0, "target": 1}
  ]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vibe_mood TEXT DEFAULT '😎';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vibe_status TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
    "privacy": {"read_receipts": true, "online_status": true},
    "notifications": {"push": true, "email": true, "marketing": false},
    "theme": {"accent_color": "default"}
  }'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill profiles for any auth.users created before triggers existed (prevents downstream FK errors)
INSERT INTO public.profiles (id, email, username, full_name, avatar_url)
SELECT
  u.id,
  u.email,
  COALESCE(
    NULLIF(regexp_replace(lower(COALESCE(u.raw_user_meta_data->>'username', split_part(COALESCE(u.email, ''), '@', 1), 'user')), '[^a-z0-9_]', '_', 'g'), ''),
    'user'
  ) || '_' || substr(replace(u.id::text, '-', ''), 1, 6),
  COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), NULLIF(u.raw_user_meta_data->>'name', ''), 'User'),
  COALESCE(NULLIF(u.raw_user_meta_data->>'avatar_url', ''), NULLIF(u.raw_user_meta_data->>'picture', ''), 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || u.id::text)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_is_bot ON public.profiles(is_bot);
CREATE INDEX IF NOT EXISTS idx_profiles_badges ON public.profiles USING GIN(badges);
CREATE INDEX IF NOT EXISTS idx_profiles_fcm_token ON public.profiles(fcm_token);
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity ON public.profiles(last_activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_digest_at ON public.profiles(last_digest_at);

-- Owner-only push tokens (never exposed on public.profiles)
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT,
  platform TEXT DEFAULT 'web',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- FOLLOWS, BLOCKS, TOPIC FOLLOWS, PRESENCE, PROFILE VIEWS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE TABLE IF NOT EXISTS public.topic_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic)
);

CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_id ON public.profile_views(profile_id, viewed_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY & ACCOUNT STATE HELPERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_not_banned(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT NOT is_banned FROM public.profiles WHERE id = _user_id), TRUE);
$$;

CREATE OR REPLACE FUNCTION public.are_users_blocked(_u1 UUID, _u2 UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = _u1 AND blocked_id = _u2)
       OR (blocker_id = _u2 AND blocked_id = _u1)
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Guard privileged columns against direct client tampering (must remain SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  is_privileged BOOLEAN;
BEGIN
  is_privileged := (CURRENT_USER IN ('postgres', 'supabase_admin', 'service_role'))
    OR (current_setting('role', true) = 'service_role')
    OR public.has_role(auth.uid(), 'admin');

  IF TG_OP = 'INSERT' THEN
    NEW.fcm_token := NULL;
    IF NOT is_privileged THEN
      NEW.is_admin := FALSE;
      NEW.is_bot := FALSE;
      NEW.is_verified := FALSE;
      NEW.verification_category := NULL;
      NEW.xp := 0;
      NEW.level := 1;
      NEW.trust_score := 50;
      NEW.badges := ARRAY[]::TEXT[];
      NEW.current_streak := 0;
      NEW.longest_streak := 0;
      NEW.total_wins := 0;
      NEW.is_banned := FALSE;
      NEW.is_tech_match_unlocked := FALSE;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT is_privileged THEN
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
       OR NEW.is_bot IS DISTINCT FROM OLD.is_bot
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.verification_category IS DISTINCT FROM OLD.verification_category
       OR NEW.xp IS DISTINCT FROM OLD.xp
       OR NEW.level IS DISTINCT FROM OLD.level
       OR NEW.trust_score IS DISTINCT FROM OLD.trust_score
       OR NEW.badges IS DISTINCT FROM OLD.badges
       OR NEW.current_streak IS DISTINCT FROM OLD.current_streak
       OR NEW.longest_streak IS DISTINCT FROM OLD.longest_streak
       OR NEW.total_wins IS DISTINCT FROM OLD.total_wins
       OR NEW.is_banned IS DISTINCT FROM OLD.is_banned
       OR NEW.is_tech_match_unlocked IS DISTINCT FROM OLD.is_tech_match_unlocked
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.fcm_token IS DISTINCT FROM OLD.fcm_token THEN
      RAISE EXCEPTION 'Forbidden: cannot modify privileged profile attributes directly';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER trg_guard_profile_privileged_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();

-- Sync profiles.is_admin automatically from user_roles (never vice-versa)
CREATE OR REPLACE FUNCTION public.sync_profile_admin_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_uid UUID;
BEGIN
  target_uid := COALESCE(NEW.user_id, OLD.user_id);
  UPDATE public.profiles
  SET is_admin = EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = target_uid AND role = 'admin'
  )
  WHERE id = target_uid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_admin_flag ON public.user_roles;
CREATE TRIGGER trg_sync_profile_admin_flag
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_admin_flag();

-- Collision-safe signup trigger supporting email & Google OAuth + 1,000-coin native wallet
-- Drop any legacy triggers on auth.users first to avoid cascade failures
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_native_wallet ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_wallet();
DROP FUNCTION IF EXISTS public.handle_new_user_native_wallet();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  candidate_username TEXT;
  new_wallet_id UUID;
  resolved_avatar TEXT;
  resolved_full_name TEXT;
BEGIN
  -- 1. Extract sanitized username
  base_username := regexp_replace(
    lower(COALESCE(NEW.raw_user_meta_data->>'username', split_part(COALESCE(NEW.email, 'user'), '@', 1), 'user')),
    '[^a-z0-9_]', '_', 'g'
  );
  IF length(base_username) < 2 THEN
    base_username := 'user';
  END IF;

  candidate_username := base_username;
  -- WHILE loop guarantees NO unique violation on username
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate_username AND id <> NEW.id) LOOP
    candidate_username := base_username || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  END LOOP;

  resolved_avatar := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(NEW.raw_user_meta_data->>'picture', ''),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::text
  );

  resolved_full_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    candidate_username
  );

  -- 2. Insert into profiles with robust exception isolation
  BEGIN
    INSERT INTO public.profiles (id, email, username, full_name, avatar_url)
    VALUES (
      NEW.id,
      NEW.email,
      candidate_username,
      resolved_full_name,
      resolved_avatar
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, public.profiles.email),
      full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
      avatar_url = COALESCE(NULLIF(public.profiles.avatar_url, ''), EXCLUDED.avatar_url);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: full profile insert failed (%), attempting minimal fallback', SQLERRM;
    BEGIN
      INSERT INTO public.profiles (id, username, full_name)
      VALUES (NEW.id, candidate_username, resolved_full_name)
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user: minimal profile fallback also failed: %', SQLERRM;
    END;
  END;

  -- 3. Wallet & Welcome Bonus creation (isolated: must NEVER block signup)
  BEGIN
    INSERT INTO public.native_wallets (user_id, balance, currency)
    VALUES (NEW.id, 1000.00, 'COINS')
    ON CONFLICT (user_id) DO NOTHING
    RETURNING id INTO new_wallet_id;

    IF new_wallet_id IS NOT NULL THEN
      INSERT INTO public.native_transactions (wallet_id, type, amount, description, status, idempotency_key)
      VALUES (new_wallet_id, 'cashback', 1000.00, 'Welcome Bonus 🎁', 'completed', 'signup_bonus_' || NEW.id::text)
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: wallet creation deferred (%): ensure_my_wallet will self-heal', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_user RECORD;
  base_username TEXT;
  candidate_username TEXT;
  resolved_avatar TEXT;
  resolved_full_name TEXT;
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN RETURN TRUE; END IF;
  SELECT id, email, raw_user_meta_data INTO v_user FROM auth.users WHERE id = v_uid;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  base_username := regexp_replace(lower(COALESCE(v_user.raw_user_meta_data->>'username', split_part(COALESCE(v_user.email, 'user'), '@', 1), 'user')), '[^a-z0-9_]', '_', 'g');
  IF length(base_username) < 2 THEN base_username := 'user'; END IF;
  candidate_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate_username AND id <> v_uid) LOOP
    candidate_username := base_username || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  END LOOP;
  resolved_avatar := COALESCE(NULLIF(v_user.raw_user_meta_data->>'avatar_url', ''), NULLIF(v_user.raw_user_meta_data->>'picture', ''), 'https://api.dicebear.com/7.x/personas/svg?seed=' || candidate_username);
  resolved_full_name := COALESCE(NULLIF(v_user.raw_user_meta_data->>'full_name', ''), NULLIF(v_user.raw_user_meta_data->>'name', ''), candidate_username);
  INSERT INTO public.profiles (id, email, username, full_name, avatar_url, is_bot)
  VALUES (v_uid, v_user.email, candidate_username, resolved_full_name, resolved_avatar, FALSE)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.native_wallets (user_id, balance, currency) VALUES (v_uid, 1000.00, 'COINS') ON CONFLICT (user_id) DO NOTHING;
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Profiles (never allow unauthenticated reads or direct client inserts)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users or admins can update profile" ON public.profiles;
CREATE POLICY "Users or admins can update profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Push tokens (owner-only writes; owner or admin SELECT for broadcast targeting)
DROP POLICY IF EXISTS "Users manage own push token" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users or admins read push tokens" ON public.user_push_tokens;
CREATE POLICY "Users or admins read push tokens"
  ON public.user_push_tokens FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users insert own push token" ON public.user_push_tokens;
CREATE POLICY "Users insert own push token"
  ON public.user_push_tokens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own push token" ON public.user_push_tokens;
CREATE POLICY "Users update own push token"
  ON public.user_push_tokens FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own push token" ON public.user_push_tokens;
CREATE POLICY "Users delete own push token"
  ON public.user_push_tokens FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Follows, Blocks, Topic Follows
DROP POLICY IF EXISTS "Follows viewable by authenticated" ON public.follows;
CREATE POLICY "Follows viewable by authenticated" ON public.follows FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users manage own follows" ON public.follows;
CREATE POLICY "Users manage own follows" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "Users delete own follows" ON public.follows;
CREATE POLICY "Users delete own follows" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users view own blocks" ON public.blocks;
CREATE POLICY "Users view own blocks" ON public.blocks FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "Users create own blocks" ON public.blocks;
CREATE POLICY "Users create own blocks" ON public.blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "Users delete own blocks" ON public.blocks;
CREATE POLICY "Users delete own blocks" ON public.blocks FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users manage own topic follows" ON public.topic_follows;
CREATE POLICY "Users manage own topic follows" ON public.topic_follows FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User Presence
DROP POLICY IF EXISTS "Users can view all presence" ON public.user_presence;
CREATE POLICY "Users can view all presence" ON public.user_presence FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can insert own presence" ON public.user_presence;
CREATE POLICY "Users can insert own presence" ON public.user_presence FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can upsert own presence" ON public.user_presence;
CREATE POLICY "Users can upsert own presence" ON public.user_presence FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Profile Views
DROP POLICY IF EXISTS "Profile views privacy" ON public.profile_views;
CREATE POLICY "Profile views privacy" ON public.profile_views FOR SELECT TO authenticated
  USING (auth.uid() = profile_id OR auth.uid() = viewer_id);
DROP POLICY IF EXISTS "Users log profile views" ON public.profile_views;
CREATE POLICY "Users log profile views" ON public.profile_views FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = viewer_id AND viewer_id <> profile_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='user_presence') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
  END IF;
END $$;
