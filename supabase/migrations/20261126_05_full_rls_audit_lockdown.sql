-- ============================================================================
-- Migration: 20261126_05_full_rls_audit_lockdown.sql
-- Purpose:   Eliminate legacy permissive RLS policies across ALL private/social
--            tables discovered during live anon security probing (native_wallets,
--            follows, projects, etc.) and lock down column-level PII + is_bot.
-- ============================================================================

-- 1. Revoke ALL table privileges from anon across sensitive & social tables
DO $$
DECLARE
  tbl TEXT;
  target_tables TEXT[] := ARRAY[
    'profiles', 'native_wallets', 'native_transactions',
    'user_wallet', 'coin_transactions', 'user_push_tokens',
    'messages', 'conversations', 'conversation_participants',
    'follows', 'blocks', 'projects', 'project_likes',
    'posts', 'likes', 'comments', 'stories', 'reels',
    'admin_logs', 'email_logs', 'reports',
    'verification_requests', 'app_feedback', 'notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY target_tables LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', tbl);
    END IF;
  END LOOP;
END $$;

-- 2. Dynamically scrub ALL existing SELECT policies on sensitive tables & recreate strict policies
DO $$
DECLARE
  pol RECORD;
  tbl TEXT;
  scrub_tables TEXT[] := ARRAY[
    'profiles', 'native_wallets', 'native_transactions',
    'user_wallet', 'coin_transactions', 'user_push_tokens',
    'follows', 'projects', 'project_likes',
    'messages', 'conversations', 'admin_logs', 'email_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY scrub_tables LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl AND cmd = 'SELECT'
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- 3. Strict authenticated-only SELECT policies + column-level protection on profiles
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

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

-- Wallets & transactions: owner or admin ONLY
CREATE POLICY "Users or admins view native wallet"
  ON public.native_wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users or admins view native transactions"
  ON public.native_transactions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR wallet_id IN (SELECT id FROM public.native_wallets WHERE user_id = auth.uid())
  );

DO $$
BEGIN
  IF to_regclass('public.user_wallet') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "Users can view own wallet" ON public.user_wallet FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), ''admin''))';
  END IF;
  IF to_regclass('public.coin_transactions') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "Users can view own coin transactions" ON public.coin_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;

-- Push tokens: owner or admin ONLY
CREATE POLICY "Users or admins read push tokens"
  ON public.user_push_tokens FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Social graph & projects: authenticated users ONLY
CREATE POLICY "Follows viewable by authenticated"
  ON public.follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "Projects viewable by authenticated"
  ON public.projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Project likes viewable by authenticated"
  ON public.project_likes FOR SELECT TO authenticated USING (true);

-- Conversations & messages: participants ONLY
CREATE POLICY "Users view own conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users view messages in their conversations"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
    )
  );

-- Admin logs & email logs: admin / owner ONLY
CREATE POLICY "Admins view admin logs"
  ON public.admin_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DO $$
BEGIN
  IF to_regclass('public.email_logs') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "Admins view email logs" ON public.email_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;
