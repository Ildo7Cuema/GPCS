-- Create new migration for user_invitations table updates
ALTER TABLE public.user_invitations
ADD COLUMN IF NOT EXISTS source_type public.source_type DEFAULT 'municipio',
ADD COLUMN IF NOT EXISTS governo_provincial_id uuid REFERENCES public.governo_provincial(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS direccao_provincial_id uuid REFERENCES public.direccoes_provinciais(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS departamento_provincial_id uuid REFERENCES public.departamentos_provinciais(id) ON DELETE SET NULL;
