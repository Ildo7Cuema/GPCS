-- Seed Migration: Create Superadmin User
-- This migration creates the superadmin profile after the user is created in Supabase Auth
-- 
-- IMPORTANT: Before running this migration, you need to create the user in Supabase Auth
-- This can be done via:
-- 1. Supabase Dashboard > Authentication > Users > Add User
-- 2. Or using the Supabase Admin API
--
-- User Details:
-- Email: ildocuema@gmail.com
-- Password: Ildo7..Marques

-- Create or update the superadmin profile
-- This uses the ON CONFLICT clause to update if the profile already exists
DO $$
DECLARE
    superadmin_id UUID;
BEGIN
    -- Try to get the user ID from auth.users
    SELECT id INTO superadmin_id 
    FROM auth.users 
    WHERE email = 'ildocuema@gmail.com'
    LIMIT 1;
    
    -- If user exists, create/update their profile
    IF superadmin_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
        VALUES (
            superadmin_id,
            'Ildo Cuema (Superadmin)',
            'superadmin',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'superadmin',
            full_name = COALESCE(profiles.full_name, 'Ildo Cuema (Superadmin)'),
            updated_at = NOW();
            
        RAISE NOTICE 'Superadmin profile created/updated for user: ildocuema@gmail.com';
    ELSE
        RAISE NOTICE 'User not found in auth.users. Please create the user first via Supabase Auth.';
    END IF;
END $$;
