/*
================================================================================
SECTION 07: GAMIFICATION — XP, Levels, Achievements, Streaks, User Roles
================================================================================
Tables: achievements, user_achievements, user_roles
Functions: calculate_level, give_xp, update_user_streak,
           check_achievements, award_xp, handle_new_post_xp,
           handle_new_comment_xp, trigger_xp_on_activity
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

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES public.achievements(id),
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Level calculation (sqrt-based curve)
CREATE OR REPLACE FUNCTION public.calculate_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF xp < 100 THEN RETURN 1; END IF;
  RETURN floor(sqrt(xp::float / 100)) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Give XP and recalculate level
CREATE OR REPLACE FUNCTION public.give_xp(user_id UUID, amount INTEGER)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Streak updater
CREATE OR REPLACE FUNCTION public.update_user_streak(target_user_id UUID)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check and unlock achievements
CREATE OR REPLACE FUNCTION public.check_achievements(target_user_id UUID, condition_type_to_check TEXT)
RETURNS VOID AS $$
DECLARE
  current_val INTEGER;
  ach RECORD;
BEGIN
  IF condition_type_to_check = 'posts_count' THEN
    SELECT COUNT(*) INTO current_val FROM posts WHERE user_id = target_user_id;
  ELSIF condition_type_to_check = 'likes_received' THEN
    SELECT COUNT(*) INTO current_val FROM likes l JOIN posts p ON l.post_id = p.id WHERE p.user_id = target_user_id;
  ELSIF condition_type_to_check = 'code_posts' THEN
    SELECT COUNT(*) INTO current_val FROM posts WHERE user_id = target_user_id AND (content ILIKE '%```%' OR content ILIKE '%code%');
  ELSE
    RETURN;
  END IF;

  FOR ach IN SELECT * FROM achievements WHERE condition_type = condition_type_to_check LOOP
    IF current_val >= ach.condition_value THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (target_user_id, ach.id)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- XP trigger on posts & comments
CREATE OR REPLACE FUNCTION public.trigger_xp_on_activity()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_created_xp ON public.posts;
CREATE TRIGGER on_post_created_xp
  AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.trigger_xp_on_activity();

DROP TRIGGER IF EXISTS on_comment_created_xp ON public.comments;
CREATE TRIGGER on_comment_created_xp
  AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.trigger_xp_on_activity();

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.achievements (id, name, description, icon, condition_type, condition_value) VALUES
  ('first-post', 'First Post', 'Created your first post', 'pencil', 'posts_count', 1),
  ('social-butterfly', 'Social Butterfly', 'Received 50 likes', 'heart', 'likes_received', 50),
  ('bug-hunter', 'Bug Hunter', 'Reported a bug', 'bug', NULL, 0),
  ('code-wizard', 'Code Wizard', 'Posted 5 code snippets', 'code', 'code_posts', 5)
ON CONFLICT (id) DO NOTHING;
