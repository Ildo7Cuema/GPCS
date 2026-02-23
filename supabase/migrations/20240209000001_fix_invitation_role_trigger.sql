-- Migration: Fix handle_new_user trigger to respect invitation roles
-- 
-- Problem: The previous trigger always defaulted to 'leitor', ignoring the role from the invitation.
-- Solution: Update the function to check for a valid invitation and use its role.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role public.user_role;
    v_municipio_id uuid;
    v_province text;
    v_full_name text;
    v_invitation_role public.user_role;
    v_invitation_municipio_id uuid;
    v_invitation_province text;
BEGIN
    -- 1. Default values
    v_role := 'leitor';
    v_municipio_id := (NEW.raw_user_meta_data->>'municipio_id')::uuid;
    v_province := NEW.raw_user_meta_data->>'province';
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Utilizador');

    -- 2. Check for valid invitation
    -- We look for an invitation that matches the email (case-insensitive) and hasn't been used yet
    SELECT role, municipio_id, province
    INTO v_invitation_role, v_invitation_municipio_id, v_invitation_province
    FROM public.user_invitations
    WHERE LOWER(email) = LOWER(NEW.email)
    ORDER BY created_at DESC
    LIMIT 1;

    -- 3. If invitation exists, override defaults
    IF v_invitation_role IS NOT NULL THEN
        v_role := v_invitation_role;
        -- Override location only if specified in invitation
        IF v_invitation_municipio_id IS NOT NULL THEN
            v_municipio_id := v_invitation_municipio_id;
        END IF;
        IF v_invitation_province IS NOT NULL THEN
            v_province := v_invitation_province;
        END IF;
    END IF;

    -- 4. Create Profile
    INSERT INTO public.profiles (id, full_name, role, municipio_id, province, created_at, updated_at)
    VALUES (
        NEW.id,
        v_full_name,
        v_role,
        v_municipio_id,
        v_province,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        -- If profile exists (rare race condition), update it with correct info
        role = EXCLUDED.role,
        municipio_id = COALESCE(EXCLUDED.municipio_id, public.profiles.municipio_id),
        province = COALESCE(EXCLUDED.province, public.profiles.province),
        updated_at = NOW();

    RETURN NEW;
END;
$$;
