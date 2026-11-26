-- ============================================================================
-- Migration: 20261126_03_fix_achievements_trigger.sql
-- Purpose:
--   1. Fix foreign key mismatch between achievements (UUID) and
--      master_achievements (TEXT slug) in check_achievements() so post
--      creation never crashes on user_achievements_achievement_id_fkey.
--   2. Add self-healing ensure_my_profile() RPC & backfill any auth.users
--      missing a public.profiles row so follows_follower_id_fkey never fails.
-- ============================================================================

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

-- Self-healing profile creator for any authenticated user missing a public.profiles row
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
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
    RETURN TRUE;
  END IF;

  SELECT id, email, raw_user_meta_data
  INTO v_user
  FROM auth.users
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  base_username := regexp_replace(
    lower(COALESCE(v_user.raw_user_meta_data->>'username', split_part(COALESCE(v_user.email, 'user'), '@', 1), 'user')),
    '[^a-z0-9_]', '_', 'g'
  );
  IF length(base_username) < 2 THEN
    base_username := 'user';
  END IF;

  candidate_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate_username AND id <> v_uid) LOOP
    candidate_username := base_username || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  END LOOP;

  resolved_avatar := COALESCE(
    NULLIF(v_user.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(v_user.raw_user_meta_data->>'picture', ''),
    'https://api.dicebear.com/7.x/personas/svg?seed=' || candidate_username || '&backgroundColor=b6e3f4,c0aede,d1d4f9'
  );

  resolved_full_name := COALESCE(
    NULLIF(v_user.raw_user_meta_data->>'full_name', ''),
    NULLIF(v_user.raw_user_meta_data->>'name', ''),
    candidate_username
  );

  INSERT INTO public.profiles (id, email, username, full_name, avatar_url, is_bot)
  VALUES (v_uid, v_user.email, candidate_username, resolved_full_name, resolved_avatar, FALSE)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.native_wallets (user_id, balance, currency)
  VALUES (v_uid, 1000.00, 'COINS')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;

-- Backfill any remaining auth.users missing a profile row
INSERT INTO public.profiles (id, email, username, full_name, avatar_url, is_bot)
SELECT
  u.id,
  u.email,
  COALESCE(
    NULLIF(regexp_replace(lower(COALESCE(u.raw_user_meta_data->>'username', split_part(COALESCE(u.email, ''), '@', 1), 'user')), '[^a-z0-9_]', '_', 'g'), ''),
    'user'
  ) || '_' || substr(replace(u.id::text, '-', ''), 1, 6),
  COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), NULLIF(u.raw_user_meta_data->>'name', ''), 'User'),
  COALESCE(NULLIF(u.raw_user_meta_data->>'avatar_url', ''), NULLIF(u.raw_user_meta_data->>'picture', ''), 'https://api.dicebear.com/7.x/personas/svg?seed=' || u.id::text),
  FALSE
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT DO NOTHING;
