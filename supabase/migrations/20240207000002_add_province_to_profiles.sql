-- Migração: Adicionar coluna province à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN province TEXT;
