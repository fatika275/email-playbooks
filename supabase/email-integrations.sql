-- Run this once in Supabase SQL Editor to enable automatic reply detection.

create table if not exists public.email_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('gmail', 'outlook')),
  email text not null,
  provider_account_id text,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text,
  sync_cursor text,
  status text not null default 'active' check (status in ('active', 'needs_reconnect', 'paused')),
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, email)
);

create index if not exists email_integrations_user_idx
  on public.email_integrations (user_id, status, updated_at desc);

alter table public.email_integrations enable row level security;

drop policy if exists "Users can read their email integrations" on public.email_integrations;
create policy "Users can read their email integrations"
on public.email_integrations for select
using (user_id = auth.uid());

drop policy if exists "Users can delete their email integrations" on public.email_integrations;
create policy "Users can delete their email integrations"
on public.email_integrations for delete
using (user_id = auth.uid());

create table if not exists public.email_reply_events (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.email_integrations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  prospect_id uuid references public.prospects (id) on delete set null,
  provider_message_id text not null,
  from_email text not null,
  from_name text,
  subject text,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  unique (integration_id, provider_message_id)
);

create index if not exists email_reply_events_user_idx
  on public.email_reply_events (user_id, created_at desc);
create index if not exists email_reply_events_prospect_idx
  on public.email_reply_events (prospect_id, created_at desc);

alter table public.email_reply_events enable row level security;

drop policy if exists "Users can read their email reply events" on public.email_reply_events;
create policy "Users can read their email reply events"
on public.email_reply_events for select
using (user_id = auth.uid());
