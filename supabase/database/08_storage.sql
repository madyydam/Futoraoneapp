/*
================================================================================
SECTION 08: STORAGE — Supabase Storage Buckets & Hardened RLS Policies
================================================================================
Buckets: avatars, post-images, post_images, group-avatars, community-avatars,
         stories
================================================================================
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- BUCKETS (safe to re-run)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('post_images', 'post_images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('group-avatars', 'group-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('community-avatars', 'community-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- DROP OLD POLICIES (clean slate)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Access" ON storage.objects;
  DROP POLICY IF EXISTS "Post images public access" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
  DROP POLICY IF EXISTS "Allow individual updates" ON storage.objects;
  DROP POLICY IF EXISTS "Allow individual deletes" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own folder" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own folder" ON storage.objects;
  DROP POLICY IF EXISTS "Admins full access" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated Insert - post-images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated Update - post-images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated Delete - post-images" ON storage.objects;
  DROP POLICY IF EXISTS "Public Access - post-images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated Insert - post_images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated Update - post_images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated Delete - post_images" ON storage.objects;
  DROP POLICY IF EXISTS "Public Access - post_images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own post images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own post images" ON storage.objects;
  DROP POLICY IF EXISTS "All public buckets - public read" ON storage.objects;
  DROP POLICY IF EXISTS "All public buckets - public read v2" ON storage.objects;
  DROP POLICY IF EXISTS "Avatars - authenticated upload" ON storage.objects;
  DROP POLICY IF EXISTS "Avatars - authenticated update" ON storage.objects;
  DROP POLICY IF EXISTS "Avatars - authenticated delete" ON storage.objects;
  DROP POLICY IF EXISTS "Post images - authenticated upload" ON storage.objects;
  DROP POLICY IF EXISTS "Post images - authenticated update" ON storage.objects;
  DROP POLICY IF EXISTS "Post images - authenticated delete" ON storage.objects;
  DROP POLICY IF EXISTS "Group & community avatars - authenticated upload" ON storage.objects;
  DROP POLICY IF EXISTS "Group & community avatars - authenticated update" ON storage.objects;
  DROP POLICY IF EXISTS "Group & community avatars - authenticated delete" ON storage.objects;
  DROP POLICY IF EXISTS "Group & community avatars - owner folder upload" ON storage.objects;
  DROP POLICY IF EXISTS "Group & community avatars - owner folder update" ON storage.objects;
  DROP POLICY IF EXISTS "Group & community avatars - owner folder delete" ON storage.objects;
  DROP POLICY IF EXISTS "Stories - owner folder upload" ON storage.objects;
  DROP POLICY IF EXISTS "Stories - owner folder delete" ON storage.objects;
  DROP POLICY IF EXISTS "Admins full storage access" ON storage.objects;
  DROP POLICY IF EXISTS "Admins full storage access v2" ON storage.objects;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- UNIFIED PUBLIC READ (all public buckets)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "All public buckets - public read v2"
ON storage.objects FOR SELECT
USING (bucket_id IN ('avatars', 'post-images', 'post_images', 'group-avatars', 'community-avatars', 'stories'));

-- ─────────────────────────────────────────────────────────────────────────────
-- AVATARS (profile pictures — strict owner-folder isolation)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Avatars - authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Avatars - authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars - authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────────────────────
-- POST IMAGES (both bucket variants — strict owner-folder isolation)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Post images - authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('post-images', 'post_images') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Post images - authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('post-images', 'post_images') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Post images - authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('post-images', 'post_images') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GROUP & COMMUNITY AVATARS (owner-folder isolation)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Group & community avatars - owner folder upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('group-avatars', 'community-avatars') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Group & community avatars - owner folder update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('group-avatars', 'community-avatars') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Group & community avatars - owner folder delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('group-avatars', 'community-avatars') AND (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────────────────────
-- STORIES (owner-folder isolation)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Stories - owner folder upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Stories - owner folder delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN FULL ACCESS (moderation via RBAC user_roles)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Admins full storage access v2"
ON storage.objects FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
