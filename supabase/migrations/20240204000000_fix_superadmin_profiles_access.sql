-- =============================================================================
-- Fix: Superadmin can view all profiles in the users list
-- 
-- Problem: Superadmin can only see their own profile in /users page
-- Solution: Simplify RLS policies to a single combined SELECT policy
-- =============================================================================

-- 1. Drop ALL existing SELECT policies on profiles table
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Superadmin can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin municipal can read profiles in same municipio" ON public.profiles;

-- 2. Recreate the helper function with explicit SECURITY DEFINER
-- This ensures the function can read profiles without being blocked by RLS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- 3. Recreate municipio_id helper function
CREATE OR REPLACE FUNCTION public.current_user_municipio_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT municipio_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.current_user_municipio_id() TO authenticated;

-- 4. Create a SINGLE combined SELECT policy that covers all cases
-- PostgreSQL RLS evaluates policies with OR logic - if ANY policy passes, access is granted
-- But we'll use a single policy with all conditions for clarity
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated
USING (
  -- Case 1: User can always read their own profile
  auth.uid() = id
  OR
  -- Case 2: Superadmin can read ALL profiles
  public.current_user_role() = 'superadmin'
  OR
  -- Case 3: Admin municipal can read profiles in the same municipality
  (
    public.current_user_role() = 'admin_municipal'
    AND public.current_user_municipio_id() IS NOT NULL
    AND municipio_id = public.current_user_municipio_id()
  )
);

-- ============================================================================
-- Verification: Run this query after applying migration to confirm it works
-- ============================================================================
-- SELECT id, full_name, role FROM public.profiles ORDER BY created_at DESC;
-- 
-- Expected: Superadmin should see ALL rows, not just their own
