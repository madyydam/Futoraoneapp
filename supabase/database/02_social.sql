/*
================================================================================
SECTION 02: SOCIAL — Posts, Reels, Stories, Likes, Comments, Projects, Tags,
            Notifications, Reports, Waitlist, Verification, Popups, Feedback, Email Logs
================================================================================
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- PROJECTS & PROJECT LIKES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tech_stack TEXT[],
  image_url TEXT,
  github_url TEXT,
  live_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- POSTS, LIKES & COMMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  is_project_update BOOLEAN DEFAULT FALSE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON public.posts USING GIN (tags);

CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- REELS, STORIES, REACTIONS, SAVES, TAGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  category TEXT DEFAULT 'Tech',
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍', '❤️', '🔥', '💡', '🎉')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON public.post_reactions(post_id);

CREATE TABLE IF NOT EXISTS public.saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_tags (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS, REPORTS, WAITLIST, VERIFICATION, POPUPS, FEEDBACK, EMAIL LOGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'like',
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  title TEXT,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id) WHERE is_read = false;

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'user', 'comment')),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.verification_requests
  DROP CONSTRAINT IF EXISTS verification_requests_user_id_status_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_requests_one_pending
  ON public.verification_requests(user_id)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'announcement' CHECK (type IN ('info', 'announcement', 'feature_launch')),
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'new_users', 'existing_users')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.user_popup_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  popup_id UUID NOT NULL REFERENCES public.broadcast_messages(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, popup_id)
);

CREATE TABLE IF NOT EXISTS public.app_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  bug_report TEXT NOT NULL,
  feature_suggestion TEXT,
  platform TEXT NOT NULL DEFAULT 'web',
  app_version TEXT NOT NULL DEFAULT '1.0.0',
  device_info TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('welcome', 'login', 'digest_5day', 'test')),
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  message_id TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_logs_one_welcome_per_user
  ON public.email_logs(user_id)
  WHERE email_type = 'welcome' AND status IN ('pending', 'sent');

CREATE INDEX IF NOT EXISTS idx_email_logs_user_type_created
  ON public.email_logs(user_id, email_type, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.extract_hashtags()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.tags := ARRAY(
    SELECT DISTINCT substring(match[1] from 1)
    FROM regexp_matches(NEW.content, '#([a-zA-Z0-9_]+)', 'g') AS match
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_extract_hashtags ON public.posts;
CREATE TRIGGER trigger_extract_hashtags
  BEFORE INSERT OR UPDATE OF content ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.extract_hashtags();

CREATE OR REPLACE FUNCTION public.delete_expired_stories()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.stories WHERE expires_at < NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_waitlist_position(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_at TIMESTAMPTZ;
  v_pos INTEGER;
BEGIN
  SELECT created_at INTO v_created_at FROM public.waitlist WHERE user_id = user_uuid;
  IF v_created_at IS NULL THEN RETURN 0; END IF;
  SELECT COUNT(*) + 1 INTO v_pos FROM public.waitlist WHERE created_at < v_created_at;
  RETURN v_pos;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(limit_key TEXT, limit_count INT, window_interval INTERVAL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.notify_on_new_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, actor_id)
  VALUES (NEW.following_id, 'follow', 'New Follower', 'Someone started following you', NEW.follower_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_new_follow ON public.follows;
CREATE TRIGGER trigger_notify_on_new_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_follow();

CREATE OR REPLACE FUNCTION public.notify_on_new_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author_id UUID;
  liker_name TEXT;
BEGIN
  SELECT user_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
  SELECT COALESCE(full_name, username) INTO liker_name FROM public.profiles WHERE id = NEW.user_id;
  IF post_author_id IS NOT NULL AND post_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, post_id)
    VALUES (post_author_id, 'like', 'New Like', COALESCE(liker_name, 'Someone') || ' liked your post', NEW.user_id, NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_new_like ON public.post_reactions;
CREATE TRIGGER trigger_notify_on_new_like
  AFTER INSERT ON public.post_reactions
  FOR EACH ROW WHEN (NEW.emoji = '❤️') EXECUTE FUNCTION public.notify_on_new_like();

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
  SELECT COALESCE(full_name, username) INTO commenter_name FROM public.profiles WHERE id = NEW.user_id;
  IF post_author_id IS NOT NULL AND post_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, actor_id, post_id)
    VALUES (post_author_id, 'comment', 'New Comment', COALESCE(commenter_name, 'Someone') || ' commented on your post', NEW.user_id, NEW.post_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_new_comment ON public.comments;
CREATE TRIGGER trigger_notify_on_new_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_comment();

-- Deduplicated 24h profile-view notification trigger (no direct client notifications insert needed)
CREATE OR REPLACE FUNCTION public.notify_on_profile_view()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.profile_id IS NULL OR NEW.viewer_id IS NULL OR NEW.profile_id = NEW.viewer_id THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = NEW.profile_id
      AND n.actor_id = NEW.viewer_id
      AND n.type = 'profile_view'
      AND n.created_at > NOW() - INTERVAL '24 hours'
  ) THEN
    INSERT INTO public.notifications (user_id, actor_id, type, title, message)
    VALUES (NEW.profile_id, NEW.viewer_id, 'profile_view', 'Profile View', 'Someone viewed your profile');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_profile_view ON public.profile_views;
CREATE TRIGGER trigger_notify_on_profile_view
  AFTER INSERT ON public.profile_views
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_profile_view();

-- ─────────────────────────────────────────────────────────────────────────────
-- HARDENED RLS ACROSS ALL SOCIAL TABLES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_popup_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Projects & Project Likes
DROP POLICY IF EXISTS "Projects viewable by authenticated" ON public.projects;
CREATE POLICY "Projects viewable by authenticated" ON public.projects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users create own projects" ON public.projects;
CREATE POLICY "Users create own projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_not_banned(auth.uid()));
DROP POLICY IF EXISTS "Users update own projects" ON public.projects;
CREATE POLICY "Users update own projects" ON public.projects FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users or admins delete projects" ON public.projects;
CREATE POLICY "Users or admins delete projects" ON public.projects FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Project likes viewable" ON public.project_likes;
CREATE POLICY "Project likes viewable" ON public.project_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users manage own project likes" ON public.project_likes;
CREATE POLICY "Users manage own project likes" ON public.project_likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Posts, Likes, Comments, Saves, Reactions, Tags
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Posts viewable by authenticated" ON public.posts;
CREATE POLICY "Posts viewable by authenticated" ON public.posts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can create own posts" ON public.posts;
CREATE POLICY "Users can create own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_not_banned(auth.uid()));
DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can delete any post" ON public.posts;
DROP POLICY IF EXISTS "Admin full post control" ON public.posts;
DROP POLICY IF EXISTS "Users or admins can delete posts" ON public.posts;
CREATE POLICY "Users or admins can delete posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Likes viewable" ON public.likes;
CREATE POLICY "Likes viewable" ON public.likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users manage own likes" ON public.likes;
CREATE POLICY "Users manage own likes" ON public.likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Comments viewable by authenticated" ON public.comments;
CREATE POLICY "Comments viewable by authenticated" ON public.comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can create own comments" ON public.comments;
CREATE POLICY "Users can create own comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_not_banned(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.comments;
DROP POLICY IF EXISTS "Admin full comment control" ON public.comments;
DROP POLICY IF EXISTS "Users or admins delete comments" ON public.comments;
CREATE POLICY "Users or admins delete comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Saves owner only" ON public.saves;
CREATE POLICY "Saves owner only" ON public.saves FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reactions viewable" ON public.post_reactions;
CREATE POLICY "Reactions viewable" ON public.post_reactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users manage own reactions" ON public.post_reactions;
CREATE POLICY "Users manage own reactions" ON public.post_reactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Tags viewable" ON public.tags;
CREATE POLICY "Tags viewable" ON public.tags FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Tags insertable" ON public.tags;
CREATE POLICY "Tags insertable" ON public.tags FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Post tags viewable" ON public.post_tags;
CREATE POLICY "Post tags viewable" ON public.post_tags FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Post owners manage post tags" ON public.post_tags;
CREATE POLICY "Post owners manage post tags" ON public.post_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()));

-- Stories & Story Views
DROP POLICY IF EXISTS "Allow anyone to view stories" ON public.stories;
DROP POLICY IF EXISTS "Authenticated view active stories" ON public.stories;
CREATE POLICY "Authenticated view active stories" ON public.stories FOR SELECT TO authenticated USING (expires_at > NOW() OR user_id = auth.uid());
DROP POLICY IF EXISTS "Allow authenticated users to insert stories" ON public.stories;
DROP POLICY IF EXISTS "Users insert own stories" ON public.stories;
CREATE POLICY "Users insert own stories" ON public.stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_not_banned(auth.uid()));
DROP POLICY IF EXISTS "Allow users to delete their own stories" ON public.stories;
DROP POLICY IF EXISTS "Users or admins delete stories" ON public.stories;
CREATE POLICY "Users or admins delete stories" ON public.stories FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Story views viewable by owner or viewer" ON public.story_views;
CREATE POLICY "Story views viewable by owner or viewer" ON public.story_views FOR SELECT TO authenticated
  USING (auth.uid() = viewer_id OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users insert own story views" ON public.story_views;
CREATE POLICY "Users insert own story views" ON public.story_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = viewer_id);

-- Notifications (server triggers create; users read/mark own as read)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reports
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Only admins can view reports" ON public.reports;
CREATE POLICY "Only admins can view reports" ON public.reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Only admins can update reports" ON public.reports;
CREATE POLICY "Only admins can update reports" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Broadcasts, Popups, Feedback, Email Logs
DROP POLICY IF EXISTS "Broadcasts readable" ON public.broadcast_messages;
CREATE POLICY "Broadcasts readable" ON public.broadcast_messages FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage broadcasts" ON public.broadcast_messages;
CREATE POLICY "Admins manage broadcasts" ON public.broadcast_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users manage own popup status" ON public.user_popup_status;
CREATE POLICY "Users manage own popup status" ON public.user_popup_status FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users submit own feedback" ON public.app_feedback;
CREATE POLICY "Users submit own feedback" ON public.app_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users or admins view feedback" ON public.app_feedback;
CREATE POLICY "Users or admins view feedback" ON public.app_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update feedback" ON public.app_feedback;
CREATE POLICY "Admins update feedback" ON public.app_feedback FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users or admins view own email logs" ON public.email_logs;
CREATE POLICY "Users or admins view own email logs" ON public.email_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='posts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='stories') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='reports') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
  END IF;
END $$;
