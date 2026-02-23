-- =============================================================================
-- Sync: Create profiles for users that exist in auth.users but not in profiles
-- Also creates a trigger to auto-create profiles for new users
-- =============================================================================

-- 1. Insert missing profiles from auth.users
-- This creates a profile for any user in auth.users that doesn't have one
INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1), 'Utilizador'),
    'leitor'::public.user_role,
    COALESCE(au.created_at, NOW()),
    NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- 2. Create a function to auto-create profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, municipio_id, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Utilizador'),
        'leitor'::public.user_role,
        (NEW.raw_user_meta_data->>'municipio_id')::uuid,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- 3. Create trigger to automatically create profile when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Verification: Check that profiles were created
-- =============================================================================
-- Run this after applying:
-- SELECT id, full_name, role FROM public.profiles;
-- Expected: Should now show ALL users from auth.users
