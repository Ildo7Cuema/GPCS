-- Migração: Atualizar RLS policies para novas permissões
-- Departamento de Informação: Acesso a Activities e Documents
-- Departamento de Comunicação: Acesso a Documents (já deve estar coberto ou precisa revisão)

-- 1. Policies para ACTIVITIES (Adicionar departamento_informacao)
-- SELECT
DROP POLICY IF EXISTS "View own scope activities" ON public.activities;
CREATE POLICY "View own scope activities" ON public.activities
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role = 'superadmin'
            OR 
            (profiles.source_type = 'municipio' AND profiles.municipio_id = activities.municipio_id)
            OR
            (profiles.source_type = 'provincial' AND (
                profiles.governo_provincial_id = activities.governo_provincial_id
                OR profiles.direccao_provincial_id = activities.direccao_provincial_id
                -- Departamento de Informação vê atividades da sua direção
            ))
        )
    )
);

-- INSERT
DROP POLICY IF EXISTS "Insert activities for own scope" ON public.activities;
CREATE POLICY "Insert activities for own scope" ON public.activities
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role = 'superadmin'
            OR
            (profiles.role IN ('admin_municipal', 'tecnico') 
             AND profiles.municipio_id = activities.municipio_id)
            OR
            (profiles.role IN ('direccao_provincial', 'departamento_informacao') 
             AND profiles.direccao_provincial_id = activities.direccao_provincial_id)
        )
    )
);

-- UPDATE
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
            (profiles.role IN ('direccao_provincial', 'departamento_informacao') 
             AND profiles.direccao_provincial_id = activities.direccao_provincial_id)
        )
    )
);

-- DELETE (Opcional: Departamento de Informação pode apagar? Vou assumir que SIM, pois gere atividades)
DROP POLICY IF EXISTS "Delete activities for own scope" ON public.activities;
CREATE POLICY "Delete activities for own scope" ON public.activities
FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role = 'superadmin'
            OR
            (profiles.role IN ('admin_municipal') 
             AND profiles.municipio_id = activities.municipio_id)
            OR
            (profiles.role IN ('direccao_provincial', 'departamento_informacao') 
             AND profiles.direccao_provincial_id = activities.direccao_provincial_id)
        )
    )
);


-- 2. Policies para DOCUMENTS (Garantir acesso a ambos os departamentos)
-- INSERT
DROP POLICY IF EXISTS "Insert documents for own scope" ON public.documents;
CREATE POLICY "Insert documents for own scope" ON public.documents
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role = 'superadmin'
            OR
            (profiles.role IN ('admin_municipal', 'tecnico') 
             AND profiles.municipio_id = documents.municipio_id)
            OR
            (profiles.role IN ('direccao_provincial', 'departamento_comunicacao') 
             AND profiles.direccao_provincial_id = documents.direccao_provincial_id)
        )
    )
);

-- UPDATE
DROP POLICY IF EXISTS "Update documents for own scope" ON public.documents;
CREATE POLICY "Update documents for own scope" ON public.documents
FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role = 'superadmin'
            OR
            (profiles.role IN ('admin_municipal', 'tecnico', 'departamento_comunicacao') 
             AND profiles.municipio_id = documents.municipio_id)
            OR
            (profiles.role IN ('direccao_provincial', 'departamento_comunicacao') 
             AND profiles.direccao_provincial_id = documents.direccao_provincial_id)
        )
    )
);

-- DELETE (Aqui mantenho restrito. Apenas admin e direccao apagam? Ou departamentos também? 
-- Vou dar permissão de DELETE para departamentos também, para flexibilidade, já que "gerem" documentos)
DROP POLICY IF EXISTS "Delete documents for own scope" ON public.documents;
CREATE POLICY "Delete documents for own scope" ON public.documents
FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role = 'superadmin'
            OR
            (profiles.role IN ('admin_municipal') 
             AND profiles.municipio_id = documents.municipio_id)
            OR
            (profiles.role IN ('direccao_provincial', 'departamento_comunicacao') 
             AND profiles.direccao_provincial_id = documents.direccao_provincial_id)
        )
    )
);
