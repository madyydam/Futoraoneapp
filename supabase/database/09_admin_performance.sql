/*
================================================================================
SECTION 09: ADMIN & PERFORMANCE — Admin Policies, Indexes, Misc
================================================================================
Covers: admin content moderation policies, performance indexes,
        special utilities (verification, waitlist)
================================================================================
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- PERFORMANCE INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Messaging
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON public.messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Groups
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);

-- Communities
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON public.community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_channels_community_id ON public.community_channels(community_id);

-- Social
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN MODERATION POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Admin can delete any post or comment (extends 02_social.sql)
DROP POLICY IF EXISTS "Admin full post control" ON public.posts;
CREATE POLICY "Admin full post control" ON public.posts
  FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

DROP POLICY IF EXISTS "Admin full comment control" ON public.comments;
CREATE POLICY "Admin full comment control" ON public.comments
  FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

-- Admin can manage verification requests
DROP POLICY IF EXISTS "Admins can review verification requests" ON public.verification_requests;
CREATE POLICY "Admins can review verification requests" ON public.verification_requests
  FOR UPDATE USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

DROP POLICY IF EXISTS "Users can submit verification request" ON public.verification_requests;
CREATE POLICY "Users can submit verification request" ON public.verification_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own verification request" ON public.verification_requests;
CREATE POLICY "Users can view own verification request" ON public.verification_requests
  FOR SELECT USING (auth.uid() = user_id OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

-- Waitlist
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can join waitlist" ON public.waitlist;
CREATE POLICY "Users can join waitlist" ON public.waitlist FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own waitlist entry" ON public.waitlist;
CREATE POLICY "Users can view own waitlist entry" ON public.waitlist FOR SELECT USING (auth.uid() = user_id);
