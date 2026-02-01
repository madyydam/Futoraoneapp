-- FIX RLS POLICIES FOR ADMINS
-- This migration ensures that users with the 'is_admin' flag can update and delete any profile.

-- 0. ADD MISSING COLUMNS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- 1. DROP EXISTING POLICIES ON PROFILES (if they exist with these names)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete all profiles" ON public.profiles;

-- 2. CREATE ADMIN UPDATE POLICY
-- We use a subquery to check if the current user is an admin.
-- To avoid recursion, we check the column directly.
CREATE POLICY "Admins can update all profiles" ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);

-- 3. CREATE ADMIN DELETE POLICY
CREATE POLICY "Admins can delete all profiles" ON public.profiles 
FOR DELETE 
TO authenticated 
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);

-- 4. ENSURE ADMINS CAN ALSO UPDATE OTHER TABLES (Posts, Projects, etc.)
-- Since RLS is not enabled for those yet in the migration script, 
-- they might be open, but it's good practice to enable it and add policies.

-- POSTS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage own posts" ON public.posts;
CREATE POLICY "Users can manage own posts" ON public.posts FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all posts" ON public.posts;
CREATE POLICY "Admins can manage all posts" ON public.posts FOR ALL USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);

-- PROJECTS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Projects are viewable by everyone" ON public.projects;
CREATE POLICY "Projects are viewable by everyone" ON public.projects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;
CREATE POLICY "Users can manage own projects" ON public.projects FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all projects" ON public.projects;
CREATE POLICY "Admins can manage all projects" ON public.projects FOR ALL USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);
