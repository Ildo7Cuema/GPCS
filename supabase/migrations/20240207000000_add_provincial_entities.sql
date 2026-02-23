-- Migração: Adicionar suporte para entidades provinciais
-- Tabelas: governo_provincial, direccoes_provinciais, departamentos_provinciais

-- 1. Governo Provincial (configuração única por província)
CREATE TABLE public.governo_provincial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    province TEXT NOT NULL DEFAULT 'Cabinda',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Direcções Provinciais (subordinadas ao Governo)
CREATE TABLE public.direccoes_provinciais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    abbreviation TEXT, -- Ex: "DPCS" para Direcção Provincial de Comunicação Social
    governo_id UUID REFERENCES public.governo_provincial(id) ON DELETE CASCADE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Departamentos Provinciais (dentro das Direcções)
CREATE TABLE public.departamentos_provinciais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    direccao_id UUID REFERENCES public.direccoes_provinciais(id) ON DELETE CASCADE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Alterar tabela media_files para suportar entidades provinciais
ALTER TABLE public.media_files 
ADD COLUMN source_type TEXT DEFAULT 'municipio' CHECK (source_type IN ('municipio', 'provincial')),
ADD COLUMN governo_provincial_id UUID REFERENCES public.governo_provincial(id),
ADD COLUMN direccao_provincial_id UUID REFERENCES public.direccoes_provinciais(id),
ADD COLUMN departamento_provincial_id UUID REFERENCES public.departamentos_provinciais(id);

-- 5. Índices para performance
CREATE INDEX idx_media_files_source_type ON public.media_files(source_type);
CREATE INDEX idx_media_files_direccao ON public.media_files(direccao_provincial_id);
CREATE INDEX idx_media_files_departamento ON public.media_files(departamento_provincial_id);

-- 6. RLS para novas tabelas
ALTER TABLE public.governo_provincial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direccoes_provinciais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamentos_provinciais ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura para utilizadores autenticados
CREATE POLICY "Authenticated users can read governo_provincial" 
ON public.governo_provincial FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read direccoes_provinciais" 
ON public.direccoes_provinciais FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read departamentos_provinciais" 
ON public.departamentos_provinciais FOR SELECT TO authenticated USING (true);

-- 7. Políticas de escrita (apenas superadmin)
CREATE POLICY "Superadmin can insert governo_provincial" 
ON public.governo_provincial FOR INSERT TO authenticated 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Superadmin can update governo_provincial" 
ON public.governo_provincial FOR UPDATE TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Superadmin can delete governo_provincial" 
ON public.governo_provincial FOR DELETE TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Superadmin can insert direccoes_provinciais" 
ON public.direccoes_provinciais FOR INSERT TO authenticated 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Superadmin can update direccoes_provinciais" 
ON public.direccoes_provinciais FOR UPDATE TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Superadmin can delete direccoes_provinciais" 
ON public.direccoes_provinciais FOR DELETE TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Superadmin can insert departamentos_provinciais" 
ON public.departamentos_provinciais FOR INSERT TO authenticated 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Superadmin can update departamentos_provinciais" 
ON public.departamentos_provinciais FOR UPDATE TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Superadmin can delete departamentos_provinciais" 
ON public.departamentos_provinciais FOR DELETE TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- 8. Inserir governo provincial inicial (obrigatório para o sistema funcionar)
-- A criação de Direcções e Departamentos será feita via interface
INSERT INTO public.governo_provincial (name, province, description) VALUES
('Governo Provincial de Cabinda', 'Cabinda', 'Órgão executivo provincial');

