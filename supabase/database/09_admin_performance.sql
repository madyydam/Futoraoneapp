/*
================================================================================
SECTION 09: ADMIN, AUDIT, CONFIG, PII PROTECTION & PERFORMANCE
================================================================================
Tables: admin_logs, app_config
RPCs:   review_verification_request, log_admin_action, get_admin_users_page,
        get_admin_wallet_users
Covers: admin moderation policies (has_role), audit log, global app config,
        performance indexes, profile PII column protection, internal function
        EXECUTE privilege revokes, waitlist RLS
================================================================================
*/

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

-- Admin-only role summary counts (Real Users vs Bots vs Admins)
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

-- Admin-only RPC to toggle bot classification with audit log
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

-- Revoke table-level SELECT & grant ONLY safe non-PII, non-bot columns to authenticated
REVOKE SELECT ON public.profiles FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (email, fcm_token, last_digest_at, is_bot) ON public.profiles FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  safe_cols TEXT;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
  INTO safe_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name NOT IN ('email', 'fcm_token', 'last_digest_at', 'is_bot', 'one_signal_player_id');

  IF safe_cols IS NOT NULL THEN
    EXECUTE format('GRANT SELECT (%s) ON public.profiles TO authenticated', safe_cols);
  END IF;
END $$;

GRANT SELECT ON public.profiles TO service_role;
GRANT UPDATE (email, fcm_token, last_digest_at, is_bot) ON public.profiles TO service_role;

GRANT EXECUTE ON FUNCTION public.get_admin_users_page(INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_user_role_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_bot_status(UUID, BOOLEAN) TO authenticated;

-- Complete User Deletion RPC (Super Admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_user_completely(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  is_admin_user BOOLEAN;
BEGIN
  is_admin_user := (CURRENT_USER IN ('postgres', 'service_role'))
    OR (current_setting('role', true) = 'service_role')
    OR public.has_role(auth.uid(), 'admin');

  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Forbidden: only administrators can delete users completely.';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own administrator account.';
  END IF;

  DELETE FROM public.notifications WHERE user_id = target_user_id OR actor_id = target_user_id;
  DELETE FROM public.conversation_participants WHERE user_id = target_user_id;
  DELETE FROM public.typing_indicators WHERE user_id = target_user_id;
  DELETE FROM public.user_push_tokens WHERE user_id = target_user_id;
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  IF to_regclass('public.reviews') IS NOT NULL THEN
    DELETE FROM public.reviews WHERE reviewer_id = target_user_id OR reviewee_id = target_user_id;
  END IF;

  IF to_regclass('public.reports') IS NOT NULL THEN
    DELETE FROM public.reports WHERE target_type = 'user' AND target_id = target_user_id;
  END IF;

  IF to_regclass('public.native_transactions') IS NOT NULL AND to_regclass('public.native_wallets') IS NOT NULL THEN
    DELETE FROM public.native_transactions WHERE wallet_id IN (SELECT id FROM public.native_wallets WHERE user_id = target_user_id);
    DELETE FROM public.native_wallets WHERE user_id = target_user_id;
  END IF;

  IF to_regclass('public.coin_transactions') IS NOT NULL THEN
    DELETE FROM public.coin_transactions WHERE user_id = target_user_id;
  END IF;

  IF to_regclass('public.user_wallet') IS NOT NULL THEN
    DELETE FROM public.user_wallet WHERE id = target_user_id;
  END IF;

  BEGIN
    DELETE FROM storage.objects WHERE owner = target_user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;

  BEGIN
    INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
    VALUES (
      auth.uid(),
      'DELETE_USER_COMPLETELY',
      'user',
      target_user_id,
      jsonb_build_object('timestamp', NOW(), 'deleted_by', auth.uid())
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user_completely(UUID) TO authenticated, service_role;

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

-- Lock down legacy exec_sql helper if present on live DB (never expose to anon/authenticated)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'exec_sql'
  ) THEN
    REVOKE ALL ON FUNCTION public.exec_sql(TEXT) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO service_role;
  END IF;
END $$;
