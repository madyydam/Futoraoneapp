-- ============================================================================
-- Migration: 20261126_01_bot_schema_admin.sql
-- Purpose:   Add hidden `is_bot` flag on profiles (never readable by regular
--            clients), protect it in trigger guards, and expose it strictly via
--            admin-only SECURITY DEFINER RPCs for the Super Admin Role column.
-- ============================================================================

-- 1. Add is_bot column & index
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_is_bot ON public.profiles(is_bot);

-- 2. Harden guard_profile_privileged_columns() so non-admins cannot tamper with is_bot
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

-- 3. Prevent non-admin clients from querying/reading is_bot via PostgREST
REVOKE SELECT (is_bot) ON public.profiles FROM anon, authenticated;
REVOKE UPDATE (is_bot) ON public.profiles FROM anon, authenticated;
GRANT SELECT (is_bot) ON public.profiles TO service_role;
GRANT UPDATE (is_bot) ON public.profiles TO service_role;

-- 4. Update Admin paginated directory RPC with is_bot, search, role filter & total_count
DROP FUNCTION IF EXISTS public.get_admin_users_page(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_admin_users_page(INTEGER, INTEGER, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.get_admin_users_page(
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL,
  p_role_filter TEXT DEFAULT 'all'
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
  is_bot BOOLEAN,
  created_at TIMESTAMPTZ,
  balance DECIMAL(12,2),
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search TEXT := NULLIF(TRIM(p_search), '');
  v_filter TEXT := COALESCE(NULLIF(LOWER(TRIM(p_role_filter)), ''), 'all');
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
    p.is_bot,
    p.created_at,
    COALESCE(w.balance, 0.00) AS balance,
    COUNT(*) OVER() AS total_count
  FROM public.profiles p
  LEFT JOIN public.native_wallets w ON w.user_id = p.id
  WHERE (
    v_search IS NULL
    OR p.username ILIKE '%' || v_search || '%'
    OR p.full_name ILIKE '%' || v_search || '%'
  )
  AND (
    v_filter = 'all'
    OR (v_filter = 'bot' AND p.is_bot = TRUE)
    OR (v_filter = 'real' AND p.is_bot = FALSE)
    OR (v_filter = 'admin' AND EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'
    ))
  )
  ORDER BY p.created_at DESC
  OFFSET GREATEST(0, COALESCE(p_offset, 0))
  LIMIT LEAST(100, GREATEST(1, COALESCE(p_limit, 50)));
END;
$$;

-- 5. Admin-only role summary stats RPC
DROP FUNCTION IF EXISTS public.get_admin_user_role_stats();
CREATE OR REPLACE FUNCTION public.get_admin_user_role_stats()
RETURNS TABLE (
  total_users BIGINT,
  real_users BIGINT,
  bot_users BIGINT,
  admin_users BIGINT
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
    COUNT(*)::BIGINT AS total_users,
    COUNT(*) FILTER (WHERE p.is_bot = FALSE)::BIGINT AS real_users,
    COUNT(*) FILTER (WHERE p.is_bot = TRUE)::BIGINT AS bot_users,
    (SELECT COUNT(DISTINCT ur.user_id)::BIGINT FROM public.user_roles ur WHERE ur.role = 'admin') AS admin_users
  FROM public.profiles p;
END;
$$;

-- 6. Admin-only RPC to toggle bot flag with audit logging
DROP FUNCTION IF EXISTS public.admin_set_user_bot_status(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION public.admin_set_user_bot_status(
  p_user_id UUID,
  p_is_bot BOOLEAN
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

  UPDATE public.profiles
  SET is_bot = COALESCE(p_is_bot, FALSE)
  WHERE id = p_user_id;

  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    CASE WHEN COALESCE(p_is_bot, FALSE) THEN 'MARK_AS_BOT' ELSE 'MARK_AS_REAL_USER' END,
    'profile',
    p_user_id::TEXT,
    jsonb_build_object('is_bot', COALESCE(p_is_bot, FALSE))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_users_page(INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_user_role_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_bot_status(UUID, BOOLEAN) TO authenticated;
