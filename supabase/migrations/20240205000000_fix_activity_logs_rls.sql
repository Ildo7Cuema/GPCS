-- Enable RLS on activity_logs if not already enabled (it is, but good to ensure)
alter table public.activity_logs enable row level security;

-- Policy: Users can insert their own activity logs
create policy "Users can insert their own activity logs"
on public.activity_logs
for insert
to authenticated
with check (auth.uid() = user_id);

-- Policy: Superadmin can view all activity logs
create policy "Superadmin can view all activity logs"
on public.activity_logs
for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and profiles.role = 'superadmin'
  )
);

-- Policy: Users can view their own activity logs
create policy "Users can view their own activity logs"
on public.activity_logs
for select
to authenticated
using (auth.uid() = user_id);
