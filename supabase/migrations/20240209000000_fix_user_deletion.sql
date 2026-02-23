-- Migration: Fix user deletion issues
-- 1. Add DELETE policies for profiles table (fixes "User disappears but comes back on refresh" due to silent RLS failure)
-- 2. Add RPC function to completely delete user from auth.users (prevents orphaned users)

-- Enable RLS (just in case)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. DELETE Policies for profiles
-- These ensure that executing DELETE FROM profiles works (removes the profile row)

-- Superadmin can delete any profile
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Superadmin can delete profiles') THEN
        CREATE POLICY "Superadmin can delete profiles" 
        ON public.profiles FOR DELETE TO authenticated 
        USING (
            (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
        );
    END IF;
END $$;

-- Admin Municipal can delete profiles in their municipality (except other admins)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin municipal can delete profiles in same municipio') THEN
        CREATE POLICY "Admin municipal can delete profiles in same municipio" 
        ON public.profiles FOR DELETE TO authenticated 
        USING (
            (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin_municipal'
            AND 
            municipio_id = (SELECT municipio_id FROM public.profiles WHERE id = auth.uid())
            AND 
            role NOT IN ('superadmin', 'admin_municipal')
        );
    END IF;
END $$;

-- 2. Secure RPC function to delete user from auth.users
-- This function runs with SECURITY DEFINER privileges to access auth.users
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role public.user_role;
    v_caller_municipio uuid;
    v_target_municipio uuid;
    v_target_role public.user_role;
BEGIN
    -- Get caller info
    SELECT role, municipio_id INTO v_caller_role, v_caller_municipio
    FROM public.profiles
    WHERE id = auth.uid();

    -- Get target user info (if profile exists)
    SELECT role, municipio_id INTO v_target_role, v_target_municipio
    FROM public.profiles
    WHERE id = user_id;

    -- Case 1: Superadmin can delete anyone
    IF v_caller_role = 'superadmin' THEN
        DELETE FROM auth.users WHERE id = user_id;
        RETURN;
    END IF;

    -- Case 2: Admin Municipal can delete users in same municipality (except admins)
    IF v_caller_role = 'admin_municipal' THEN
        IF v_target_municipio = v_caller_municipio 
           AND v_target_role NOT IN ('superadmin', 'admin_municipal') THEN
            DELETE FROM auth.users WHERE id = user_id;
            RETURN;
        END IF;
    END IF;

    -- If we got here, permission denied
    RAISE EXCEPTION 'Permission denied: Cannot delete this user.';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.delete_user_completely(uuid) TO authenticated;
