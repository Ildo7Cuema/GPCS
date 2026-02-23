-- Create tables for GPCS Media System

-- 1. Municipios
create table public.municipios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  province text not null default 'Luanda', -- Assuming Luanda or generic
  created_at timestamptz default now()
);

-- 2. Areas (Departments)
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  municipio_id uuid references public.municipios(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- 3. Profiles (Extends auth.users)
create type public.user_role as enum ('superadmin', 'admin_municipal', 'tecnico', 'leitor');

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  role user_role default 'leitor',
  municipio_id uuid references public.municipios(id), -- Null for superadmin
  area_id uuid references public.areas(id), -- Null for admins
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Media Files
create table public.media_files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_url text not null,
  file_path text not null, -- Storage path
  file_type text not null, -- 'image', 'video', 'document', 'audio'
  mime_type text,
  size_bytes bigint,
  municipio_id uuid references public.municipios(id),
  area_id uuid references public.areas(id),
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- 5. Activity Logs
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null, -- 'upload', 'delete', 'download', 'login'
  details jsonb, -- Extra info
  created_at timestamptz default now()
);

-- RLS Policies

-- Enable RLS
alter table public.municipios enable row level security;
alter table public.areas enable row level security;
alter table public.profiles enable row level security;
alter table public.media_files enable row level security;
alter table public.activity_logs enable row level security;

-- Policies (Simplified for initial setup)

-- Municipios/Areas: Readable by authenticated users
create policy "Public read access for authenticated users" on public.municipios for select to authenticated using (true);
create policy "Public read access for authenticated users" on public.areas for select to authenticated using (true);

-- Profiles: 
-- Users can read their own profile
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
-- Superadmin can read all
-- (Skip complex logic for now, add basic self-read)

-- Media Files:
-- Readable by users in same municipality (or superadmin)
create policy "View media from same municipality" on public.media_files for select using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and (profiles.role = 'superadmin' or profiles.municipio_id = media_files.municipio_id)
  )
);

-- Upload only by technical/admin roles
create policy "Upload by authorized staff" on public.media_files for insert with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role in ('superadmin', 'admin_municipal', 'tecnico')
    and (profiles.role = 'superadmin' or profiles.municipio_id = media_files.municipio_id)
  )
);

-- Storage bucket setup (SQL for Supabase Storage is separate, usually via API or dashboard, but we can try to init buckets via SQL if extension enabled)
insert into storage.buckets (id, name, public) values ('media-archive', 'media-archive', false) on conflict do nothing;

-- Storage policies
-- Allow authenticated uploads
create policy "Authenticated users can upload" on storage.objects for insert to authenticated with check (bucket_id = 'media-archive');
-- Allow read if they have access (this is complex in storage policies, often simplified to authenticated read for internal apps)
create policy "Authenticated users can read" on storage.objects for select to authenticated using (bucket_id = 'media-archive');

