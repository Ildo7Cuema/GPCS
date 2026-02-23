-- Enable RLS on media_files (should be on, but safer to check)
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- Drop existing DELETE policy if it exists to clean slate
DROP POLICY IF EXISTS "Users can delete their own media files" ON "public"."media_files";
DROP POLICY IF EXISTS "Authenticated users can delete" ON "public"."media_files";
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON "public"."media_files";

-- Create specific DELETE policy
CREATE POLICY "Users can delete their own media files"
ON "public"."media_files"
FOR DELETE
TO authenticated
USING ( 
    auth.uid() = uploaded_by 
    OR 
    exists (
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.role in ('superadmin')
    )
);

-- Ensure INSERT/UPDATE/SELECT are also covered if missing (good practice)
-- (Assuming SELECT/INSERT might be covered, but let's reinforce ownership)

-- UPDATE policy
DROP POLICY IF EXISTS "Users can update their own media files" ON "public"."media_files";
CREATE POLICY "Users can update their own media files"
ON "public"."media_files"
FOR UPDATE
TO authenticated
USING ( auth.uid() = uploaded_by )
WITH CHECK ( auth.uid() = uploaded_by );
