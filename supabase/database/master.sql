-- ================================================================================
-- FUTORAONE MASTER DATABASE SETUP (Single-Shot, Idempotent)
-- ================================================================================
-- HOW TO RUN:
--   1. Open: https://supabase.com/dashboard/project/sbzsgeokspmkewrmuqgi/sql
--   2. Paste this ENTIRE file into the SQL Editor
--   3. Click RUN once
-- ================================================================================

BEGIN;

-- ============================================================
-- SECTION: 01_core
-- ============================================================

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
BEGIN
  base_username := regexp_replace(
    lower(COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'user')),
    '[^a-z0-9_]', '_', 'g'
  );
  IF length(base_username) < 2 THEN
    base_username := 'user';
  END IF;

  candidate_username := base_username;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate_username AND id <> NEW.id) THEN
    candidate_username := base_username || '_' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  END IF;

  resolved_avatar := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(NEW.raw_user_meta_data->>'picture', ''),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::text
  );

  INSERT INTO public.profiles (id, email, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    candidate_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', candidate_username),
    resolved_avatar
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    avatar_url = COALESCE(NULLIF(public.profiles.avatar_url, ''), EXCLUDED.avatar_url);

  INSERT INTO public.native_wallets (user_id, balance, currency)
  VALUES (NEW.id, 1000.00, 'COINS')
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO new_wallet_id;

  IF new_wallet_id IS NOT NULL THEN
    INSERT INTO public.native_transactions (wallet_id, type, amount, description, status, idempotency_key)
    VALUES (new_wallet_id, 'cashback', 1000.00, 'Welcome Bonus 🎁', 'completed', 'signup_bonus_' || NEW.id::text)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

-- ============================================================
-- SECTION: 04_groups
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure ON DELETE CASCADE when re-running on existing DBs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'groups_created_by_fkey') THEN
    ALTER TABLE public.groups DROP CONSTRAINT groups_created_by_fkey;
    ALTER TABLE public.groups
      ADD CONSTRAINT groups_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- updated_at trigger for groups
DROP TRIGGER IF EXISTS set_updated_at_groups ON public.groups;
CREATE TRIGGER set_updated_at_groups
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Membership helper (SECURITY DEFINER avoids recursive RLS lookups)
CREATE OR REPLACE FUNCTION public.check_group_membership(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Groups
DROP POLICY IF EXISTS "Groups are viewable by participants" ON public.groups;
CREATE POLICY "Groups are viewable by participants" ON public.groups
  FOR SELECT TO authenticated
  USING (is_public = true OR public.check_group_membership(id, auth.uid()));

DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
CREATE POLICY "Users can create groups" ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_not_banned(auth.uid()));

DROP POLICY IF EXISTS "Creators can update groups" ON public.groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON public.groups;
CREATE POLICY "Group admins can update groups" ON public.groups
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Creators can delete groups" ON public.groups;
CREATE POLICY "Creators can delete groups" ON public.groups
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- group_members
DROP POLICY IF EXISTS "Group members are viewable by participants" ON public.group_members;
CREATE POLICY "Group members are viewable by participants" ON public.group_members
  FOR SELECT TO authenticated
  USING (public.check_group_membership(group_id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can join public groups" ON public.group_members;
DROP POLICY IF EXISTS "Users join public groups or admins add members" ON public.group_members;
CREATE POLICY "Users join public groups or admins add members" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      auth.uid() = user_id AND role = 'member'
      AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.is_public = true)
    )
    OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update member roles" ON public.group_members;
CREATE POLICY "Admins can update member roles" ON public.group_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  )
  WITH CHECK (
    (
      EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.created_by = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = group_members.group_id AND g.created_by = group_members.user_id AND group_members.role <> 'admin'
    )
  );

DROP POLICY IF EXISTS "Members can leave or admins can remove" ON public.group_members;
CREATE POLICY "Members can leave or admins can remove" ON public.group_members
  FOR DELETE TO authenticated
  USING (
    (
      auth.uid() = user_id
      AND NOT EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.created_by = auth.uid())
    )
    OR (
      NOT EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.created_by = group_members.user_id)
      AND (
        EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.created_by = auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.group_members gm
          WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
        )
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='groups') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='group_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
  END IF;
END $$;

-- ============================================================
-- SECTION: 05_communities
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  is_public BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS banner_url TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'communities_created_by_fkey') THEN
    ALTER TABLE public.communities DROP CONSTRAINT communities_created_by_fkey;
    ALTER TABLE public.communities
      ADD CONSTRAINT communities_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.community_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at_communities ON public.communities;
CREATE TRIGGER set_updated_at_communities
  BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Membership helper
CREATE OR REPLACE FUNCTION public.check_community_membership(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = p_community_id AND user_id = p_user_id
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- Communities
DROP POLICY IF EXISTS "Communities are viewable by everyone" ON public.communities;
CREATE POLICY "Communities are viewable by everyone" ON public.communities
  FOR SELECT TO authenticated
  USING (is_public = true OR public.check_community_membership(id, auth.uid()));

DROP POLICY IF EXISTS "Users can create communities" ON public.communities;
CREATE POLICY "Users can create communities" ON public.communities
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_not_banned(auth.uid()));

DROP POLICY IF EXISTS "Admins can update communities" ON public.communities;
CREATE POLICY "Admins can update communities" ON public.communities
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Creator can delete community" ON public.communities;
CREATE POLICY "Creator can delete community" ON public.communities
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- Channels
DROP POLICY IF EXISTS "Channels are viewable by community members" ON public.community_channels;
CREATE POLICY "Channels are viewable by community members" ON public.community_channels
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id AND (c.is_public = true OR public.check_community_membership(c.id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Admins can manage channels" ON public.community_channels;
CREATE POLICY "Admins can manage channels" ON public.community_channels
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Creator can insert channels on own community" ON public.community_channels;
CREATE POLICY "Creator can insert channels on own community" ON public.community_channels
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.created_by = auth.uid())
  );

-- community_members
DROP POLICY IF EXISTS "Members are viewable by community members" ON public.community_members;
CREATE POLICY "Members are viewable by community members" ON public.community_members
  FOR SELECT TO authenticated
  USING (public.check_community_membership(community_id, auth.uid()));

DROP POLICY IF EXISTS "Users can join public communities" ON public.community_members;
DROP POLICY IF EXISTS "Users join public communities or admins add members" ON public.community_members;
CREATE POLICY "Users join public communities or admins add members" ON public.community_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      auth.uid() = user_id AND role = 'member'
      AND EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.is_public = true)
    )
    OR EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update community member roles" ON public.community_members;
CREATE POLICY "Admins can update community member roles" ON public.community_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
    )
  )
  WITH CHECK (
    (
      EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.created_by = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.community_members cm
        WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_members.community_id AND c.created_by = community_members.user_id AND community_members.role <> 'admin'
    )
  );

DROP POLICY IF EXISTS "Members can leave communities" ON public.community_members;
DROP POLICY IF EXISTS "Members leave or admins remove community members" ON public.community_members;
CREATE POLICY "Members leave or admins remove community members" ON public.community_members
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='communities') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.communities;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='community_channels') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_channels;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='community_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_members;
  END IF;
END $$;

-- ============================================================
-- SECTION: 03_messages_chat
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  wallpaper_config JSONB DEFAULT '{"type": "transparent"}'::jsonb,
  bubble_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS wallpaper_config JSONB DEFAULT '{"type": "transparent"}'::jsonb,
  ADD COLUMN IF NOT EXISTS bubble_config JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Backfill missing columns on existing tables (safe to re-run)
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.community_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'normal' CHECK (message_type IN ('normal', 'idea', 'decision', 'action')),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.room_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Sparkles',
  color TEXT DEFAULT 'purple',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, name)
);

CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread_dm ON public.messages(conversation_id, sender_id, created_at DESC)
  WHERE is_read = FALSE AND conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER HELPERS & CHAT RPCs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_conversation_participation(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id
  );
END;
$$;

-- Re-assert group/community helpers safely
CREATE OR REPLACE FUNCTION public.check_group_membership(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_community_membership(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = p_community_id AND user_id = p_user_id
  );
END;
$$;

-- Atomic 1:1 conversation creation with block check and advisory lock
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  conv_id UUID;
  lock_key BIGINT;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF other_user_id IS NULL OR other_user_id = me THEN
    RAISE EXCEPTION 'Invalid target user';
  END IF;
  IF NOT public.is_not_banned(me) THEN
    RAISE EXCEPTION 'Account is suspended';
  END IF;
  IF public.are_users_blocked(me, other_user_id) THEN
    RAISE EXCEPTION 'Cannot start conversation with a blocked user';
  END IF;

  lock_key := hashtext(LEAST(me::text, other_user_id::text) || ':' || GREATEST(me::text, other_user_id::text));
  PERFORM pg_advisory_xact_lock(lock_key);

  SELECT c.id INTO conv_id
  FROM public.conversations c
  JOIN public.conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = me
  JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = other_user_id
  LIMIT 1;

  IF conv_id IS NULL THEN
    INSERT INTO public.conversations DEFAULT VALUES RETURNING id INTO conv_id;
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (conv_id, me), (conv_id, other_user_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN conv_id;
END;
$$;

-- Batched DM conversation summary RPC (eliminates N+1 queries in Messages & unread counter)
CREATE OR REPLACE FUNCTION public.get_my_conversations_summary()
RETURNS TABLE (
  conversation_id UUID,
  updated_at TIMESTAMPTZ,
  is_pinned BOOLEAN,
  is_archived BOOLEAN,
  last_read_at TIMESTAMPTZ,
  other_user_id UUID,
  other_username TEXT,
  other_full_name TEXT,
  other_avatar_url TEXT,
  last_message_content TEXT,
  last_message_created_at TIMESTAMPTZ,
  unread_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS conversation_id,
    c.updated_at,
    my_cp.is_pinned,
    my_cp.is_archived,
    my_cp.last_read_at,
    other_p.id AS other_user_id,
    other_p.username AS other_username,
    other_p.full_name AS other_full_name,
    other_p.avatar_url AS other_avatar_url,
    lm.content AS last_message_content,
    lm.created_at AS last_message_created_at,
    COALESCE(uc.cnt, 0) AS unread_count
  FROM public.conversation_participants my_cp
  JOIN public.conversations c ON c.id = my_cp.conversation_id
  JOIN public.conversation_participants other_cp
    ON other_cp.conversation_id = c.id AND other_cp.user_id <> auth.uid()
  JOIN public.profiles other_p ON other_p.id = other_cp.user_id
  LEFT JOIN LATERAL (
    SELECT m.content, m.created_at
    FROM public.messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM public.messages m
    WHERE m.conversation_id = c.id
      AND m.sender_id <> auth.uid()
      AND m.is_read = FALSE
  ) uc ON TRUE
  WHERE my_cp.user_id = auth.uid()
  ORDER BY my_cp.is_pinned DESC, COALESCE(lm.created_at, c.updated_at) DESC
  LIMIT 50;
$$;

-- Guard message updates (must remain SECURITY INVOKER so CURRENT_USER reflects caller)
CREATE OR REPLACE FUNCTION public.guard_message_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  is_privileged BOOLEAN;
  can_pin BOOLEAN := FALSE;
BEGIN
  is_privileged := (CURRENT_USER IN ('postgres', 'supabase_admin', 'service_role'))
    OR (current_setting('role', true) = 'service_role')
    OR public.has_role(auth.uid(), 'admin');

  IF is_privileged THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.group_id IS DISTINCT FROM OLD.group_id
     OR NEW.channel_id IS DISTINCT FROM OLD.channel_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Forbidden: immutable message metadata cannot be modified';
  END IF;

  IF auth.uid() IS DISTINCT FROM OLD.sender_id AND NEW.content IS DISTINCT FROM OLD.content THEN
    RAISE EXCEPTION 'Forbidden: cannot edit another user''s message content';
  END IF;

  IF NEW.is_pinned IS DISTINCT FROM OLD.is_pinned THEN
    IF OLD.conversation_id IS NOT NULL THEN
      can_pin := public.check_conversation_participation(OLD.conversation_id, auth.uid());
    ELSIF OLD.group_id IS NOT NULL THEN
      can_pin := EXISTS (
        SELECT 1 FROM public.groups g
        WHERE g.id = OLD.group_id AND g.created_by = auth.uid()
      ) OR EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = OLD.group_id AND gm.user_id = auth.uid() AND gm.role IN ('admin', 'moderator')
      );
    ELSIF OLD.channel_id IS NOT NULL THEN
      can_pin := EXISTS (
        SELECT 1 FROM public.community_channels cc
        JOIN public.communities c ON c.id = cc.community_id
        WHERE cc.id = OLD.channel_id AND c.created_by = auth.uid()
      ) OR EXISTS (
        SELECT 1 FROM public.community_channels cc
        JOIN public.community_members cm ON cm.community_id = cc.community_id
        WHERE cc.id = OLD.channel_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator')
      );
    END IF;

    IF NOT can_pin THEN
      RAISE EXCEPTION 'Forbidden: insufficient permissions to pin or unpin messages';
    END IF;
  END IF;

  IF NEW.is_read IS DISTINCT FROM OLD.is_read AND auth.uid() = OLD.sender_id THEN
    RAISE EXCEPTION 'Forbidden: sender cannot mark own message as read by recipient';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_message_updates ON public.messages;
CREATE TRIGGER trg_guard_message_updates
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_message_updates();

-- Message notification (DMs only)
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receiver_id UUID;
  sender_name TEXT;
BEGIN
  IF NEW.conversation_id IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO receiver_id FROM public.conversation_participants
  WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id LIMIT 1;
  SELECT COALESCE(full_name, username) INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  IF receiver_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, data)
    VALUES (receiver_id, 'message', 'New message from ' || COALESCE(sender_name, 'Member'), LEFT(NEW.content, 160), NEW.sender_id,
            jsonb_build_object('conversation_id', NEW.conversation_id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_new_message ON public.messages;
CREATE TRIGGER trigger_notify_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS (DM + Group + Community)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (public.check_conversation_participation(id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert conversations" ON public.conversations;
CREATE POLICY "Users can insert conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_not_banned(auth.uid()));

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE TO authenticated
  USING (public.check_conversation_participation(id, auth.uid()));

-- conversation_participants (NO direct client INSERT policy — closed IDOR; use get_or_create_conversation RPC)
DROP POLICY IF EXISTS "Users can view own conversation participants" ON public.conversation_participants;
CREATE POLICY "Users can view own conversation participants" ON public.conversation_participants
  FOR SELECT TO authenticated
  USING (public.check_conversation_participation(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert own conversation participants" ON public.conversation_participants;

DROP POLICY IF EXISTS "Users can update own conversation participants" ON public.conversation_participants;
CREATE POLICY "Users can update own conversation participants" ON public.conversation_participants
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Messages SELECT (all 3 contexts)
DROP POLICY IF EXISTS "Messages are viewable by participants" ON public.messages;
CREATE POLICY "Messages are viewable by participants" ON public.messages
  FOR SELECT TO authenticated
  USING (
    CASE
      WHEN conversation_id IS NOT NULL THEN
        public.check_conversation_participation(conversation_id, auth.uid())
      WHEN group_id IS NOT NULL THEN
        public.check_group_membership(group_id, auth.uid())
      WHEN channel_id IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM public.community_channels cc
          WHERE cc.id = channel_id AND public.check_community_membership(cc.community_id, auth.uid())
        )
      ELSE FALSE
    END
  );

-- Messages INSERT (enforces auth.uid() = sender_id + non-banned + active participation)
DROP POLICY IF EXISTS "Users can send messages to groups they are in" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to channels they are in" ON public.messages;
DROP POLICY IF EXISTS "Authenticated members send own messages" ON public.messages;
CREATE POLICY "Authenticated members send own messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_not_banned(auth.uid())
    AND (
      (conversation_id IS NOT NULL AND public.check_conversation_participation(conversation_id, auth.uid()))
      OR (group_id IS NOT NULL AND public.check_group_membership(group_id, auth.uid()))
      OR (channel_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.community_channels cc
        WHERE cc.id = channel_id AND public.check_community_membership(cc.community_id, auth.uid())
      ))
    )
  );

-- Messages UPDATE (trigger guard_message_updates protects metadata, edits & pins)
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
DROP POLICY IF EXISTS "Participants can update read or message type" ON public.messages;
CREATE POLICY "Participants can update read or message type" ON public.messages
  FOR UPDATE TO authenticated
  USING (
    (conversation_id IS NOT NULL AND public.check_conversation_participation(conversation_id, auth.uid()))
    OR (group_id IS NOT NULL AND public.check_group_membership(group_id, auth.uid()))
    OR (channel_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.community_channels cc
      WHERE cc.id = channel_id AND public.check_community_membership(cc.community_id, auth.uid())
    ))
  );

-- Room categories & Typing indicators
DROP POLICY IF EXISTS "Room categories viewable by conversation participants" ON public.room_categories;
CREATE POLICY "Room categories viewable by conversation participants" ON public.room_categories
  FOR SELECT TO authenticated
  USING (public.check_conversation_participation(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Room categories manageable by participants" ON public.room_categories;
CREATE POLICY "Room categories manageable by participants" ON public.room_categories
  FOR ALL TO authenticated
  USING (public.check_conversation_participation(conversation_id, auth.uid()))
  WITH CHECK (public.check_conversation_participation(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Typing indicators participant access" ON public.typing_indicators;
CREATE POLICY "Typing indicators participant access" ON public.typing_indicators
  FOR ALL TO authenticated
  USING (public.check_conversation_participation(conversation_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.check_conversation_participation(conversation_id, auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='typing_indicators') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
  END IF;
END $$;

-- ============================================================
-- SECTION: 02_social
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PROJECTS & PROJECT LIKES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tech_stack TEXT[],
  image_url TEXT,
  github_url TEXT,
  live_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- POSTS, LIKES & COMMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  is_project_update BOOLEAN DEFAULT FALSE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_project_update BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON public.posts USING GIN (tags);

CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- REELS, STORIES, REACTIONS, SAVES, TAGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  category TEXT DEFAULT 'Tech',
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍', '❤️', '🔥', '💡', '🎉')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON public.post_reactions(post_id);

CREATE TABLE IF NOT EXISTS public.saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_tags (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS, REPORTS, WAITLIST, VERIFICATION, POPUPS, FEEDBACK, EMAIL LOGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'like',
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  title TEXT,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id) WHERE is_read = false;

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'user', 'comment')),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.verification_requests
  DROP CONSTRAINT IF EXISTS verification_requests_user_id_status_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_requests_one_pending
  ON public.verification_requests(user_id)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'announcement' CHECK (type IN ('info', 'announcement', 'feature_launch')),
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'new_users', 'existing_users')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.user_popup_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  popup_id UUID NOT NULL REFERENCES public.broadcast_messages(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, popup_id)
);

CREATE TABLE IF NOT EXISTS public.app_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  bug_report TEXT NOT NULL,
  feature_suggestion TEXT,
  platform TEXT NOT NULL DEFAULT 'web',
  app_version TEXT NOT NULL DEFAULT '1.0.0',
  device_info TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('welcome', 'login', 'digest_5day', 'test')),
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  message_id TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_logs_one_welcome_per_user
  ON public.email_logs(user_id)
  WHERE email_type = 'welcome' AND status IN ('pending', 'sent');

CREATE INDEX IF NOT EXISTS idx_email_logs_user_type_created
  ON public.email_logs(user_id, email_type, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.extract_hashtags()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.tags := ARRAY(
    SELECT DISTINCT substring(match[1] from 1)
    FROM regexp_matches(NEW.content, '#([a-zA-Z0-9_]+)', 'g') AS match
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_extract_hashtags ON public.posts;
CREATE TRIGGER trigger_extract_hashtags
  BEFORE INSERT OR UPDATE OF content ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.extract_hashtags();

DROP FUNCTION IF EXISTS public.delete_expired_stories();
CREATE OR REPLACE FUNCTION public.delete_expired_stories()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.stories WHERE expires_at < NOW();
END;
$$;

DROP FUNCTION IF EXISTS public.get_waitlist_position(UUID);
CREATE OR REPLACE FUNCTION public.get_waitlist_position(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_at TIMESTAMPTZ;
  v_pos INTEGER;
BEGIN
  SELECT created_at INTO v_created_at FROM public.waitlist WHERE user_id = user_uuid;
  IF v_created_at IS NULL THEN RETURN 0; END IF;
  SELECT COUNT(*) + 1 INTO v_pos FROM public.waitlist WHERE created_at < v_created_at;
  RETURN v_pos;
END;
$$;

DROP FUNCTION IF EXISTS public.check_rate_limit(TEXT, INT, INTERVAL);
CREATE OR REPLACE FUNCTION public.check_rate_limit(limit_key TEXT, limit_count INT, window_interval INTERVAL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  curr_count INT;
BEGIN
  INSERT INTO public.rate_limit_counters (key, count, window_start)
  VALUES (limit_key, 1, NOW())
  ON CONFLICT (key) DO UPDATE
  SET count = CASE WHEN (NOW() - rate_limit_counters.window_start) > window_interval THEN 1 ELSE rate_limit_counters.count + 1 END,
      window_start = CASE WHEN (NOW() - rate_limit_counters.window_start) > window_interval THEN NOW() ELSE rate_limit_counters.window_start END
  RETURNING count INTO curr_count;
  RETURN curr_count <= limit_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_new_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, actor_id)
  VALUES (NEW.following_id, 'follow', 'New Follower', 'Someone started following you', NEW.follower_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_new_follow ON public.follows;
CREATE TRIGGER trigger_notify_on_new_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_follow();

CREATE OR REPLACE FUNCTION public.notify_on_new_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author_id UUID;
  liker_name TEXT;
BEGIN
  SELECT user_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
  SELECT COALESCE(full_name, username) INTO liker_name FROM public.profiles WHERE id = NEW.user_id;
  IF post_author_id IS NOT NULL AND post_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, post_id)
    VALUES (post_author_id, 'like', 'New Like', COALESCE(liker_name, 'Someone') || ' liked your post', NEW.user_id, NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_new_like ON public.post_reactions;
CREATE TRIGGER trigger_notify_on_new_like
  AFTER INSERT ON public.post_reactions
  FOR EACH ROW WHEN (NEW.emoji = '❤️') EXECUTE FUNCTION public.notify_on_new_like();

CREATE OR REPLACE FUNCTION public.notify_on_new_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author_id UUID;
  commenter_name TEXT;
BEGIN
  SELECT user_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
  SELECT COALESCE(full_name, username) INTO commenter_name FROM public.profiles WHERE id = NEW.user_id;
  IF post_author_id IS NOT NULL AND post_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, post_id)
    VALUES (post_author_id, 'comment', 'New Comment', COALESCE(commenter_name, 'Someone') || ' commented on your post', NEW.user_id, NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_new_comment ON public.comments;
CREATE TRIGGER trigger_notify_on_new_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_comment();

-- Deduplicated 24h profile-view notification trigger (no direct client notifications insert needed)
CREATE OR REPLACE FUNCTION public.notify_on_profile_view()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.profile_id IS NULL OR NEW.viewer_id IS NULL OR NEW.profile_id = NEW.viewer_id THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = NEW.profile_id
      AND n.actor_id = NEW.viewer_id
      AND n.type = 'profile_view'
      AND n.created_at > NOW() - INTERVAL '24 hours'
  ) THEN
    INSERT INTO public.notifications (user_id, actor_id, type, title, message)
    VALUES (NEW.profile_id, NEW.viewer_id, 'profile_view', 'Profile View', 'Someone viewed your profile');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_profile_view ON public.profile_views;
CREATE TRIGGER trigger_notify_on_profile_view
  AFTER INSERT ON public.profile_views
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_profile_view();

-- ─────────────────────────────────────────────────────────────────────────────
-- HARDENED RLS ACROSS ALL SOCIAL TABLES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_popup_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Projects & Project Likes
DROP POLICY IF EXISTS "Projects viewable by authenticated" ON public.projects;
CREATE POLICY "Projects viewable by authenticated" ON public.projects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users create own projects" ON public.projects;
CREATE POLICY "Users create own projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_not_banned(auth.uid()));
DROP POLICY IF EXISTS "Users update own projects" ON public.projects;
CREATE POLICY "Users update own projects" ON public.projects FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users or admins delete projects" ON public.projects;
CREATE POLICY "Users or admins delete projects" ON public.projects FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Project likes viewable" ON public.project_likes;
CREATE POLICY "Project likes viewable" ON public.project_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users manage own project likes" ON public.project_likes;
CREATE POLICY "Users manage own project likes" ON public.project_likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Posts, Likes, Comments, Saves, Reactions, Tags
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Posts viewable by authenticated" ON public.posts;
CREATE POLICY "Posts viewable by authenticated" ON public.posts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can create own posts" ON public.posts;
CREATE POLICY "Users can create own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_not_banned(auth.uid()));
DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can delete any post" ON public.posts;
DROP POLICY IF EXISTS "Admin full post control" ON public.posts;
DROP POLICY IF EXISTS "Users or admins can delete posts" ON public.posts;
CREATE POLICY "Users or admins can delete posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Likes viewable" ON public.likes;
CREATE POLICY "Likes viewable" ON public.likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users manage own likes" ON public.likes;
CREATE POLICY "Users manage own likes" ON public.likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Comments viewable by authenticated" ON public.comments;
CREATE POLICY "Comments viewable by authenticated" ON public.comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can create own comments" ON public.comments;
CREATE POLICY "Users can create own comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_not_banned(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.comments;
DROP POLICY IF EXISTS "Admin full comment control" ON public.comments;
DROP POLICY IF EXISTS "Users or admins delete comments" ON public.comments;
CREATE POLICY "Users or admins delete comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Saves owner only" ON public.saves;
CREATE POLICY "Saves owner only" ON public.saves FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reactions viewable" ON public.post_reactions;
CREATE POLICY "Reactions viewable" ON public.post_reactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users manage own reactions" ON public.post_reactions;
CREATE POLICY "Users manage own reactions" ON public.post_reactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Tags viewable" ON public.tags;
CREATE POLICY "Tags viewable" ON public.tags FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Tags insertable" ON public.tags;
CREATE POLICY "Tags insertable" ON public.tags FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Post tags viewable" ON public.post_tags;
CREATE POLICY "Post tags viewable" ON public.post_tags FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Post owners manage post tags" ON public.post_tags;
CREATE POLICY "Post owners manage post tags" ON public.post_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()));

-- Stories & Story Views
DROP POLICY IF EXISTS "Allow anyone to view stories" ON public.stories;
DROP POLICY IF EXISTS "Authenticated view active stories" ON public.stories;
CREATE POLICY "Authenticated view active stories" ON public.stories FOR SELECT TO authenticated USING (expires_at > NOW() OR user_id = auth.uid());
DROP POLICY IF EXISTS "Allow authenticated users to insert stories" ON public.stories;
DROP POLICY IF EXISTS "Users insert own stories" ON public.stories;
CREATE POLICY "Users insert own stories" ON public.stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_not_banned(auth.uid()));
DROP POLICY IF EXISTS "Allow users to delete their own stories" ON public.stories;
DROP POLICY IF EXISTS "Users or admins delete stories" ON public.stories;
CREATE POLICY "Users or admins delete stories" ON public.stories FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Story views viewable by owner or viewer" ON public.story_views;
CREATE POLICY "Story views viewable by owner or viewer" ON public.story_views FOR SELECT TO authenticated
  USING (auth.uid() = viewer_id OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users insert own story views" ON public.story_views;
CREATE POLICY "Users insert own story views" ON public.story_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = viewer_id);

-- Notifications (server triggers create; users read/mark own as read)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reports
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Only admins can view reports" ON public.reports;
CREATE POLICY "Only admins can view reports" ON public.reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Only admins can update reports" ON public.reports;
CREATE POLICY "Only admins can update reports" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Broadcasts, Popups, Feedback, Email Logs
DROP POLICY IF EXISTS "Broadcasts readable" ON public.broadcast_messages;
CREATE POLICY "Broadcasts readable" ON public.broadcast_messages FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage broadcasts" ON public.broadcast_messages;
CREATE POLICY "Admins manage broadcasts" ON public.broadcast_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users manage own popup status" ON public.user_popup_status;
CREATE POLICY "Users manage own popup status" ON public.user_popup_status FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users submit own feedback" ON public.app_feedback;
CREATE POLICY "Users submit own feedback" ON public.app_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users or admins view feedback" ON public.app_feedback;
CREATE POLICY "Users or admins view feedback" ON public.app_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update feedback" ON public.app_feedback;
CREATE POLICY "Admins update feedback" ON public.app_feedback FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users or admins view own email logs" ON public.email_logs;
CREATE POLICY "Users or admins view own email logs" ON public.email_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='posts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='stories') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='reports') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
  END IF;
END $$;

-- ============================================================
-- SECTION: 06_economy_wallet
-- ============================================================

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
-- NATIVE WALLET (100% In-App Futora Coin Ledger)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.native_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'COINS',
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

-- Deduplicate legacy rows before enforcing unique indexes
DELETE FROM public.gig_applications a
USING public.gig_applications b
WHERE a.ctid < b.ctid AND a.gig_id = b.gig_id AND a.applicant_id = b.applicant_id;

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

DELETE FROM public.founder_applications a
USING public.founder_applications b
WHERE a.ctid < b.ctid AND a.listing_id = b.listing_id AND a.applicant_id = b.applicant_id;

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

-- Backfill wallets for existing users present in both auth.users and public.profiles (safe to re-run)
WITH inserted_wallets AS (
  INSERT INTO public.native_wallets (user_id, balance, currency)
  SELECT p.id, 1000.00, 'COINS'
  FROM public.profiles p
  INNER JOIN auth.users u ON u.id = p.id
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id, user_id
)
INSERT INTO public.native_transactions (wallet_id, type, amount, description, status, idempotency_key)
SELECT w.id, 'cashback', 1000.00, 'Welcome Bonus 🎁', 'completed', 'signup_bonus_' || w.user_id::text
FROM inserted_wallets w
ON CONFLICT DO NOTHING;

-- In-app self-heal RPC: ensures authenticated user always has their native wallet row
DROP FUNCTION IF EXISTS public.ensure_my_wallet();
CREATE OR REPLACE FUNCTION public.ensure_my_wallet()
RETURNS public.native_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  v_wallet public.native_wallets%ROWTYPE;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_wallet FROM public.native_wallets WHERE user_id = me;
  IF FOUND THEN
    RETURN v_wallet;
  END IF;

  INSERT INTO public.native_wallets (user_id, balance, currency)
  VALUES (me, 1000.00, 'COINS')
  ON CONFLICT (user_id) DO NOTHING
  RETURNING * INTO v_wallet;

  IF v_wallet.id IS NOT NULL THEN
    INSERT INTO public.native_transactions (wallet_id, type, amount, description, status, idempotency_key)
    VALUES (v_wallet.id, 'cashback', 1000.00, 'Welcome Bonus 🎁', 'completed', 'signup_bonus_' || me::text)
    ON CONFLICT DO NOTHING;
    RETURN v_wallet;
  END IF;

  SELECT * INTO v_wallet FROM public.native_wallets WHERE user_id = me;
  RETURN v_wallet;
END;
$$;

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
    VALUES (me, 1000.00, 'COINS')
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
    VALUES (me, 1000.00, 'COINS')
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
    -- Upsert the Game Wizard achievement (id is UUID on live DB, insert by name if not exists)
    INSERT INTO public.achievements (name, description, icon)
    SELECT 'Game Wizard', 'Won 10 arcade games', 'gamepad'
    WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE name = 'Game Wizard');

    INSERT INTO public.user_achievements (user_id, achievement_id)
    SELECT me, id FROM public.achievements WHERE name = 'Game Wizard' LIMIT 1
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

-- ============================================================
-- SECTION: 07_gamification
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  criteria JSONB,
  condition_type TEXT,
  condition_value INTEGER DEFAULT 1,
  xp_reward INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Idempotent column guards: add any columns that may be missing in existing live DB
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS criteria JSONB;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS condition_type TEXT;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS condition_value INTEGER DEFAULT 1;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 100;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES public.achievements(id),
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Level calculation (sqrt-based curve)
DROP FUNCTION IF EXISTS public.calculate_level(INTEGER);
CREATE OR REPLACE FUNCTION public.calculate_level(xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF xp < 100 THEN RETURN 1; END IF;
  RETURN floor(sqrt(xp::float / 100)) + 1;
END;
$$;

-- Give XP and recalculate level (internal-only: execute revoked from clients)
DROP FUNCTION IF EXISTS public.give_xp(UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.give_xp(user_id UUID, amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_xp INTEGER;
  new_xp INTEGER;
  new_level INTEGER;
BEGIN
  SELECT xp INTO current_xp FROM public.profiles WHERE id = user_id;
  IF NOT FOUND THEN RETURN; END IF;
  new_xp := current_xp + amount;
  new_level := public.calculate_level(new_xp);
  UPDATE public.profiles
  SET xp = new_xp, level = new_level, last_activity_date = NOW()
  WHERE id = user_id;
END;
$$;

-- Streak updater (internal-only)
DROP FUNCTION IF EXISTS public.update_user_streak(UUID);
CREATE OR REPLACE FUNCTION public.update_user_streak(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_active TIMESTAMPTZ;
  current_s INTEGER;
  longest_s INTEGER;
BEGIN
  SELECT last_activity_date, current_streak, longest_streak
  INTO last_active, current_s, longest_s
  FROM public.profiles WHERE id = target_user_id;

  IF last_active < CURRENT_DATE AND last_active >= CURRENT_DATE - INTERVAL '1 day' THEN
    current_s := current_s + 1;
  ELSIF last_active < CURRENT_DATE - INTERVAL '1 day' THEN
    current_s := 1;
  END IF;

  IF current_s > longest_s THEN longest_s := current_s; END IF;

  UPDATE public.profiles
  SET current_streak = current_s, longest_streak = longest_s, last_activity_date = NOW()
  WHERE id = target_user_id;
END;
$$;

-- Check and unlock achievements (internal-only)
DROP FUNCTION IF EXISTS public.check_achievements(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.check_achievements(target_user_id UUID, condition_type_to_check TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_val INTEGER;
  ach RECORD;
BEGIN
  IF condition_type_to_check = 'posts_count' THEN
    SELECT COUNT(*) INTO current_val FROM public.posts WHERE user_id = target_user_id;
  ELSIF condition_type_to_check = 'likes_received' THEN
    SELECT COUNT(*) INTO current_val FROM public.likes l JOIN public.posts p ON l.post_id = p.id WHERE p.user_id = target_user_id;
  ELSIF condition_type_to_check = 'code_posts' THEN
    SELECT COUNT(*) INTO current_val FROM public.posts WHERE user_id = target_user_id AND (content ILIKE '%```%' OR content ILIKE '%code%');
  ELSE
    RETURN;
  END IF;

  FOR ach IN SELECT * FROM public.achievements WHERE condition_type = condition_type_to_check LOOP
    IF current_val >= ach.condition_value THEN
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (target_user_id, ach.id)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- XP trigger on posts & comments
CREATE OR REPLACE FUNCTION public.trigger_xp_on_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'posts' THEN
    PERFORM public.give_xp(NEW.user_id, 50);
    PERFORM public.check_achievements(NEW.user_id, 'posts_count');
    IF NEW.content ILIKE '%```%' OR NEW.content ILIKE '%code%' THEN
      PERFORM public.give_xp(NEW.user_id, 50);
      PERFORM public.check_achievements(NEW.user_id, 'code_posts');
    END IF;
  ELSIF TG_TABLE_NAME = 'comments' THEN
    PERFORM public.give_xp(NEW.user_id, 20);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_post_created_xp ON public.posts;
CREATE TRIGGER on_post_created_xp
  AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.trigger_xp_on_activity();

DROP TRIGGER IF EXISTS on_comment_created_xp ON public.comments;
CREATE TRIGGER on_comment_created_xp
  AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.trigger_xp_on_activity();

-- Prevent clients from directly invoking internal XP, streak, achievement, or trigger RPCs
REVOKE ALL ON FUNCTION public.give_xp(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_user_streak(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_achievements(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_xp_on_activity() FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Achievements readable" ON public.achievements;
CREATE POLICY "Achievements readable" ON public.achievements
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "User achievements readable" ON public.user_achievements;
CREATE POLICY "User achievements readable" ON public.user_achievements
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users view own roles or admin" ON public.user_roles;
CREATE POLICY "Users view own roles or admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────────────────────────────────────────

-- Seed default achievements only on a fresh DB (safe no-op if any rows already exist or schema differs)
DO $$
DECLARE
  v_id_type TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.achievements LIMIT 1) THEN
    SELECT data_type INTO v_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'id';

    BEGIN
      IF v_id_type = 'uuid' THEN
        INSERT INTO public.achievements (id, name, description, icon, condition_type, condition_value)
        VALUES
          (gen_random_uuid(), 'First Post',        'Created your first post',   'pencil', 'posts_count',    1),
          (gen_random_uuid(), 'Social Butterfly',  'Received 50 likes',          'heart',  'likes_received', 50),
          (gen_random_uuid(), 'Bug Hunter',        'Reported a bug',             'bug',    NULL,             0),
          (gen_random_uuid(), 'Code Wizard',       'Posted 5 code snippets',     'code',   'code_posts',     5);
      ELSE
        INSERT INTO public.achievements (id, name, description, icon, condition_type, condition_value)
        VALUES
          ('first-post',       'First Post',        'Created your first post',   'pencil', 'posts_count',    1),
          ('social-butterfly', 'Social Butterfly',  'Received 50 likes',          'heart',  'likes_received', 50),
          ('bug-hunter',       'Bug Hunter',        'Reported a bug',             'bug',    NULL,             0),
          ('code-wizard',      'Code Wizard',       'Posted 5 code snippets',     'code',   'code_posts',     5)
        ON CONFLICT (id) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Achievements seed skipped: %', SQLERRM;
    END;
  END IF;
END $$;

-- ============================================================
-- SECTION: 08_storage
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- BUCKETS (safe to re-run)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('post_images', 'post_images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('group-avatars', 'group-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('community-avatars', 'community-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- DROP OLD POLICIES (clean slate)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Access" ON storage.objects;
  DROP POLICY IF EXISTS "Post images public access" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow individual updates" ON storage.objects;
  DROP POLICY IF EXISTS "Allow individual deletes" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own folder" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own folder" ON storage.objects;
  DROP POLICY IF EXISTS "Admins full access" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated Insert - post-images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated Update - post-images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated Delete - post-images" ON storage.objects;
  DROP POLICY IF EXISTS "Public Access - post-images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated Insert - post_images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated Update - post_images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated Delete - post_images" ON storage.objects;
  DROP POLICY IF EXISTS "Public Access - post_images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own post images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own post images" ON storage.objects;
  DROP POLICY IF EXISTS "All public buckets - public read" ON storage.objects;
  DROP POLICY IF EXISTS "All public buckets - public read v2" ON storage.objects;
  DROP POLICY IF EXISTS "Avatars - authenticated upload" ON storage.objects;
  DROP POLICY IF EXISTS "Avatars - authenticated update" ON storage.objects;
  DROP POLICY IF EXISTS "Avatars - authenticated delete" ON storage.objects;
  DROP POLICY IF EXISTS "Post images - authenticated upload" ON storage.objects;
  DROP POLICY IF EXISTS "Post images - authenticated update" ON storage.objects;
  DROP POLICY IF EXISTS "Post images - authenticated delete" ON storage.objects;
  DROP POLICY IF EXISTS "Group & community avatars - authenticated upload" ON storage.objects;
  DROP POLICY IF EXISTS "Group & community avatars - authenticated update" ON storage.objects;
  DROP POLICY IF EXISTS "Group & community avatars - authenticated delete" ON storage.objects;
  DROP POLICY IF EXISTS "Group & community avatars - owner folder upload" ON storage.objects;
  DROP POLICY IF EXISTS "Group & community avatars - owner folder update" ON storage.objects;
  DROP POLICY IF EXISTS "Group & community avatars - owner folder delete" ON storage.objects;
  DROP POLICY IF EXISTS "Stories - owner folder upload" ON storage.objects;
  DROP POLICY IF EXISTS "Stories - owner folder delete" ON storage.objects;
  DROP POLICY IF EXISTS "Admins full storage access" ON storage.objects;
  DROP POLICY IF EXISTS "Admins full storage access v2" ON storage.objects;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- UNIFIED PUBLIC READ (all public buckets)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "All public buckets - public read v2"
ON storage.objects FOR SELECT
USING (bucket_id IN ('avatars', 'post-images', 'post_images', 'group-avatars', 'community-avatars', 'stories'));

-- ─────────────────────────────────────────────────────────────────────────────
-- AVATARS (profile pictures — strict owner-folder isolation)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Avatars - authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Avatars - authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars - authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────────────────────
-- POST IMAGES (both bucket variants — strict owner-folder isolation)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Post images - authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('post-images', 'post_images') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Post images - authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('post-images', 'post_images') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Post images - authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('post-images', 'post_images') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP & COMMUNITY AVATARS (owner-folder isolation)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Group & community avatars - owner folder upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('group-avatars', 'community-avatars') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Group & community avatars - owner folder update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('group-avatars', 'community-avatars') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Group & community avatars - owner folder delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('group-avatars', 'community-avatars') AND (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────────────────────
-- STORIES (owner-folder isolation)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Stories - owner folder upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Stories - owner folder delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN FULL ACCESS (moderation via RBAC user_roles)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Admins full storage access v2"
ON storage.objects FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- SECTION: 09_admin_performance
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN AUDIT LOGS & GLOBAL CONFIG TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO public.app_config (key, value) VALUES
  ('site_name', '"FutoraOne"'::jsonb),
  ('support_email', '"support@futoraone.com"'::jsonb),
  ('public_registration', 'true'::jsonb),
  ('maintenance_mode', 'false'::jsonb),
  ('force_2fa_admins', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- PERFORMANCE INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Messaging
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON public.messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Groups
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);

-- Communities
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON public.community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_channels_community_id ON public.community_channels(community_id);

-- Social
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN RPCs (RBAC-GATED)
-- ─────────────────────────────────────────────────────────────────────────────

-- Atomic verification review RPC for admins
DROP FUNCTION IF EXISTS public.review_verification_request(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.review_verification_request(
  p_request_id UUID,
  p_action TEXT,
  p_reviewer_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  v_req RECORD;
BEGIN
  IF me IS NULL OR NOT public.has_role(me, 'admin') THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;
  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  SELECT * INTO v_req FROM public.verification_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification request not found';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Verification request already %', v_req.status;
  END IF;

  UPDATE public.verification_requests
  SET status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END,
      reviewed_at = NOW(),
      reviewer_notes = p_reviewer_notes
  WHERE id = p_request_id;

  IF p_action = 'approve' THEN
    UPDATE public.profiles
    SET is_verified = TRUE, verification_category = v_req.category
    WHERE id = v_req.user_id;
  END IF;

  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    me,
    CASE WHEN p_action = 'approve' THEN 'APPROVE_VERIFICATION' ELSE 'REJECT_VERIFICATION' END,
    'verification_request',
    p_request_id::text,
    jsonb_build_object('user_id', v_req.user_id, 'category', v_req.category, 'notes', p_reviewer_notes)
  );

  RETURN jsonb_build_object('success', true, 'status', CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END);
END;
$$;

-- Admin audit log helper RPC
DROP FUNCTION IF EXISTS public.log_admin_action(TEXT, TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, COALESCE(p_details, '{}'::jsonb));
END;
$$;

-- Admin-only paginated directory RPC (replaces direct client .select('*') on profiles)
DROP FUNCTION IF EXISTS public.get_admin_users_page(INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.get_admin_users_page(
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_verified BOOLEAN,
  verification_category TEXT,
  is_banned BOOLEAN,
  is_admin BOOLEAN,
  created_at TIMESTAMPTZ,
  balance DECIMAL(12,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.is_verified,
    p.verification_category,
    p.is_banned,
    EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'
    ) AS is_admin,
    p.created_at,
    COALESCE(w.balance, 0.00) AS balance
  FROM public.profiles p
  LEFT JOIN public.native_wallets w ON w.user_id = p.id
  ORDER BY p.created_at DESC
  OFFSET GREATEST(0, COALESCE(p_offset, 0))
  LIMIT LEAST(100, GREATEST(1, COALESCE(p_limit, 50)));
END;
$$;

-- Admin-only wallet user directory RPC (safe email access for admins)
DROP FUNCTION IF EXISTS public.get_admin_wallet_users();
CREATE OR REPLACE FUNCTION public.get_admin_wallet_users()
RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  balance DECIMAL(12,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.email,
    COALESCE(w.balance, 0.00) AS balance
  FROM public.profiles p
  LEFT JOIN public.native_wallets w ON w.user_id = p.id
  ORDER BY COALESCE(w.balance, 0.00) DESC, p.created_at DESC
  LIMIT 500;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN MODERATION & CONFIG POLICIES (RBAC via public.has_role())
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view admin logs" ON public.admin_logs;
CREATE POLICY "Admins view admin logs" ON public.admin_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "App config readable" ON public.app_config;
CREATE POLICY "App config readable" ON public.app_config
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage app config" ON public.app_config;
CREATE POLICY "Admins manage app config" ON public.app_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can moderate any post or comment (extends 02_social.sql)
DROP POLICY IF EXISTS "Admin full post control" ON public.posts;
CREATE POLICY "Admin full post control" ON public.posts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin full comment control" ON public.comments;
CREATE POLICY "Admin full comment control" ON public.comments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Verification requests
DROP POLICY IF EXISTS "Users can submit verification request" ON public.verification_requests;
CREATE POLICY "Users can submit verification request" ON public.verification_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own verification request" ON public.verification_requests;
DROP POLICY IF EXISTS "Users or admins view verification requests" ON public.verification_requests;
CREATE POLICY "Users or admins view verification requests" ON public.verification_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can review verification requests" ON public.verification_requests;
DROP POLICY IF EXISTS "Admins review verification requests" ON public.verification_requests;
CREATE POLICY "Admins review verification requests" ON public.verification_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Waitlist
DROP POLICY IF EXISTS "Users can join waitlist" ON public.waitlist;
CREATE POLICY "Users can join waitlist" ON public.waitlist
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own waitlist entry" ON public.waitlist;
CREATE POLICY "Users can view own waitlist entry" ON public.waitlist
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- PII PROTECTION & INTERNAL FUNCTION PRIVILEGE REVOCATION
-- ─────────────────────────────────────────────────────────────────────────────

-- Migrate any legacy profile fcm_tokens into owner-only user_push_tokens & scrub profiles
INSERT INTO public.user_push_tokens (user_id, fcm_token)
SELECT p.id, p.fcm_token
FROM public.profiles p
INNER JOIN auth.users u ON u.id = p.id
WHERE p.fcm_token IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET fcm_token = EXCLUDED.fcm_token;

UPDATE public.profiles SET fcm_token = NULL WHERE fcm_token IS NOT NULL;

-- Revoke direct client reads/writes to PII/internal columns on public.profiles
REVOKE SELECT (email, fcm_token, last_digest_at) ON public.profiles FROM anon, authenticated;
REVOKE UPDATE (email, fcm_token, last_digest_at) ON public.profiles FROM anon, authenticated;
GRANT SELECT (email, fcm_token, last_digest_at) ON public.profiles TO service_role;
GRANT UPDATE (email, fcm_token, last_digest_at) ON public.profiles TO service_role;

-- Prevent clients from directly invoking internal XP, streak, achievement, trigger, or rate-limit RPCs
REVOKE ALL ON FUNCTION public.give_xp(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_user_streak(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_achievements(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_xp_on_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_admin_flag() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_trust_score() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_profile_view() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INT, INTERVAL) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INTERVAL) TO service_role;

-- Allow authenticated users to call ensure_my_wallet (self-heal their own wallet row)
GRANT EXECUTE ON FUNCTION public.ensure_my_wallet() TO authenticated;

COMMIT;

-- POST-RUN: npx supabase gen types typescript --project-id sbzsgeokspmkewrmuqgi > src/integrations/supabase/types.ts
