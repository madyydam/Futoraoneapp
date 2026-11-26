/*
================================================================================
SECTION 07: GAMIFICATION — XP, Levels, Achievements, Streaks, User Roles
================================================================================
Tables: achievements, user_achievements, user_roles
Functions: calculate_level, give_xp, update_user_streak,
           check_achievements, trigger_xp_on_activity
================================================================================
*/

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

  -- Unlock master_achievements slugs when master_achievements table exists
  IF to_regclass('public.master_achievements') IS NOT NULL THEN
    BEGIN
      IF condition_type_to_check = 'posts_count' AND current_val >= 1 THEN
        INSERT INTO public.user_achievements (user_id, achievement_id)
        VALUES (target_user_id, 'first_post')
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
      ELSIF condition_type_to_check = 'likes_received' AND current_val >= 1 THEN
        INSERT INTO public.user_achievements (user_id, achievement_id)
        VALUES (target_user_id, 'first_like')
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
      ELSIF condition_type_to_check = 'code_posts' AND current_val >= 10 THEN
        INSERT INTO public.user_achievements (user_id, achievement_id)
        VALUES (target_user_id, 'code_master')
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  FOR ach IN SELECT * FROM public.achievements WHERE condition_type = condition_type_to_check LOOP
    IF current_val >= ach.condition_value THEN
      BEGIN
        INSERT INTO public.user_achievements (user_id, achievement_id)
        VALUES (target_user_id, ach.id::TEXT)
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
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
