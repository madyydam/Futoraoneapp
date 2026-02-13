-- Communities, Channels, and Members
CREATE TABLE public.communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  avatar_url TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.community_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member', -- 'admin', 'moderator', 'member'
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Add channel_id to messages
ALTER TABLE public.messages ADD COLUMN channel_id UUID REFERENCES public.community_channels(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- Add to Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.communities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_members;

-- RLS Policies for Communities
CREATE POLICY "Communities are viewable by everyone" ON public.communities
  FOR SELECT USING (is_public = true OR EXISTS (
    SELECT 1 FROM public.community_members WHERE community_id = id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create communities" ON public.communities
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- RLS Policies for Channels
CREATE POLICY "Channels are viewable by community members" ON public.community_channels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id AND (c.is_public = true OR EXISTS (
        SELECT 1 FROM public.community_members WHERE community_id = c.id AND user_id = auth.uid()
      ))
    )
  );

-- RLS Policies for Community Members
CREATE POLICY "Members are viewable by community members" ON public.community_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.community_members WHERE community_id = public.community_members.community_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join public communities" ON public.community_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.communities WHERE id = community_id AND is_public = true
    )
  );

-- Update Messages Policy to support channels
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
      WHEN channel_id IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM public.community_channels cc
          JOIN public.community_members cm ON cc.community_id = cm.community_id
          WHERE cc.id = public.messages.channel_id AND cm.user_id = auth.uid()
        )
      ELSE FALSE
    END
  );

CREATE POLICY "Users can send messages to channels they are in" ON public.messages
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
      WHEN channel_id IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM public.community_channels cc
          JOIN public.community_members cm ON cc.community_id = cm.community_id
          WHERE cc.id = channel_id AND cm.user_id = auth.uid()
        )
      ELSE FALSE
    END
  );
