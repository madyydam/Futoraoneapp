/*
================================================================================
SECTION 04: GROUPS — Group Chat System (Admin Controls, Members, RLS)
================================================================================
Tables: groups, group_members
Note: group messages are stored in public.messages (group_id column)
      which is defined in 03_messages_chat.sql
================================================================================
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  is_public BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- updated_at trigger for groups
DROP TRIGGER IF EXISTS set_updated_at_groups ON public.groups;
CREATE TRIGGER set_updated_at_groups
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Groups
DROP POLICY IF EXISTS "Groups are viewable by participants" ON public.groups;
CREATE POLICY "Groups are viewable by participants" ON public.groups
  FOR SELECT USING (is_public = true OR public.check_group_membership(id, auth.uid()));

DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
CREATE POLICY "Users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creators can update groups" ON public.groups;
CREATE POLICY "Creators can update groups" ON public.groups
  FOR UPDATE USING (
    auth.uid() = created_by OR
    public.check_group_membership(id, auth.uid())
  );

DROP POLICY IF EXISTS "Creators can delete groups" ON public.groups;
CREATE POLICY "Creators can delete groups" ON public.groups
  FOR DELETE USING (auth.uid() = created_by);

-- group_members
DROP POLICY IF EXISTS "Group members are viewable by participants" ON public.group_members;
CREATE POLICY "Group members are viewable by participants" ON public.group_members
  FOR SELECT USING (public.check_group_membership(group_id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can join public groups" ON public.group_members;
CREATE POLICY "Authenticated users can join public groups" ON public.group_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id
      AND (g.is_public = true OR g.created_by = auth.uid()))
    OR public.check_group_membership(group_id, auth.uid())  -- admins can add members
  );

DROP POLICY IF EXISTS "Admins can update member roles" ON public.group_members;
CREATE POLICY "Admins can update member roles" ON public.group_members
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid() AND gm.role = 'admin')
  );

DROP POLICY IF EXISTS "Members can leave or admins can remove" ON public.group_members;
CREATE POLICY "Members can leave or admins can remove" ON public.group_members
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid() AND gm.role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='groups') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='group_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
  END IF;
END $$;
