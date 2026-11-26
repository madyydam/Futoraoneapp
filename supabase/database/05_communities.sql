/*
================================================================================
SECTION 05: COMMUNITIES — Community Hubs, Channels, Members
================================================================================
Tables: communities, community_channels, community_members
Functions: check_community_membership
Note: community messages are in public.messages (channel_id column)
      defined in 03_messages_chat.sql
================================================================================
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  is_public BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS banner_url TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'communities_created_by_fkey') THEN
    ALTER TABLE public.communities DROP CONSTRAINT communities_created_by_fkey;
    ALTER TABLE public.communities
      ADD CONSTRAINT communities_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.community_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at_communities ON public.communities;
CREATE TRIGGER set_updated_at_communities
  BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Membership helper
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

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- Communities
DROP POLICY IF EXISTS "Communities are viewable by everyone" ON public.communities;
CREATE POLICY "Communities are viewable by everyone" ON public.communities
  FOR SELECT TO authenticated
  USING (is_public = true OR public.check_community_membership(id, auth.uid()));

DROP POLICY IF EXISTS "Users can create communities" ON public.communities;
CREATE POLICY "Users can create communities" ON public.communities
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_not_banned(auth.uid()));

DROP POLICY IF EXISTS "Admins can update communities" ON public.communities;
CREATE POLICY "Admins can update communities" ON public.communities
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Creator can delete community" ON public.communities;
CREATE POLICY "Creator can delete community" ON public.communities
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- Channels
DROP POLICY IF EXISTS "Channels are viewable by community members" ON public.community_channels;
CREATE POLICY "Channels are viewable by community members" ON public.community_channels
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id AND (c.is_public = true OR public.check_community_membership(c.id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Admins can manage channels" ON public.community_channels;
CREATE POLICY "Admins can manage channels" ON public.community_channels
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Creator can insert channels on own community" ON public.community_channels;
CREATE POLICY "Creator can insert channels on own community" ON public.community_channels
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.created_by = auth.uid())
  );

-- community_members
DROP POLICY IF EXISTS "Members are viewable by community members" ON public.community_members;
CREATE POLICY "Members are viewable by community members" ON public.community_members
  FOR SELECT TO authenticated
  USING (public.check_community_membership(community_id, auth.uid()));

DROP POLICY IF EXISTS "Users can join public communities" ON public.community_members;
DROP POLICY IF EXISTS "Users join public communities or admins add members" ON public.community_members;
CREATE POLICY "Users join public communities or admins add members" ON public.community_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      auth.uid() = user_id AND role = 'member'
      AND EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.is_public = true)
    )
    OR EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update community member roles" ON public.community_members;
CREATE POLICY "Admins can update community member roles" ON public.community_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
    )
  )
  WITH CHECK (
    (
      EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.created_by = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.community_members cm
        WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_members.community_id AND c.created_by = community_members.user_id AND community_members.role <> 'admin'
    )
  );

DROP POLICY IF EXISTS "Members can leave communities" ON public.community_members;
DROP POLICY IF EXISTS "Members leave or admins remove community members" ON public.community_members;
CREATE POLICY "Members leave or admins remove community members" ON public.community_members
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='communities') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.communities;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='community_channels') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_channels;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='community_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_members;
  END IF;
END $$;
