-- Enable RLS on the table (ensure it's on)
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view areas
CREATE POLICY "Enable read access for all users" ON "public"."areas"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

-- Policy to allow authenticated users to insert areas
CREATE POLICY "Enable insert for authenticated users only" ON "public"."areas"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy to allow updates for authenticated users
CREATE POLICY "Enable update for authenticated users" ON "public"."areas"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy to allow deletes for authenticated users
CREATE POLICY "Enable delete for authenticated users" ON "public"."areas"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (true);
