-- Migração: Limpar dados fictícios e adicionar políticas de escrita
-- Executar APENAS se as tabelas já existem

-- 0. Adicionar coluna province à tabela direccoes_provinciais (se não existir)
ALTER TABLE public.direccoes_provinciais 
ADD COLUMN IF NOT EXISTS province TEXT DEFAULT 'Cabinda';

-- 1. Remover dados de exemplo (Direcções e Departamentos fictícios)
DELETE FROM public.departamentos_provinciais;
DELETE FROM public.direccoes_provinciais;

-- 2. Adicionar políticas de escrita (se não existirem)
-- Para Governo Provincial
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Superadmin can insert governo_provincial') THEN
        CREATE POLICY "Superadmin can insert governo_provincial" 
        ON public.governo_provincial FOR INSERT TO authenticated 
        WITH CHECK (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Superadmin can update governo_provincial') THEN
        CREATE POLICY "Superadmin can update governo_provincial" 
        ON public.governo_provincial FOR UPDATE TO authenticated 
        USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Superadmin can delete governo_provincial') THEN
        CREATE POLICY "Superadmin can delete governo_provincial" 
        ON public.governo_provincial FOR DELETE TO authenticated 
        USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
        );
    END IF;
END $$;

-- Para Direcções Provinciais
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Superadmin can insert direccoes_provinciais') THEN
        CREATE POLICY "Superadmin can insert direccoes_provinciais" 
        ON public.direccoes_provinciais FOR INSERT TO authenticated 
        WITH CHECK (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Superadmin can update direccoes_provinciais') THEN
        CREATE POLICY "Superadmin can update direccoes_provinciais" 
        ON public.direccoes_provinciais FOR UPDATE TO authenticated 
        USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Superadmin can delete direccoes_provinciais') THEN
        CREATE POLICY "Superadmin can delete direccoes_provinciais" 
        ON public.direccoes_provinciais FOR DELETE TO authenticated 
        USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
        );
    END IF;
END $$;

-- Para Departamentos Provinciais
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Superadmin can insert departamentos_provinciais') THEN
        CREATE POLICY "Superadmin can insert departamentos_provinciais" 
        ON public.departamentos_provinciais FOR INSERT TO authenticated 
        WITH CHECK (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Superadmin can update departamentos_provinciais') THEN
        CREATE POLICY "Superadmin can update departamentos_provinciais" 
        ON public.departamentos_provinciais FOR UPDATE TO authenticated 
        USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Superadmin can delete departamentos_provinciais') THEN
        CREATE POLICY "Superadmin can delete departamentos_provinciais" 
        ON public.departamentos_provinciais FOR DELETE TO authenticated 
        USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
        );
    END IF;
END $$;
