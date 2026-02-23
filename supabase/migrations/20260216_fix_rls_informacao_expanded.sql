-- FIXED MIGRATION: 20260216_fix_rls_informacao_expanded.sql
-- Fixes RLS for departamento_informacao to allow access via departamento/governo IDs, not just direccao.

-- 1. Update INSERT policy
DROP POLICY IF EXISTS "Insert activities for own scope" ON public.activities;
DROP POLICY IF EXISTS "Insert activities for own municipality" ON public.activities; -- Remove potential legacy policy
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
            -- Provincial: Direção Provincial
            (profiles.role = 'direccao_provincial' 
             AND profiles.direccao_provincial_id = activities.direccao_provincial_id)
            OR
            -- Provincial: Departamento de Informação
            (profiles.role = 'departamento_informacao' AND (
                -- Pode estar ligado a uma Direcção
                (profiles.direccao_provincial_id IS NOT NULL AND profiles.direccao_provincial_id = activities.direccao_provincial_id)
                OR
                -- Ou directamente a um Departamento
                (profiles.departamento_provincial_id IS NOT NULL AND profiles.departamento_provincial_id = activities.departamento_provincial_id)
                OR
                -- Ou ao Governo Provincial
                (profiles.governo_provincial_id IS NOT NULL AND profiles.governo_provincial_id = activities.governo_provincial_id)
            ))
        )
    )
);

-- 2. Update UPDATE policy
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
            (profiles.role = 'direccao_provincial' 
             AND profiles.direccao_provincial_id = activities.direccao_provincial_id)
            OR
            (profiles.role = 'departamento_informacao' AND (
                (profiles.direccao_provincial_id IS NOT NULL AND profiles.direccao_provincial_id = activities.direccao_provincial_id)
                OR
                (profiles.departamento_provincial_id IS NOT NULL AND profiles.departamento_provincial_id = activities.departamento_provincial_id)
                OR
                (profiles.governo_provincial_id IS NOT NULL AND profiles.governo_provincial_id = activities.governo_provincial_id)
            ))
        )
    )
);

-- 3. Update SELECT policy
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
            -- Utilizadores provinciais
            (profiles.source_type = 'provincial' AND (
                -- Vê se coincidir governo, direccao ou departamento
                (profiles.governo_provincial_id IS NOT NULL AND profiles.governo_provincial_id = activities.governo_provincial_id)
                OR
                (profiles.direccao_provincial_id IS NOT NULL AND profiles.direccao_provincial_id = activities.direccao_provincial_id)
                OR
                (profiles.departamento_provincial_id IS NOT NULL AND profiles.departamento_provincial_id = activities.departamento_provincial_id)
            ))
        )
    )
);
