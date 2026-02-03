-- Performance Optimization: Adding Missing Indexes
-- These indexes help speed up joins and filtered lookups which are frequent in the app.

-- Social Interactions
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON public.post_reactions(post_id);

-- Communications
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);

-- System & Economy
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id) WHERE is_read = false; -- Partial index for unread notifications
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON public.coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);

-- Gig Marketplace & Founders Corner
CREATE INDEX IF NOT EXISTS idx_gig_listings_user_id ON public.gig_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_founder_listings_user_id ON public.founder_listings(user_id);

-- Activity Monitoring
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity ON public.profiles(last_activity_date DESC);
