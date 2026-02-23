-- Migration: Create user_invitations table for invitation-based account creation
-- Only SuperAdmin can create invitations, users complete registration via unique token

-- 1. Create user_invitations table
CREATE TABLE public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'leitor',
  municipio_id UUID REFERENCES public.municipios(id),
  province TEXT,
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add index for token lookups
CREATE INDEX idx_invitations_token ON public.user_invitations(token);
CREATE INDEX idx_invitations_email ON public.user_invitations(email);

-- 3. Enable Row Level Security
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Superadmin can manage all invitations
CREATE POLICY "Superadmin manages invitations" ON public.user_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    )
  );

-- 5. Policy: Anyone can read by token (for validation during registration)
-- This allows unauthenticated users to validate their invitation token
CREATE POLICY "Public can validate invitation by token" ON public.user_invitations
  FOR SELECT USING (true);

-- 6. Comment for documentation
COMMENT ON TABLE public.user_invitations IS 'Stores invitation tokens for controlled user registration. Only SuperAdmin can create invitations.';
