-- ============================================================================
-- Migration: 20261126_04_lockdown_profiles_columns.sql
-- Purpose:   Fix PostgreSQL table-level GRANT bypass so anon/authenticated
--            clients CANNOT read PII (email, fcm_token, last_digest_at,
--            one_signal_player_id) or `is_bot` on public.profiles.
--            Super Admin still reads `is_bot` via SECURITY DEFINER RPCs.
-- ============================================================================

-- 1. Drop any legacy public/anon SELECT policy on profiles
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

-- 2. Revoke table-level SELECT and grant ONLY safe non-PII, non-bot columns to authenticated
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
