-- Enable pg_trgm for fuzzy search (ilike)
create extension if not exists pg_trgm;

-- Activities Indexes
-- Used for text search (title, promoter)
create index if not exists idx_activities_text_search on public.activities using gin (title gin_trgm_ops, promoter gin_trgm_ops);

-- Used for sorting and range filtering
create index if not exists idx_activities_created_at on public.activities(created_at desc);

-- Documents Indexes
create index if not exists idx_documents_text_search on public.documents using gin (subject gin_trgm_ops, origin gin_trgm_ops);
create index if not exists idx_documents_created_at on public.documents(created_at desc);


-- Media Files Indexes
create index if not exists idx_media_files_text_search on public.media_files using gin (title gin_trgm_ops, description gin_trgm_ops);
create index if not exists idx_media_files_created_at on public.media_files(created_at desc);

-- Profiles Indexes (Crucial for RLS policies)
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_municipio_id on public.profiles(municipio_id);

-- Attachments Indexes
create index if not exists idx_attachments_created_at on public.attachments(created_at desc);
