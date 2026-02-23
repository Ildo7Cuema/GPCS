-- Migration: Fix handle_new_user trigger to also copy provincial fields from invitation
-- 
-- Problem: The trigger only copies role, municipio_id, province from the invitation,
-- but ignores source_type, direccao_provincial_id, departamento_provincial_id.
-- This causes provincial users to see "profile not associated with any provincial direction".

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
    v_source_type text;
    v_direccao_provincial_id uuid;
    v_departamento_provincial_id uuid;
    -- Invitation fields
    v_invitation_role public.user_role;
    v_invitation_municipio_id uuid;
    v_invitation_province text;
    v_invitation_source_type text;
    v_invitation_direccao_provincial_id uuid;
    v_invitation_departamento_provincial_id uuid;
BEGIN
    -- 1. Default values from auth metadata
    v_role := 'leitor';
    v_municipio_id := (NEW.raw_user_meta_data->>'municipio_id')::uuid;
    v_province := NEW.raw_user_meta_data->>'province';
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Utilizador');
    v_source_type := 'municipio';
    v_direccao_provincial_id := NULL;
    v_departamento_provincial_id := NULL;

    -- 2. Check for valid invitation (match by email, most recent first)
    SELECT role, municipio_id, province, source_type, direccao_provincial_id, departamento_provincial_id
    INTO v_invitation_role, v_invitation_municipio_id, v_invitation_province,
         v_invitation_source_type, v_invitation_direccao_provincial_id, v_invitation_departamento_provincial_id
    FROM public.user_invitations
    WHERE LOWER(email) = LOWER(NEW.email)
    ORDER BY created_at DESC
    LIMIT 1;

    -- 3. If invitation exists, override defaults
    IF v_invitation_role IS NOT NULL THEN
        v_role := v_invitation_role;
        
        -- Override location if specified
        IF v_invitation_municipio_id IS NOT NULL THEN
            v_municipio_id := v_invitation_municipio_id;
        END IF;
        IF v_invitation_province IS NOT NULL THEN
            v_province := v_invitation_province;
        END IF;
        
        -- Copy provincial fields
        IF v_invitation_source_type IS NOT NULL THEN
            v_source_type := v_invitation_source_type;
        END IF;
        v_direccao_provincial_id := v_invitation_direccao_provincial_id;
        v_departamento_provincial_id := v_invitation_departamento_provincial_id;
    END IF;

    -- 4. Create Profile with all fields including provincial
    INSERT INTO public.profiles (
        id, full_name, role, municipio_id, province,
        source_type, direccao_provincial_id, departamento_provincial_id,
        created_at, updated_at
    )
    VALUES (
        NEW.id,
        v_full_name,
        v_role,
        v_municipio_id,
        v_province,
        v_source_type,
        v_direccao_provincial_id,
        v_departamento_provincial_id,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        municipio_id = COALESCE(EXCLUDED.municipio_id, public.profiles.municipio_id),
        province = COALESCE(EXCLUDED.province, public.profiles.province),
        source_type = COALESCE(EXCLUDED.source_type, public.profiles.source_type),
        direccao_provincial_id = COALESCE(EXCLUDED.direccao_provincial_id, public.profiles.direccao_provincial_id),
        departamento_provincial_id = COALESCE(EXCLUDED.departamento_provincial_id, public.profiles.departamento_provincial_id),
        updated_at = NOW();

    RETURN NEW;
END;
$$;
