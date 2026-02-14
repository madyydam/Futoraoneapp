-- Create a bucket for post images/avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('post_images', 'post_images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the bucket
-- Note: buckets themselves don't have RLS, but the objects in them do.

-- Allow public access to all files in post_images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'post_images' );

-- Allow authenticated users to upload files to their own directory
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'post_images' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own files
CREATE POLICY "Allow individual updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'post_images' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Allow individual deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'post_images' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
