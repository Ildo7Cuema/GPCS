-- ============================================================
-- Add missing columns to documents table: deadline & observations
-- These columns are used by the DocumentFormPage but were never
-- defined in the original documents migration.
-- ============================================================

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS observations text;
