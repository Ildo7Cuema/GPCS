-- Ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-archive', 'media-archive', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Create policies
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'media-archive' );

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'media-archive' );

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'media-archive' AND auth.uid()::text = (storage.foldername(name))[1] )
WITH CHECK ( bucket_id = 'media-archive' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'media-archive' AND auth.uid()::text = (storage.foldername(name))[1] );
