-- =============================================================================
-- GPCS Media System - Set Superadmin Role
-- =============================================================================
-- Execute this SQL in your Supabase Dashboard SQL Editor to set superadmin role
-- Dashboard: https://supabase.com/dashboard/project/cqwqtnwdmbglmsfenfxy/sql
-- =============================================================================

-- First, let's check if the user exists and what their current role is
SELECT 
    p.id,
    p.full_name,
    p.role,
    p.created_at,
    u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'ildocuema@gmail.com';

-- If profile exists, update it to superadmin
UPDATE public.profiles 
SET 
    role = 'superadmin',
    full_name = COALESCE(full_name, 'Ildo Cuema (Superadmin)'),
    updated_at = NOW()
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'ildocuema@gmail.com'
);

-- If profile doesn't exist, insert it
INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
SELECT 
    id,
    'Ildo Cuema (Superadmin)',
    'superadmin',
    NOW(),
    NOW()
FROM auth.users 
WHERE email = 'ildocuema@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'superadmin',
    full_name = COALESCE(profiles.full_name, 'Ildo Cuema (Superadmin)'),
    updated_at = NOW();

-- Verify the update was successful
SELECT 
    p.id,
    p.full_name,
    p.role,
    u.email,
    'Superadmin configured successfully!' as status
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'ildocuema@gmail.com' AND p.role = 'superadmin';
