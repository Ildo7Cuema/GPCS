-- Migração: Adicionar novos perfis e suporte a nível provincial em todas as tabelas principais

-- 1. Atualizar Enum de Roles
-- Nota: Enums no Postgres não podem ser alterados dentro de uma transação se usados, 
-- mas o Supabase executa migrações separadamente. Se falhar, executar manualmente.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'departamento_comunicacao';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'direccao_provincial';

-- 2. Atualizar Tabela Profiles (Adicionar contexto provincial se ainda não existir nas outras migrações)
-- A migração 20240207000000 já adicionou source_type e colunas provinciais a media_files
-- Agora precisamos adicionar aos profiles para saber a quem o user pertence

DO $$ 
BEGIN
    -- Adicionar colunas a profiles se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'source_type') THEN
        ALTER TABLE public.profiles ADD COLUMN source_type text DEFAULT 'municipio' CHECK (source_type IN ('municipio', 'provincial'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'governo_provincial_id') THEN
        ALTER TABLE public.profiles ADD COLUMN governo_provincial_id uuid REFERENCES public.governo_provincial(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'direccao_provincial_id') THEN
        ALTER TABLE public.profiles ADD COLUMN direccao_provincial_id uuid REFERENCES public.direccoes_provinciais(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'departamento_provincial_id') THEN
        ALTER TABLE public.profiles ADD COLUMN departamento_provincial_id uuid REFERENCES public.departamentos_provinciais(id);
    END IF;
END $$;

-- 3. Atualizar Tabela Activities (Suporte provincial)
DO $$ 
BEGIN
    -- Permitir municipio_id nulo (para atividades provinciais)
    ALTER TABLE public.activities ALTER COLUMN municipio_id DROP NOT NULL;

    -- Adicionar colunas provinciais
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'source_type') THEN
        ALTER TABLE public.activities ADD COLUMN source_type text DEFAULT 'municipio' CHECK (source_type IN ('municipio', 'provincial'));
        CREATE INDEX IF NOT EXISTS idx_activities_source_type ON public.activities(source_type);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'direccao_provincial_id') THEN
        ALTER TABLE public.activities ADD COLUMN governo_provincial_id uuid REFERENCES public.governo_provincial(id);
        ALTER TABLE public.activities ADD COLUMN direccao_provincial_id uuid REFERENCES public.direccoes_provinciais(id);
        ALTER TABLE public.activities ADD COLUMN departamento_provincial_id uuid REFERENCES public.departamentos_provinciais(id);
        
        CREATE INDEX IF NOT EXISTS idx_activities_direccao ON public.activities(direccao_provincial_id);
    END IF;
END $$;

-- 4. Atualizar Tabela Documents (Suporte provincial)
DO $$ 
BEGIN
    -- Permitir municipio_id nulo (para documentos provinciais)
    ALTER TABLE public.documents ALTER COLUMN municipio_id DROP NOT NULL;

    -- Adicionar colunas provinciais
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'source_type') THEN
        ALTER TABLE public.documents ADD COLUMN source_type text DEFAULT 'municipio' CHECK (source_type IN ('municipio', 'provincial'));
        CREATE INDEX IF NOT EXISTS idx_documents_source_type ON public.documents(source_type);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'direccao_provincial_id') THEN
        ALTER TABLE public.documents ADD COLUMN governo_provincial_id uuid REFERENCES public.governo_provincial(id);
        ALTER TABLE public.documents ADD COLUMN direccao_provincial_id uuid REFERENCES public.direccoes_provinciais(id);
        ALTER TABLE public.documents ADD COLUMN departamento_provincial_id uuid REFERENCES public.departamentos_provinciais(id);
        
        CREATE INDEX IF NOT EXISTS idx_documents_direccao ON public.documents(direccao_provincial_id);
    END IF;
END $$;

-- 5. Atualizar Policies para Activities (Permitir acesso provincial)

-- Policy para SELECT (Ver atividades)
DROP POLICY IF EXISTS "View own municipality activities" ON public.activities;
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
                -- Se é dum departamento, vê tudo do departamento (ou direção, dependendo da regra de negócio. Assumindo direção para visibilidade)
            ))
        )
    )
);

-- Policy para INSERT
DROP POLICY IF EXISTS "Insert activities for own municipality" ON public.activities;
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
            -- Provincial (Direção Provincial pode inserir)
            (profiles.role IN ('direccao_provincial') 
             AND profiles.direccao_provincial_id = activities.direccao_provincial_id)
            -- Nota: departamento_comunicacao NÃO tem permissão para activities (requisito do user)
        )
    )
);

-- Policy para UPDATE
DROP POLICY IF EXISTS "Update own municipality activities" ON public.activities;
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
        )
    )
);

-- Policy para DELETE
DROP POLICY IF EXISTS "Delete own municipality activities" ON public.activities;
CREATE POLICY "Delete activities for own scope" ON public.activities
FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role = 'superadmin'
            OR
            (profiles.role IN ('admin_municipal') -- tecnico não apaga
             AND profiles.municipio_id = activities.municipio_id)
            OR
            (profiles.role IN ('direccao_provincial') 
             AND profiles.direccao_provincial_id = activities.direccao_provincial_id)
        )
    )
);

-- 6. Atualizar Policies para Documents (Permitir acesso provincial e departamento comunicação)

-- Policy para SELECT
DROP POLICY IF EXISTS "View own municipality documents" ON public.documents;
CREATE POLICY "View own scope documents" ON public.documents
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role = 'superadmin'
            OR 
            (profiles.source_type = 'municipio' AND profiles.municipio_id = documents.municipio_id)
            OR
            (profiles.source_type = 'provincial' AND (
                profiles.governo_provincial_id = documents.governo_provincial_id
                OR profiles.direccao_provincial_id = documents.direccao_provincial_id
            ))
        )
    )
);

-- Policy para INSERT
DROP POLICY IF EXISTS "Insert documents for own municipality" ON public.documents;
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
            -- Direção Provincial pode inserir
            (profiles.role IN ('direccao_provincial') 
             AND profiles.direccao_provincial_id = documents.direccao_provincial_id)
            OR
             -- Departamento de Comunicação pode inserir
            (profiles.role IN ('departamento_comunicacao') 
             AND profiles.direccao_provincial_id = documents.direccao_provincial_id) -- Assumindo que pertencem a uma direção, ou municipio?
             -- Se departamento_comunicacao for municipal, lógica acima (role IN ...) precisaria ajuste.
             -- O requisito diz "Departamento de Informação e Comunicação" com acesso a Documentos.
             -- Vou assumir que este role pode existir TANTO a nível Municipal como Provincial se a estrutura permitir,
             -- mas o requisito falava num contexto de "departamento de comunicação". 
             -- Se for um departamento provincial, entra na lógica provincial.
        )
    )
);

-- Ajuste: departamento_comunicacao deve poder gerir documentos. 
-- Vou adicionar explicitamente nas policies de update/delete.

-- Policy para UPDATE
DROP POLICY IF EXISTS "Update own municipality documents" ON public.documents;
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

-- Policy para DELETE
DROP POLICY IF EXISTS "Delete own municipality documents" ON public.documents;
CREATE POLICY "Delete documents for own scope" ON public.documents
FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role = 'superadmin'
            OR
            (profiles.role IN ('admin_municipal') -- tecnico/leitor não apaga, departamento_comunicacao apaga?
             AND profiles.municipio_id = documents.municipio_id)
            OR
            (profiles.role IN ('direccao_provincial') 
             AND profiles.direccao_provincial_id = documents.direccao_provincial_id)
             -- departamento_comunicacao: Por segurança, vou assumir que NÃO apaga por defeito, a menos que especificado.
             -- O user disse "deve ter acesso ao menu de Documentação", não especificou "Apagar".
        )
    )
);
