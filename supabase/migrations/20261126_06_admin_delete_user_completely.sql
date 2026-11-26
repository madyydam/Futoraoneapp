-- ============================================================================
-- Migration: 20261126_06_admin_delete_user_completely.sql
-- Purpose:   1. Ensure public.reviews foreign keys cascade on user deletion.
--            2. Provide an admin-only SECURITY DEFINER RPC to completely delete
--               a user from both `public.profiles` AND `auth.users`. This frees
--               the email address so a user can register again as a fresh account.
--            3. Harden `notify_on_new_message()` so notification failures or
--               missing profiles NEVER abort sending chat messages.
-- ============================================================================

-- 1. Ensure public.reviews foreign keys cascade on user deletion
DO $$
BEGIN
  IF to_regclass('public.reviews') IS NOT NULL THEN
    ALTER TABLE public.reviews
      DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey,
      DROP CONSTRAINT IF EXISTS reviews_reviewee_id_fkey;

    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES auth.users(id) ON DELETE CASCADE,
      ADD CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Complete User Deletion RPC (Super Admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_user_completely(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  is_admin_user BOOLEAN;
BEGIN
  -- Authorization check: caller must be admin or service_role
  is_admin_user := (CURRENT_USER IN ('postgres', 'service_role'))
    OR (current_setting('role', true) = 'service_role')
    OR public.has_role(auth.uid(), 'admin');

  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Forbidden: only administrators can delete users completely.';
  END IF;

  -- Prevent deleting oneself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own administrator account.';
  END IF;

  -- Delete dependent records safely
  DELETE FROM public.notifications WHERE user_id = target_user_id OR actor_id = target_user_id;
  DELETE FROM public.conversation_participants WHERE user_id = target_user_id;
  DELETE FROM public.typing_indicators WHERE user_id = target_user_id;
  DELETE FROM public.user_push_tokens WHERE user_id = target_user_id;
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- Clean up reviews (reviewer or reviewee)
  IF to_regclass('public.reviews') IS NOT NULL THEN
    DELETE FROM public.reviews WHERE reviewer_id = target_user_id OR reviewee_id = target_user_id;
  END IF;

  -- Clean up polymorphic reports targeting the user
  IF to_regclass('public.reports') IS NOT NULL THEN
    DELETE FROM public.reports WHERE target_type = 'user' AND target_id = target_user_id;
  END IF;

  -- Clean up wallet ledgers if present
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

  -- Clean up storage objects owned by user
  BEGIN
    DELETE FROM storage.objects WHERE owner = target_user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Delete profile (cascades follows, blocks, posts, likes, comments, etc.)
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- Delete auth credentials completely (frees email for fresh signup)
  DELETE FROM auth.users WHERE id = target_user_id;

  -- Log admin action
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

-- 3. Harden notify_on_new_message trigger
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receiver_id UUID;
  sender_name TEXT;
  profile_exists BOOLEAN;
BEGIN
  IF NEW.conversation_id IS NULL THEN RETURN NEW; END IF;

  SELECT user_id INTO receiver_id 
  FROM public.conversation_participants
  WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id 
  LIMIT 1;

  IF receiver_id IS NULL THEN RETURN NEW; END IF;

  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.sender_id) INTO profile_exists;
  SELECT COALESCE(full_name, username) INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, data)
    VALUES (
      receiver_id,
      'message',
      'New message from ' || COALESCE(sender_name, 'Member'),
      LEFT(NEW.content, 160),
      CASE WHEN profile_exists THEN NEW.sender_id ELSE NULL END,
      jsonb_build_object('conversation_id', NEW.conversation_id)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_on_new_message: notification deferred or failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
