-- ============================================================================
-- Migration: 20261126_02_fix_notifications_triggers.sql
-- Purpose:   Ensure public.notifications has title/message/data columns on
--            older live DBs, and skip inserting notification bloat for bots.
-- ============================================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS data JSONB;

CREATE OR REPLACE FUNCTION public.notify_on_new_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.following_id AND is_bot = TRUE) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, type, title, message, actor_id)
  VALUES (NEW.following_id, 'follow', 'New Follower', 'Someone started following you', NEW.follower_id);
  RETURN NEW;
END;
$$;

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
  IF post_author_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = post_author_id AND is_bot = TRUE) THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(full_name, username) INTO commenter_name FROM public.profiles WHERE id = NEW.user_id;
  IF post_author_id IS NOT NULL AND post_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, post_id)
    VALUES (post_author_id, 'comment', 'New Comment', COALESCE(commenter_name, 'Someone') || ' commented on your post', NEW.user_id, NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$;
