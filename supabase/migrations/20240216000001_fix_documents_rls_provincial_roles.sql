-- ============================================================
-- Fix Documents RLS policies to support provincial roles
-- The original policies only allowed superadmin, admin_municipal, tecnico.
-- Provincial roles (direccao_provincial, departamento_comunicacao) also
-- need document access per application permissions.
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "View own municipality documents" ON public.documents;
DROP POLICY IF EXISTS "Insert documents for own municipality" ON public.documents;
DROP POLICY IF EXISTS "Update own municipality documents" ON public.documents;
DROP POLICY IF EXISTS "Delete own municipality documents" ON public.documents;

-- ==== SELECT ====
-- superadmin + provincial roles see ALL documents
-- municipal roles see only their municipality's documents
CREATE POLICY "View documents"
  ON public.documents FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role IN ('superadmin', 'direccao_provincial', 'departamento_comunicacao', 'departamento_informacao')
        OR profiles.municipio_id = documents.municipio_id
      )
    )
  );

-- ==== INSERT ====
-- Roles with canManageDocuments: superadmin, admin_municipal, tecnico,
-- direccao_provincial, departamento_comunicacao
CREATE POLICY "Insert documents"
  ON public.documents FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_municipal', 'tecnico', 'direccao_provincial', 'departamento_comunicacao')
      AND (
        profiles.role IN ('superadmin', 'direccao_provincial', 'departamento_comunicacao')
        OR profiles.municipio_id = documents.municipio_id
      )
    )
  );

-- ==== UPDATE ====
CREATE POLICY "Update documents"
  ON public.documents FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_municipal', 'tecnico', 'direccao_provincial', 'departamento_comunicacao')
      AND (
        profiles.role IN ('superadmin', 'direccao_provincial', 'departamento_comunicacao')
        OR profiles.municipio_id = documents.municipio_id
      )
    )
  );

-- ==== DELETE ====
-- Only superadmin, admin_municipal, direccao_provincial can delete
CREATE POLICY "Delete documents"
  ON public.documents FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_municipal', 'direccao_provincial')
      AND (
        profiles.role IN ('superadmin', 'direccao_provincial')
        OR profiles.municipio_id = documents.municipio_id
      )
    )
  );
