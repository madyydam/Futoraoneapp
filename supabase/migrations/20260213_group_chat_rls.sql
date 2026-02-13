-- Enable RLS for Groups and Members
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Add to Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;

-- RLS Policies for Groups
CREATE POLICY "Groups are viewable by participants" ON public.groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = public.groups.id AND user_id = auth.uid()
    ) OR is_public = true
  );

CREATE POLICY "Users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update groups" ON public.groups
  FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for Group Members
CREATE POLICY "Group members are viewable by participants" ON public.group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members pm 
      WHERE pm.group_id = public.group_members.group_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can join public groups" ON public.group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups g 
      WHERE g.id = group_id AND (g.is_public = true OR g.created_by = auth.uid())
    )
  );

-- Update Messages Policy for Groups
DROP POLICY IF EXISTS "Messages are viewable by participants" ON public.messages;
CREATE POLICY "Messages are viewable by participants" ON public.messages
  FOR SELECT USING (
    CASE 
      WHEN conversation_id IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM public.conversation_participants 
          WHERE conversation_id = public.messages.conversation_id AND user_id = auth.uid()
        )
      WHEN group_id IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM public.group_members 
          WHERE group_id = public.messages.group_id AND user_id = auth.uid()
        )
      ELSE FALSE
    END
  );

CREATE POLICY "Users can send messages to groups they are in" ON public.messages
  FOR INSERT WITH CHECK (
    CASE 
      WHEN conversation_id IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM public.conversation_participants 
          WHERE conversation_id = conversation_id AND user_id = auth.uid()
        )
      WHEN group_id IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM public.group_members 
          WHERE group_id = group_id AND user_id = auth.uid()
        )
      ELSE FALSE
    END
  );
