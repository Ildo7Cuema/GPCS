-- ============================================================
-- ACTIVITIES MODULE – Tables, RLS, Indexes, Storage
-- ============================================================

-- 1. Media Types lookup table
CREATE TABLE IF NOT EXISTS public.media_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Seed default media types
INSERT INTO public.media_types (name) VALUES
  ('TV'),
  ('Rádio'),
  ('Jornal Impresso'),
  ('Jornal Online'),
  ('Portal Web'),
  ('Redes Sociais'),
  ('Agência de Notícias'),
  ('Outro')
ON CONFLICT (name) DO NOTHING;

-- 2. Activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipio_id uuid NOT NULL REFERENCES public.municipios(id) ON DELETE CASCADE,
  title text NOT NULL,
  activity_type text NOT NULL,
  date date NOT NULL,
  time time,
  promoter text,
  minister_present boolean DEFAULT false,
  governor_present boolean DEFAULT false,
  administrator_present boolean DEFAULT false,
  media_type_id uuid REFERENCES public.media_types(id),
  media_outlet text,
  news_published boolean DEFAULT false,
  program_page text,
  publication_link text,
  observations text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- 3. Attachments table (linked to activities)
CREATE TABLE IF NOT EXISTS public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_activities_municipio_id ON public.activities(municipio_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON public.activities(date);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type ON public.activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_attachments_activity_id ON public.attachments(activity_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.media_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Media Types: readable by all authenticated
CREATE POLICY "Authenticated read media_types"
  ON public.media_types FOR SELECT TO authenticated USING (true);

-- Activities: municipality users see their own; superadmin sees all
CREATE POLICY "View own municipality activities"
  ON public.activities FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'superadmin'
        OR profiles.municipio_id = activities.municipio_id
      )
    )
  );

CREATE POLICY "Insert activities for own municipality"
  ON public.activities FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_municipal', 'tecnico')
      AND (
        profiles.role = 'superadmin'
        OR profiles.municipio_id = activities.municipio_id
      )
    )
  );

CREATE POLICY "Update own municipality activities"
  ON public.activities FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_municipal', 'tecnico')
      AND (
        profiles.role = 'superadmin'
        OR profiles.municipio_id = activities.municipio_id
      )
    )
  );

CREATE POLICY "Delete own municipality activities"
  ON public.activities FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin_municipal')
      AND (
        profiles.role = 'superadmin'
        OR profiles.municipio_id = activities.municipio_id
      )
    )
  );

-- Attachments: follow activity access
CREATE POLICY "View attachments via activity access"
  ON public.attachments FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE a.id = attachments.activity_id
      AND (p.role = 'superadmin' OR p.municipio_id = a.municipio_id)
    )
  );

CREATE POLICY "Insert attachments for own activities"
  ON public.attachments FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.activities a
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE a.id = attachments.activity_id
      AND p.role IN ('superadmin', 'admin_municipal', 'tecnico')
      AND (p.role = 'superadmin' OR p.municipio_id = a.municipio_id)
    )
  );

CREATE POLICY "Delete attachments for own activities"
  ON public.attachments FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE a.id = attachments.activity_id
      AND p.role IN ('superadmin', 'admin_municipal')
      AND (p.role = 'superadmin' OR p.municipio_id = a.municipio_id)
    )
  );

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-evidence', 'activity-evidence', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "Auth upload activity evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'activity-evidence');

CREATE POLICY "Auth read activity evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'activity-evidence');

CREATE POLICY "Auth delete activity evidence"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'activity-evidence');
