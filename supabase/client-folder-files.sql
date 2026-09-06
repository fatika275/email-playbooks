-- Run this once in Supabase SQL Editor after client-folder-sharing.sql.
-- This stores client folder files and links per account instead of local browser storage.

create table if not exists public.client_folder_files (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  title text not null,
  kind text not null default 'asset',
  url text,
  folder text not null default 'Client files',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_folder_files_prospect_idx
  on public.client_folder_files (prospect_id, created_at desc);

create index if not exists client_folder_files_user_idx
  on public.client_folder_files (user_id, created_at desc);

alter table public.client_folder_files enable row level security;

drop policy if exists "Users can read accessible client files"
  on public.client_folder_files;
create policy "Users can read accessible client files"
  on public.client_folder_files
  for select
  using (public.can_access_prospect(prospect_id));

drop policy if exists "Users can save files to accessible client folders"
  on public.client_folder_files;
create policy "Users can save files to accessible client folders"
  on public.client_folder_files
  for insert
  with check (
    user_id = auth.uid()
    and public.can_access_prospect(prospect_id)
  );

drop policy if exists "Owners and editors can update client files"
  on public.client_folder_files;
create policy "Owners and editors can update client files"
  on public.client_folder_files
  for update
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.client_folder_shares as folder_share
      where folder_share.prospect_id = client_folder_files.prospect_id
        and lower(folder_share.recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and folder_share.access = 'edit'
    )
  )
  with check (
    user_id = auth.uid()
    and public.can_access_prospect(prospect_id)
  );

drop policy if exists "Owners and editors can remove client files"
  on public.client_folder_files;
create policy "Owners and editors can remove client files"
  on public.client_folder_files
  for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.client_folder_shares as folder_share
      where folder_share.prospect_id = client_folder_files.prospect_id
        and lower(folder_share.recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and folder_share.access = 'edit'
    )
  );
