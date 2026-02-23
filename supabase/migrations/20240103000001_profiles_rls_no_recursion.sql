-- =============================================================================
-- Fix infinite recursion in profiles RLS: use SECURITY DEFINER helpers
-- so policies do not query profiles (which would re-trigger RLS).
-- =============================================================================

-- Helper: current user's role (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Helper: current user's municipio_id (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.current_user_municipio_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT municipio_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Drop policies that cause recursion (they SELECT from profiles inside policy)
DROP POLICY IF EXISTS "Superadmin can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin municipal can read profiles in same municipio" ON public.profiles;
DROP POLICY IF EXISTS "Superadmin can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin municipal can update profiles in same municipio" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- SELECT: Superadmin can read all profiles
CREATE POLICY "Superadmin can read all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.current_user_role() = 'superadmin');

-- SELECT: Admin municipal can read profiles in the same municipality
CREATE POLICY "Admin municipal can read profiles in same municipio"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.current_user_role() = 'admin_municipal'
  AND public.current_user_municipio_id() IS NOT NULL
  AND profiles.municipio_id = public.current_user_municipio_id()
);

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- UPDATE: Superadmin can update any profile
CREATE POLICY "Superadmin can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.current_user_role() = 'superadmin')
WITH CHECK (public.current_user_role() = 'superadmin');

-- UPDATE: Admin municipal can update profiles in the same municipality
CREATE POLICY "Admin municipal can update profiles in same municipio"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  public.current_user_role() = 'admin_municipal'
  AND public.current_user_municipio_id() IS NOT NULL
  AND profiles.municipio_id = public.current_user_municipio_id()
)
WITH CHECK (
  public.current_user_role() = 'admin_municipal'
  AND public.current_user_municipio_id() IS NOT NULL
  AND profiles.municipio_id = public.current_user_municipio_id()
);
