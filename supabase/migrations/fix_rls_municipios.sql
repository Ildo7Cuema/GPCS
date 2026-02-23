-- Enable RLS on the table (ensure it's on)
ALTER TABLE municipios ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view municipios (usually already exists, but good to ensure)
CREATE POLICY "Enable read access for all users" ON "public"."municipios"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

-- Policy to allow authenticated users to insert municipios
-- Adjust the condition based on your needs (e.g., check for specific role in profiles)
-- For now, we allow any authenticated user to create a municipio
CREATE POLICY "Enable insert for authenticated users only" ON "public"."municipios"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

-- If you want to restrict to admins only (assuming you have a 'profiles' table with 'role'):
-- CREATE POLICY "Enable insert for admins only" ON "public"."municipios"
-- AS PERMISSIVE FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   exists (
--     select 1 from profiles
--     where profiles.id = auth.uid()
--     and profiles.role in ('admin', 'superadmin')
--   )
-- );

-- Policy to allow updates (optional, for editing)
CREATE POLICY "Enable update for authenticated users" ON "public"."municipios"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy to allow deletes (optional)
CREATE POLICY "Enable delete for authenticated users" ON "public"."municipios"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (true);
