-- ============================================================
-- DOCUMENTS MODULE – Tables, RLS, Indexes, Storage, Auto-numbering
-- ============================================================

-- 1. Document type enum
CREATE TYPE public.document_type AS ENUM (
  'oficio',
  'convite',
  'solicitacao',
  'circular',
  'programa',
  'nota'
);

CREATE TYPE public.document_direction AS ENUM ('received', 'sent');

CREATE TYPE public.document_status AS ENUM (
  'em_tramitacao',
  'respondido',
  'arquivado'
);

-- 2. Protocol number sequence (resets annually via function)
CREATE SEQUENCE IF NOT EXISTS public.protocol_number_seq;

-- Function to generate annual protocol numbers: YYYY/NNNN
CREATE OR REPLACE FUNCTION public.generate_protocol_number()
RETURNS text AS $$
DECLARE
  current_year text;
  seq_val bigint;
BEGIN
  current_year := EXTRACT(YEAR FROM NOW())::text;
  seq_val := nextval('public.protocol_number_seq');
  RETURN current_year || '/' || LPAD(seq_val::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_number text NOT NULL UNIQUE DEFAULT public.generate_protocol_number(),
  type public.document_type NOT NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  subject text NOT NULL,
  document_date date NOT NULL,
  direction public.document_direction NOT NULL,
  status public.document_status NOT NULL DEFAULT 'em_tramitacao',
  municipio_id uuid REFERENCES public.municipios(id) ON DELETE SET NULL,
  file_url text,
  file_path text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- 4. Document movements (audit trail)
CREATE TABLE IF NOT EXISTS public.document_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  action text NOT NULL,
  performed_by uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_document_date ON public.documents(document_date);
CREATE INDEX IF NOT EXISTS idx_documents_direction ON public.documents(direction);
CREATE INDEX IF NOT EXISTS idx_documents_municipio_id ON public.documents(municipio_id);
CREATE INDEX IF NOT EXISTS idx_document_movements_document_id ON public.document_movements(document_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_movements ENABLE ROW LEVEL SECURITY;

-- Documents: municipality users see their own; superadmin sees all
CREATE POLICY "View own municipality documents"
  ON public.documents FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'superadmin'
        OR profiles.municipio_id = documents.municipio_id
      )
    )
  );

CREATE POLICY "Insert documents for own municipality"
  ON public.documents FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_municipal', 'tecnico')
      AND (
        profiles.role = 'superadmin'
        OR profiles.municipio_id = documents.municipio_id
      )
    )
  );

CREATE POLICY "Update own municipality documents"
  ON public.documents FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_municipal', 'tecnico')
      AND (
        profiles.role = 'superadmin'
        OR profiles.municipio_id = documents.municipio_id
      )
    )
  );

CREATE POLICY "Delete own municipality documents"
  ON public.documents FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_municipal')
      AND (
        profiles.role = 'superadmin'
        OR profiles.municipio_id = documents.municipio_id
      )
    )
  );

-- Document Movements: follow document access
CREATE POLICY "View movements via document access"
  ON public.document_movements FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE d.id = document_movements.document_id
      AND (p.role = 'superadmin' OR p.municipio_id = d.municipio_id)
    )
  );

CREATE POLICY "Insert movements for accessible documents"
  ON public.document_movements FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE d.id = document_movements.document_id
      AND p.role IN ('superadmin', 'admin_municipal', 'tecnico')
      AND (p.role = 'superadmin' OR p.municipio_id = d.municipio_id)
    )
  );

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-attachments', 'document-attachments', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "Auth upload document attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'document-attachments');

CREATE POLICY "Auth read document attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'document-attachments');

CREATE POLICY "Auth delete document attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'document-attachments');

-- ============================================================
-- Auto-create movement on document insert
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_create_document_movement()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.document_movements (document_id, action, performed_by, notes)
  VALUES (NEW.id, 'Documento criado', NEW.created_by, 'Registo inicial do documento');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_document_created
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_document_movement();
