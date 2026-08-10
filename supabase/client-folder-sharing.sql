-- Run this once in Supabase SQL Editor to make client folder sharing real.
-- Run after lead-operations.sql and team-sharing.sql.

create table if not exists public.client_folder_shares (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  owner_email text not null,
  recipient_email text not null,
  access text not null default 'view' check (access in ('view', 'edit')),
  created_at timestamptz not null default now(),
  unique (prospect_id, recipient_email)
);

create index if not exists client_folder_shares_prospect_idx
  on public.client_folder_shares (prospect_id, created_at desc);

create index if not exists client_folder_shares_recipient_idx
  on public.client_folder_shares (lower(recipient_email), created_at desc);

alter table public.client_folder_shares enable row level security;

create or replace function public.can_access_prospect(target_prospect_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.prospects as prospect
    where prospect.id = target_prospect_id
      and (
        prospect.owner_id = auth.uid()
        or (
          prospect.workspace_id is not null
          and public.can_access_business_workspace(prospect.workspace_id)
        )
        or exists (
          select 1
          from public.client_folder_shares as folder_share
          where folder_share.prospect_id = prospect.id
            and lower(folder_share.recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
      )
  );
$$;

revoke all on function public.can_access_prospect(uuid) from public;
grant execute on function public.can_access_prospect(uuid) to authenticated;

drop policy if exists "Users can read accessible client folder shares"
  on public.client_folder_shares;
create policy "Users can read accessible client folder shares"
  on public.client_folder_shares
  for select
  using (
    owner_id = auth.uid()
    or lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "Users can share accessible client folders"
  on public.client_folder_shares;
create policy "Users can share accessible client folders"
  on public.client_folder_shares
  for insert
  with check (
    owner_id = auth.uid()
    and lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and public.can_access_prospect(prospect_id)
  );

drop policy if exists "Owners can update client folder access"
  on public.client_folder_shares;
create policy "Owners can update client folder access"
  on public.client_folder_shares
  for update
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and public.can_access_prospect(prospect_id)
  );

drop policy if exists "Owners can remove client folder access"
  on public.client_folder_shares;
create policy "Owners can remove client folder access"
  on public.client_folder_shares
  for delete
  using (owner_id = auth.uid());
