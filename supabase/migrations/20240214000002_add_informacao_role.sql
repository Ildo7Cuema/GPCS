-- Migração: Adicionar role departamento_informacao
-- Separar Comunicação e Informação

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'departamento_informacao';
