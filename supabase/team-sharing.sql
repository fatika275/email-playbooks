-- Run this once in Supabase SQL Editor before using Team Library.

create table if not exists public.team_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  owner_email text not null,
  recipient_email text not null,
  asset_type text not null check (asset_type in ('email', 'sequence')),
  source_id text not null,
  title text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists team_shares_owner_id_idx
  on public.team_shares (owner_id, created_at desc);

create index if not exists team_shares_recipient_email_idx
  on public.team_shares (lower(recipient_email), created_at desc);

alter table public.team_shares enable row level security;

drop policy if exists "Senders and recipients can read team shares"
  on public.team_shares;
create policy "Senders and recipients can read team shares"
  on public.team_shares
  for select
  using (
    auth.uid() = owner_id
    or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(recipient_email)
  );

drop policy if exists "Users can share their own assets"
  on public.team_shares;
create policy "Users can share their own assets"
  on public.team_shares
  for insert
  with check (
    auth.uid() = owner_id
    and lower(coalesce(auth.jwt() ->> 'email', '')) = lower(owner_email)
  );

drop policy if exists "Senders can remove team shares"
  on public.team_shares;
create policy "Senders can remove team shares"
  on public.team_shares
  for delete
  using (auth.uid() = owner_id);
