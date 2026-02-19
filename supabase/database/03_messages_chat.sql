/*
================================================================================
SECTION 03: MESSAGES & CHAT — DMs, Conversations, Typing Indicators
================================================================================
Tables: conversations, conversation_participants, messages (DM context),
        typing_indicators
Functions: check_conversation_participation (SECURITY DEFINER, prevents RLS recursion),
           get_or_create_conversation, notify_on_new_message
NOTE: The messages table also stores group_id and channel_id (set in 04_groups
      and 05_communities). All message RLS covering all three contexts lives here.
================================================================================
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,                                                             -- optional room name
  wallpaper_config JSONB DEFAULT '{"type": "transparent"}'::jsonb,       -- vibe wallpaper
  bubble_config JSONB DEFAULT '{}'::jsonb,                               -- vibe bubble style
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- messages table — supports DMs (conversation_id), Groups (group_id), Community channels (channel_id)
-- conversation_id is nullable because group/community messages don't have one
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,  -- nullable
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,                -- set in 04_groups
  channel_id UUID REFERENCES public.community_channels(id) ON DELETE CASCADE,  -- set in 05_communities
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'normal' CHECK (message_type IN ('normal', 'idea', 'decision', 'action')),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room Intelligence: categorized message buckets inside a conversation
CREATE TABLE IF NOT EXISTS public.room_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Sparkles',
  color TEXT DEFAULT 'purple',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, name)
);

CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER HELPERS (prevent RLS infinite recursion)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_conversation_participation(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_group_membership(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_community_membership(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = p_community_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get or create a 1:1 conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
BEGIN
  SELECT c.id INTO conv_id
  FROM public.conversations c
  JOIN public.conversation_participants cp1 ON c.id = cp1.conversation_id
  JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id
  WHERE cp1.user_id = auth.uid() AND cp2.user_id = other_user_id LIMIT 1;

  IF conv_id IS NULL THEN
    INSERT INTO public.conversations DEFAULT VALUES RETURNING id INTO conv_id;
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (conv_id, auth.uid()), (conv_id, other_user_id);
  END IF;
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Message notification (DMs only)
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER AS $$
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
    VALUES (receiver_id, 'message', 'New message from ' || sender_name, NEW.content, NEW.sender_id,
            jsonb_build_object('conversation_id', NEW.conversation_id));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_new_message ON public.messages;
CREATE TRIGGER trigger_notify_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS (covers all message contexts: DM + Group + Community)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT USING (public.check_conversation_participation(id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert conversations" ON public.conversations;
CREATE POLICY "Users can insert conversations" ON public.conversations
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE USING (public.check_conversation_participation(id, auth.uid()));

-- conversation_participants
DROP POLICY IF EXISTS "Users can view own conversation participants" ON public.conversation_participants;
CREATE POLICY "Users can view own conversation participants" ON public.conversation_participants
  FOR SELECT USING (public.check_conversation_participation(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert own conversation participants" ON public.conversation_participants;
CREATE POLICY "Users can insert own conversation participants" ON public.conversation_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversation participants" ON public.conversation_participants;
CREATE POLICY "Users can update own conversation participants" ON public.conversation_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Messages SELECT (all 3 contexts)
DROP POLICY IF EXISTS "Messages are viewable by participants" ON public.messages;
CREATE POLICY "Messages are viewable by participants" ON public.messages
  FOR SELECT USING (
    CASE
      WHEN conversation_id IS NOT NULL THEN
        public.check_conversation_participation(conversation_id, auth.uid())
      WHEN group_id IS NOT NULL THEN
        public.check_group_membership(group_id, auth.uid())
      WHEN channel_id IS NOT NULL THEN
        EXISTS (SELECT 1 FROM public.community_channels cc
                WHERE cc.id = channel_id
                  AND public.check_community_membership(cc.community_id, auth.uid()))
      ELSE FALSE
    END
  );

-- Messages INSERT (DM + Group)
DROP POLICY IF EXISTS "Users can send messages to groups they are in" ON public.messages;
CREATE POLICY "Users can send messages to groups they are in" ON public.messages
  FOR INSERT WITH CHECK (
    CASE
      WHEN conversation_id IS NOT NULL THEN
        public.check_conversation_participation(conversation_id, auth.uid())
      WHEN group_id IS NOT NULL THEN
        public.check_group_membership(group_id, auth.uid())
      ELSE FALSE
    END
  );

-- Messages INSERT (Community channels)
DROP POLICY IF EXISTS "Users can send messages to channels they are in" ON public.messages;
CREATE POLICY "Users can send messages to channels they are in" ON public.messages
  FOR INSERT WITH CHECK (
    CASE
      WHEN channel_id IS NOT NULL THEN
        EXISTS (SELECT 1 FROM public.community_channels cc
                WHERE cc.id = channel_id
                  AND public.check_community_membership(cc.community_id, auth.uid()))
      ELSE FALSE
    END
  );

-- Messages UPDATE (mark as read)
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
CREATE POLICY "Users can mark messages as read" ON public.messages
  FOR UPDATE USING (
    (conversation_id IS NOT NULL AND public.check_conversation_participation(conversation_id, auth.uid())) OR
    (group_id IS NOT NULL AND public.check_group_membership(group_id, auth.uid())) OR
    (channel_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.community_channels cc
      WHERE cc.id = channel_id AND public.check_community_membership(cc.community_id, auth.uid())
    ))
  )
  WITH CHECK (is_read = true);

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
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='room_categories') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_categories;
  END IF;
END $$;

-- index for room intelligence message type filtering
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(conversation_id, message_type);

-- room_categories RLS
ALTER TABLE public.room_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Room categories viewable by conversation participants" ON public.room_categories;
CREATE POLICY "Room categories viewable by conversation participants" ON public.room_categories
  FOR SELECT USING (public.check_conversation_participation(conversation_id, auth.uid()));
DROP POLICY IF EXISTS "Room categories manageable by participants" ON public.room_categories;
CREATE POLICY "Room categories manageable by participants" ON public.room_categories
  FOR ALL USING (public.check_conversation_participation(conversation_id, auth.uid()));

