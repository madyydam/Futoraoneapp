/*
================================================================================
SECTION 03: MESSAGES & CHAT — DMs, Conversations, Typing Indicators
================================================================================
Tables: conversations, conversation_participants, messages (DM + Group + Channel),
        room_categories, typing_indicators
Functions: check_conversation_participation, get_or_create_conversation,
           get_my_conversations_summary, guard_message_updates, notify_on_new_message
================================================================================
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  wallpaper_config JSONB DEFAULT '{"type": "transparent"}'::jsonb,
  bubble_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Backfill missing columns on existing tables (safe to re-run)
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.community_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'normal' CHECK (message_type IN ('normal', 'idea', 'decision', 'action')),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.room_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Sparkles',
  color TEXT DEFAULT 'purple',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, name)
);

CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread_dm ON public.messages(conversation_id, sender_id, created_at DESC)
  WHERE is_read = FALSE AND conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER HELPERS & CHAT RPCs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_conversation_participation(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id
  );
END;
$$;

-- Re-assert group/community helpers safely
CREATE OR REPLACE FUNCTION public.check_group_membership(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_community_membership(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = p_community_id AND user_id = p_user_id
  );
END;
$$;

-- Atomic 1:1 conversation creation with block check and advisory lock
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  conv_id UUID;
  lock_key BIGINT;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF other_user_id IS NULL OR other_user_id = me THEN
    RAISE EXCEPTION 'Invalid target user';
  END IF;
  IF NOT public.is_not_banned(me) THEN
    RAISE EXCEPTION 'Account is suspended';
  END IF;
  IF public.are_users_blocked(me, other_user_id) THEN
    RAISE EXCEPTION 'Cannot start conversation with a blocked user';
  END IF;

  lock_key := hashtext(LEAST(me::text, other_user_id::text) || ':' || GREATEST(me::text, other_user_id::text));
  PERFORM pg_advisory_xact_lock(lock_key);

  SELECT c.id INTO conv_id
  FROM public.conversations c
  JOIN public.conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = me
  JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = other_user_id
  LIMIT 1;

  IF conv_id IS NULL THEN
    INSERT INTO public.conversations DEFAULT VALUES RETURNING id INTO conv_id;
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (conv_id, me), (conv_id, other_user_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN conv_id;
END;
$$;

-- Batched DM conversation summary RPC (eliminates N+1 queries in Messages & unread counter)
CREATE OR REPLACE FUNCTION public.get_my_conversations_summary()
RETURNS TABLE (
  conversation_id UUID,
  updated_at TIMESTAMPTZ,
  is_pinned BOOLEAN,
  is_archived BOOLEAN,
  last_read_at TIMESTAMPTZ,
  other_user_id UUID,
  other_username TEXT,
  other_full_name TEXT,
  other_avatar_url TEXT,
  last_message_content TEXT,
  last_message_created_at TIMESTAMPTZ,
  unread_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS conversation_id,
    c.updated_at,
    my_cp.is_pinned,
    my_cp.is_archived,
    my_cp.last_read_at,
    other_p.id AS other_user_id,
    other_p.username AS other_username,
    other_p.full_name AS other_full_name,
    other_p.avatar_url AS other_avatar_url,
    lm.content AS last_message_content,
    lm.created_at AS last_message_created_at,
    COALESCE(uc.cnt, 0) AS unread_count
  FROM public.conversation_participants my_cp
  JOIN public.conversations c ON c.id = my_cp.conversation_id
  JOIN public.conversation_participants other_cp
    ON other_cp.conversation_id = c.id AND other_cp.user_id <> auth.uid()
  JOIN public.profiles other_p ON other_p.id = other_cp.user_id
  LEFT JOIN LATERAL (
    SELECT m.content, m.created_at
    FROM public.messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) lm ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM public.messages m
    WHERE m.conversation_id = c.id
      AND m.sender_id <> auth.uid()
      AND m.is_read = FALSE
  ) uc ON TRUE
  WHERE my_cp.user_id = auth.uid()
  ORDER BY my_cp.is_pinned DESC, COALESCE(lm.created_at, c.updated_at) DESC
  LIMIT 50;
$$;

-- Guard message updates (must remain SECURITY INVOKER so CURRENT_USER reflects caller)
CREATE OR REPLACE FUNCTION public.guard_message_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  is_privileged BOOLEAN;
  can_pin BOOLEAN := FALSE;
BEGIN
  is_privileged := (CURRENT_USER IN ('postgres', 'supabase_admin', 'service_role'))
    OR (current_setting('role', true) = 'service_role')
    OR public.has_role(auth.uid(), 'admin');

  IF is_privileged THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.group_id IS DISTINCT FROM OLD.group_id
     OR NEW.channel_id IS DISTINCT FROM OLD.channel_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Forbidden: immutable message metadata cannot be modified';
  END IF;

  IF auth.uid() IS DISTINCT FROM OLD.sender_id AND NEW.content IS DISTINCT FROM OLD.content THEN
    RAISE EXCEPTION 'Forbidden: cannot edit another user''s message content';
  END IF;

  IF NEW.is_pinned IS DISTINCT FROM OLD.is_pinned THEN
    IF OLD.conversation_id IS NOT NULL THEN
      can_pin := public.check_conversation_participation(OLD.conversation_id, auth.uid());
    ELSIF OLD.group_id IS NOT NULL THEN
      can_pin := EXISTS (
        SELECT 1 FROM public.groups g
        WHERE g.id = OLD.group_id AND g.created_by = auth.uid()
      ) OR EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = OLD.group_id AND gm.user_id = auth.uid() AND gm.role IN ('admin', 'moderator')
      );
    ELSIF OLD.channel_id IS NOT NULL THEN
      can_pin := EXISTS (
        SELECT 1 FROM public.community_channels cc
        JOIN public.communities c ON c.id = cc.community_id
        WHERE cc.id = OLD.channel_id AND c.created_by = auth.uid()
      ) OR EXISTS (
        SELECT 1 FROM public.community_channels cc
        JOIN public.community_members cm ON cm.community_id = cc.community_id
        WHERE cc.id = OLD.channel_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator')
      );
    END IF;

    IF NOT can_pin THEN
      RAISE EXCEPTION 'Forbidden: insufficient permissions to pin or unpin messages';
    END IF;
  END IF;

  IF NEW.is_read IS DISTINCT FROM OLD.is_read AND auth.uid() = OLD.sender_id THEN
    RAISE EXCEPTION 'Forbidden: sender cannot mark own message as read by recipient';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_message_updates ON public.messages;
CREATE TRIGGER trg_guard_message_updates
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_message_updates();

-- Message notification (DMs only)
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receiver_id UUID;
  sender_name TEXT;
BEGIN
  IF NEW.conversation_id IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO receiver_id FROM public.conversation_participants
  WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id LIMIT 1;
  SELECT COALESCE(full_name, username) INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  IF receiver_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, data)
    VALUES (receiver_id, 'message', 'New message from ' || COALESCE(sender_name, 'Member'), LEFT(NEW.content, 160), NEW.sender_id,
            jsonb_build_object('conversation_id', NEW.conversation_id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_new_message ON public.messages;
CREATE TRIGGER trigger_notify_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS (DM + Group + Community)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (public.check_conversation_participation(id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert conversations" ON public.conversations;
CREATE POLICY "Users can insert conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_not_banned(auth.uid()));

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE TO authenticated
  USING (public.check_conversation_participation(id, auth.uid()));

-- conversation_participants (NO direct client INSERT policy — closed IDOR; use get_or_create_conversation RPC)
DROP POLICY IF EXISTS "Users can view own conversation participants" ON public.conversation_participants;
CREATE POLICY "Users can view own conversation participants" ON public.conversation_participants
  FOR SELECT TO authenticated
  USING (public.check_conversation_participation(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert own conversation participants" ON public.conversation_participants;

DROP POLICY IF EXISTS "Users can update own conversation participants" ON public.conversation_participants;
CREATE POLICY "Users can update own conversation participants" ON public.conversation_participants
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Messages SELECT (all 3 contexts)
DROP POLICY IF EXISTS "Messages are viewable by participants" ON public.messages;
CREATE POLICY "Messages are viewable by participants" ON public.messages
  FOR SELECT TO authenticated
  USING (
    CASE
      WHEN conversation_id IS NOT NULL THEN
        public.check_conversation_participation(conversation_id, auth.uid())
      WHEN group_id IS NOT NULL THEN
        public.check_group_membership(group_id, auth.uid())
      WHEN channel_id IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM public.community_channels cc
          WHERE cc.id = channel_id AND public.check_community_membership(cc.community_id, auth.uid())
        )
      ELSE FALSE
    END
  );

-- Messages INSERT (enforces auth.uid() = sender_id + non-banned + active participation)
DROP POLICY IF EXISTS "Users can send messages to groups they are in" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to channels they are in" ON public.messages;
DROP POLICY IF EXISTS "Authenticated members send own messages" ON public.messages;
CREATE POLICY "Authenticated members send own messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_not_banned(auth.uid())
    AND (
      (conversation_id IS NOT NULL AND public.check_conversation_participation(conversation_id, auth.uid()))
      OR (group_id IS NOT NULL AND public.check_group_membership(group_id, auth.uid()))
      OR (channel_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.community_channels cc
        WHERE cc.id = channel_id AND public.check_community_membership(cc.community_id, auth.uid())
      ))
    )
  );

-- Messages UPDATE (trigger guard_message_updates protects metadata, edits & pins)
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
DROP POLICY IF EXISTS "Participants can update read or message type" ON public.messages;
CREATE POLICY "Participants can update read or message type" ON public.messages
  FOR UPDATE TO authenticated
  USING (
    (conversation_id IS NOT NULL AND public.check_conversation_participation(conversation_id, auth.uid()))
    OR (group_id IS NOT NULL AND public.check_group_membership(group_id, auth.uid()))
    OR (channel_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.community_channels cc
      WHERE cc.id = channel_id AND public.check_community_membership(cc.community_id, auth.uid())
    ))
  );

-- Room categories & Typing indicators
DROP POLICY IF EXISTS "Room categories viewable by conversation participants" ON public.room_categories;
CREATE POLICY "Room categories viewable by conversation participants" ON public.room_categories
  FOR SELECT TO authenticated
  USING (public.check_conversation_participation(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Room categories manageable by participants" ON public.room_categories;
CREATE POLICY "Room categories manageable by participants" ON public.room_categories
  FOR ALL TO authenticated
  USING (public.check_conversation_participation(conversation_id, auth.uid()))
  WITH CHECK (public.check_conversation_participation(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Typing indicators participant access" ON public.typing_indicators;
CREATE POLICY "Typing indicators participant access" ON public.typing_indicators
  FOR ALL TO authenticated
  USING (public.check_conversation_participation(conversation_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.check_conversation_participation(conversation_id, auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='typing_indicators') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
  END IF;
END $$;
