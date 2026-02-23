-- FIXED MIGRATION: 20260216_fix_rls_final.sql

-- 1. Fix PROFILES RLS (Missing policy to read own profile)
-- Without this, "EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())" returns false/empty for normal users!
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. Allow departamento_informacao to manage activities (Same as previous attempt, but now with profile access guaranteed)
-- Based on: departamento_comunicacao is for documents, and informacao for activities/content.

-- Update INSERT policy
DROP POLICY IF EXISTS "Insert activities for own scope" ON public.activities;
CREATE POLICY "Insert activities for own scope" ON public.activities
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            -- Superadmin
            profiles.role = 'superadmin'
            OR
            -- Municipal (roles permitidos)
            (profiles.role IN ('admin_municipal', 'tecnico') 
             AND profiles.municipio_id = activities.municipio_id)
            OR
            -- Provincial (Direção Provincial e Departamento de Informação)
            (profiles.role IN ('direccao_provincial') 
             AND profiles.direccao_provincial_id = activities.direccao_provincial_id)
            OR
            (profiles.role IN ('departamento_informacao')
             AND profiles.direccao_provincial_id = activities.direccao_provincial_id)
        )
    )
);

-- Update UPDATE policy
DROP POLICY IF EXISTS "Update activities for own scope" ON public.activities;
CREATE POLICY "Update activities for own scope" ON public.activities
FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role = 'superadmin'
            OR
            (profiles.role IN ('admin_municipal', 'tecnico') 
             AND profiles.municipio_id = activities.municipio_id)
            OR
            (profiles.role IN ('direccao_provincial') 
             AND profiles.direccao_provincial_id = activities.direccao_provincial_id)
            OR
            (profiles.role IN ('departamento_informacao')
             AND profiles.direccao_provincial_id = activities.direccao_provincial_id)
        )
    )
);

-- Update SELECT policy
DROP POLICY IF EXISTS "View own scope activities" ON public.activities;
CREATE POLICY "View own scope activities" ON public.activities
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            -- Superadmin vê tudo
            profiles.role = 'superadmin'
            OR 
            -- Utilizadores municipais veem do seu município
            (profiles.source_type = 'municipio' AND profiles.municipio_id = activities.municipio_id)
            OR
            -- Utilizadores provinciais veem da sua direção/governo
            (profiles.source_type = 'provincial' AND (
                -- Se é do governo provincial, vê tudo do governo
                profiles.governo_provincial_id = activities.governo_provincial_id
                -- Se é duma direção, vê tudo da direção
                OR profiles.direccao_provincial_id = activities.direccao_provincial_id
                -- Departamento de Informação vê da sua direção
            ))
        )
    )
);
