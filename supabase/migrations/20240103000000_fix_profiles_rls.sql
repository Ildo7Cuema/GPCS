-- =============================================================================
-- Fix RLS on profiles: allow superadmin to list and manage all users
-- and admin_municipal to list and manage users in their municipality.
-- =============================================================================

-- SELECT: Superadmin can read all profiles (list all users)
CREATE POLICY "Superadmin can read all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'superadmin'
  )
);

-- SELECT: Admin municipal can read profiles in the same municipality
CREATE POLICY "Admin municipal can read profiles in same municipio"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin_municipal'
    AND p.municipio_id IS NOT NULL
    AND p.municipio_id = profiles.municipio_id
  )
);

-- UPDATE: Users can update their own profile (name, etc.)
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- UPDATE: Superadmin can update any profile (assign roles, etc.)
CREATE POLICY "Superadmin can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'superadmin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'superadmin'
  )
);

-- UPDATE: Admin municipal can update profiles in the same municipality
CREATE POLICY "Admin municipal can update profiles in same municipio"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin_municipal'
    AND p.municipio_id IS NOT NULL
    AND p.municipio_id = profiles.municipio_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin_municipal'
    AND p.municipio_id IS NOT NULL
    AND p.municipio_id = profiles.municipio_id
  )
);
