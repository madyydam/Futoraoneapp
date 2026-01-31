/*
================================================================================
FUTORAONE - MASTER DATABASE SETUP (CLEAN VERSION)
================================================================================
Generated on: 2026-01-31
Description: This script contains the finalized, non-repetitive schema for FutoraOne.
It allows for a complete database setup from scratch (0-start).
================================================================================
*/

-- =============================================================================
-- 1. EXTENSIONS & TYPES
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

-- =============================================================================
-- 2. CORE: PROFILES & AUTH
-- =============================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT,
  location TEXT DEFAULT 'Pune',
  theme_color TEXT,
  
  -- Social & Links
  github_url TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  instagram_url TEXT,
  tech_skills TEXT[],
  
  -- Status & Verification
  is_verified BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  verification_category TEXT,
  
  -- Notifications & Logic
  fcm_token TEXT,
  one_signal_player_id TEXT,
  digest_mode BOOLEAN DEFAULT FALSE,
  last_digest_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Gamification
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  badges TEXT[] DEFAULT '{}',
  trust_score INTEGER DEFAULT 50,
  
  -- Settings
  settings JSONB DEFAULT '{
    "privacy": {"read_receipts": true, "online_status": true},
    "notifications": {"push": true, "email": true, "marketing": false},
    "theme": {"accent_color": "default"}
  }'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_badges ON public.profiles USING GIN(badges);
CREATE INDEX IF NOT EXISTS idx_profiles_fcm_token ON public.profiles(fcm_token);

-- =============================================================================
-- 3. SOCIAL CORE: POSTS, REELS, STORIES
-- =============================================================================

-- PROJECTS
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tech_stack TEXT[],
  image_url TEXT,
  github_url TEXT,
  live_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- POSTS
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  is_project_update BOOLEAN DEFAULT FALSE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON public.posts USING GIN (tags);

-- LIKES & COMMENTS
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REELS
CREATE TABLE public.reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  category TEXT DEFAULT 'Tech',
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STORIES
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE TABLE public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

-- REACTIONS & SAVES
CREATE TABLE public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍', '❤️', '🔥', '💡', '🎉')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id, emoji)
);

CREATE TABLE public.saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- TAGS
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.post_tags (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- =============================================================================
-- 4. INTERACTIONS: FOLLOWS & BLOCKS
-- =============================================================================

CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE TABLE public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE TABLE public.topic_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, topic)
);

-- =============================================================================
-- 5. COMMUNICATIONS: CHAT & GROUPS
-- =============================================================================

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- =============================================================================
-- 6. ECONOMY & GAMIFICATION
-- =============================================================================

CREATE TABLE public.user_wallet (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins INTEGER NOT NULL DEFAULT 1000,
  reward_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (coins >= 0)
);

CREATE TABLE public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('EARN', 'SPEND')),
  coins INTEGER NOT NULL CHECK (coins > 0),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.feature_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT UNIQUE,
  required_coins INTEGER NOT NULL CHECK (required_coins >= 0)
);

CREATE TABLE public.user_feature_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, feature_name)
);

CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_key TEXT UNIQUE,
  game_name TEXT,
  coin_reward INTEGER DEFAULT 10,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_key TEXT,
  result TEXT CHECK (result IN ('WIN','LOSE','DRAW')),
  coins_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  criteria JSONB,
  xp_reward INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES public.achievements(id),
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);


-- =============================================================================
-- 7. BUSINESS & MARKETPLACE
-- =============================================================================

CREATE TABLE public.founder_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_needed TEXT NOT NULL,
  idea_description TEXT NOT NULL,
  equity_range TEXT NOT NULL,
  stage TEXT NOT NULL,
  industry TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.founder_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.founder_listings(id) ON DELETE CASCADE,
  applicant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  contact_info TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.gig_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR' NOT NULL,
  status TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'assigned', 'completed')),
  location TEXT DEFAULT 'Remote' NOT NULL,
  skills_required TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.gig_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID REFERENCES public.gig_listings(id) ON DELETE CASCADE,
  applicant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  proposal TEXT NOT NULL,
  bid_amount NUMERIC,
  expected_timeline TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.tech_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  liked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(liker_id, liked_id)
);

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID REFERENCES auth.users(id) NOT NULL,
  reviewee_id UUID REFERENCES auth.users(id) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (reviewer_id, reviewee_id)
);


-- =============================================================================
-- 8. SYSTEM & UTILS
-- =============================================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'like',
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  title TEXT,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.rate_limit_counters (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, status)
);

CREATE TABLE public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =============================================================================
-- 9. FUNCTIONS & TRIGGERS
-- =============================================================================

-- Updated AT Handler
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Profiles
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- New User Initial Setup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, email, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::text)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name;

  -- 2. Create Wallet
  INSERT INTO public.user_wallet (id, coins, reward_claimed)
  VALUES (NEW.id, 1000, FALSE)
  ON CONFLICT (id) DO NOTHING;

  -- 3. Log Signup Bonus
  INSERT INTO public.coin_transactions (user_id, type, coins, reason)
  VALUES (NEW.id, 'EARN', 1000, 'Signup Bonus - 1000 Coins');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Hashtag Extraction
CREATE OR REPLACE FUNCTION public.extract_hashtags()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tags := ARRAY(
    SELECT DISTINCT substring(match[1] from 1)
    FROM regexp_matches(NEW.content, '#([a-zA-Z0-9_]+)', 'g') AS match
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_extract_hashtags
  BEFORE INSERT OR UPDATE OF content ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.extract_hashtags();

-- XP & Leveling Logic
CREATE OR REPLACE FUNCTION public.calculate_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF xp < 100 THEN RETURN 1; END IF;
  RETURN floor(sqrt(xp::float / 100)) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.give_xp(user_id UUID, amount INTEGER)
RETURNS VOID AS $$
DECLARE
  current_xp INTEGER;
  new_xp INTEGER;
  new_level INTEGER;
BEGIN
  SELECT xp INTO current_xp FROM public.profiles WHERE id = user_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  new_xp := current_xp + amount;
  new_level := public.calculate_level(new_xp);
  
  UPDATE public.profiles 
  SET xp = new_xp, level = new_level, last_activity_date = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- XP Triggers
CREATE OR REPLACE FUNCTION public.trigger_xp_on_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'posts' THEN PERFORM public.give_xp(NEW.user_id, 50);
  ELSIF TG_TABLE_NAME = 'comments' THEN PERFORM public.give_xp(NEW.user_id, 20);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_post_created_xp AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.trigger_xp_on_activity();
CREATE TRIGGER on_comment_created_xp AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.trigger_xp_on_activity();

-- Trust Score Logic
CREATE OR REPLACE FUNCTION public.update_trust_score()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating NUMERIC;
BEGIN
  SELECT AVG(rating) INTO avg_rating FROM public.reviews WHERE reviewee_id = NEW.reviewee_id;
  UPDATE public.profiles
  SET trust_score = COALESCE(ROUND(avg_rating * 20), 50)
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_created AFTER INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_trust_score();

-- =============================================================================
-- 10. NOTIFICATION TRIGGERS
-- =============================================================================

-- Message Notification
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  receiver_id UUID;
  sender_name TEXT;
BEGIN
  -- 1. Identify receiver
  SELECT user_id INTO receiver_id FROM public.conversation_participants
  WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id LIMIT 1;
  
  -- 2. Get sender info
  SELECT COALESCE(full_name, username) INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;

  IF receiver_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, data)
    VALUES (receiver_id, 'message', 'New message from ' || sender_name, NEW.content, NEW.sender_id, jsonb_build_object('conversation_id', NEW.conversation_id));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_on_new_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION notify_on_new_message();

-- Follow Notification
CREATE OR REPLACE FUNCTION notify_on_new_follow()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, actor_id)
  VALUES (NEW.following_id, 'follow', 'New Follower', 'Someone started following you', NEW.follower_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_on_new_follow AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION notify_on_new_follow();

-- Like Notification
CREATE OR REPLACE FUNCTION notify_on_new_like()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  liker_name TEXT;
BEGIN
  SELECT user_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
  SELECT COALESCE(full_name, username) INTO liker_name FROM public.profiles WHERE id = NEW.user_id;

  IF post_author_id IS NOT NULL AND post_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, post_id)
    VALUES (post_author_id, 'like', 'New Like', liker_name || ' liked your post', NEW.user_id, NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'post_reactions') THEN
    CREATE TRIGGER trigger_notify_on_new_like AFTER INSERT ON public.post_reactions FOR EACH ROW WHEN (NEW.emoji = '❤️') EXECUTE FUNCTION notify_on_new_like();
  END IF;
END $$;

-- Comment Notification
CREATE OR REPLACE FUNCTION notify_on_new_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  commenter_name TEXT;
BEGIN
  SELECT user_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
  SELECT COALESCE(full_name, username) INTO commenter_name FROM public.profiles WHERE id = NEW.user_id;

  IF post_author_id IS NOT NULL AND post_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, post_id)
    VALUES (post_author_id, 'comment', 'New Comment', commenter_name || ' commented on your post', NEW.user_id, NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_on_new_comment AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION notify_on_new_comment();

-- =============================================================================
-- 11. SPECIALIZED UTILS
-- =============================================================================

-- Waitlist Ranking
CREATE OR REPLACE FUNCTION get_waitlist_position(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_created_at TIMESTAMP WITH TIME ZONE;
  v_pos INTEGER;
BEGIN
  SELECT created_at INTO v_created_at FROM public.waitlist WHERE user_id = p_user_id;
  IF v_created_at IS NULL THEN RETURN 0; END IF;
  SELECT COUNT(*) + 1 INTO v_pos FROM public.waitlist WHERE created_at < v_created_at;
  RETURN v_pos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate Limiting
CREATE OR REPLACE FUNCTION public.check_rate_limit(limit_key TEXT, limit_count INT, window_interval INTERVAL)
RETURNS BOOLEAN AS $$
DECLARE
  curr_count INT;
BEGIN
  INSERT INTO public.rate_limit_counters (key, count, window_start)
  VALUES (limit_key, 1, NOW())
  ON CONFLICT (key) DO UPDATE
  SET count = CASE WHEN (NOW() - rate_limit_counters.window_start) > window_interval THEN 1 ELSE rate_limit_counters.count + 1 END,
      window_start = CASE WHEN (NOW() - rate_limit_counters.window_start) > window_interval THEN NOW() ELSE rate_limit_counters.window_start END
  RETURNING count INTO curr_count;
  RETURN curr_count <= limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Launch Reward Popup Logic
CREATE OR REPLACE FUNCTION public.claim_launch_reward_popup()
RETURNS BOOLEAN AS $$
DECLARE
  should_show BOOLEAN;
BEGIN
  SELECT NOT reward_claimed INTO should_show FROM public.user_wallet WHERE id = auth.uid() FOR UPDATE;
  IF should_show IS NULL OR NOT should_show THEN RETURN FALSE; END IF;
  UPDATE public.user_wallet SET reward_claimed = TRUE, updated_at = NOW() WHERE id = auth.uid();
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expired Stories Cleanup
CREATE OR REPLACE FUNCTION delete_expired_stories()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.stories WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 12. POLICIES (RLS) & REALTIME
-- =============================================================================

-- Global Select Policy for Public Data
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Conversations Security Definier Helper
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

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- Seed Default Achievements
INSERT INTO public.achievements (id, name, description, icon) VALUES
  ('first-post', 'First Post', 'Created your first post', 'pencil'),
  ('social-butterfly', 'Social Butterfly', 'Received 50 likes', 'heart'),
  ('bug-hunter', 'Bug Hunter', 'Reported a bug', 'bug')
ON CONFLICT (id) DO NOTHING;

-- Seed Default Feature Locks
INSERT INTO public.feature_locks (feature_name, required_coins)
VALUES ('tech_match', 1000)
ON CONFLICT (feature_name) DO NOTHING;

-- Seed Default Games
INSERT INTO public.games (game_key, game_name, coin_reward) VALUES
('tic_tac_toe', 'Tic Tac Toe', 10),
('rock_paper_scissors', 'Rock Paper Scissors', 10),
('memory_match', 'Memory Match', 10)
ON CONFLICT (game_key) DO NOTHING;

/* 
================================================================================
SETUP COMPLETE
================================================================================
*/
