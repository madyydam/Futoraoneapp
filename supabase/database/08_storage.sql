/*
================================================================================
SECTION 08: STORAGE — Supabase Storage Buckets & RLS Policies
================================================================================
Buckets: avatars, post-images, post_images, group-avatars, community-avatars
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
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- UNIFIED PUBLIC READ (all public buckets)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "All public buckets - public read"
ON storage.objects FOR SELECT
USING (bucket_id IN ('avatars', 'post-images', 'post_images', 'group-avatars', 'community-avatars'));

-- ─────────────────────────────────────────────────────────────────────────────
-- AVATARS (profile pictures)
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
-- POST IMAGES (both bucket variants)
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
-- GROUP & COMMUNITY AVATARS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Group & community avatars - authenticated upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('group-avatars', 'community-avatars'));

CREATE POLICY "Group & community avatars - authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('group-avatars', 'community-avatars'));

CREATE POLICY "Group & community avatars - authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('group-avatars', 'community-avatars'));

-- ─────────────────────────────────────────────────────────────────────────────
-- ADMIN FULL ACCESS (moderation)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Admins full storage access"
ON storage.objects FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
