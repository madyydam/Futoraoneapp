/*
================================================================================
SECTION 01: CORE — Extensions, Types, Profiles, Follows, Blocks
================================================================================
Tables: profiles, follows, blocks, topic_follows, user_presence
Triggers: handle_updated_at, handle_new_user
Functions: get_or_create_conversation (stub for chat section dependency)
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
-- PROFILES TABLE
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

  -- Notifications
  fcm_token TEXT,
  one_signal_player_id TEXT,
  digest_mode BOOLEAN DEFAULT FALSE,
  last_digest_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Gamification
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  badges TEXT[] DEFAULT '{}',
  trust_score INTEGER DEFAULT 50,
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

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_badges ON public.profiles USING GIN(badges);
CREATE INDEX IF NOT EXISTS idx_profiles_fcm_token ON public.profiles(fcm_token);
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity ON public.profiles(last_activity_date DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- FOLLOWS, BLOCKS, TOPIC FOLLOWS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE TABLE IF NOT EXISTS public.topic_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, topic)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- USER PRESENCE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Auto updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- New user setup (profile + wallet + signup bonus)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::text)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name;

  INSERT INTO public.user_wallet (id, coins, reward_claimed)
  VALUES (NEW.id, 1000, FALSE)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.coin_transactions (user_id, type, coins, reason)
  VALUES (NEW.id, 'EARN', 1000, 'Signup Bonus - 1000 Coins');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view all presence" ON public.user_presence;
CREATE POLICY "Users can view all presence" ON public.user_presence FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own presence" ON public.user_presence;
CREATE POLICY "Users can insert own presence" ON public.user_presence FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own presence" ON public.user_presence;
CREATE POLICY "Users can upsert own presence" ON public.user_presence FOR UPDATE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='user_presence') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
  END IF;
END $$;
