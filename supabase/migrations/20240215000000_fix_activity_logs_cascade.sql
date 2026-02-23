-- Fix foreign key constraint on activity_logs to allow user deletion
-- Option: Set user_id to NULL when user is deleted (preserves audit trail)

-- Drop the existing foreign key constraint
alter table public.activity_logs 
  drop constraint if exists activity_logs_user_id_fkey;

-- Recreate the constraint with ON DELETE SET NULL
alter table public.activity_logs 
  add constraint activity_logs_user_id_fkey 
  foreign key (user_id) 
  references public.profiles(id) 
  on delete set null;

-- Make user_id nullable if it isn't already
alter table public.activity_logs 
  alter column user_id drop not null;
