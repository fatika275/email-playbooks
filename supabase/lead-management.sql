-- Run this once in Supabase SQL Editor before using Prospect Pipeline.

create or replace function public.can_access_business_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_workspaces as workspace
    where workspace.id = target_workspace_id
      and workspace.status = 'active'
      and (
        workspace.owner_id = auth.uid()
        or exists (
          select 1
          from public.business_members as member
          where member.workspace_id = workspace.id
            and member.access_active = true
            and (
              member.user_id = auth.uid()
              or lower(member.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
            )
        )
      )
  );
$$;

revoke all on function public.can_access_business_workspace(uuid) from public;
grant execute on function public.can_access_business_workspace(uuid) to authenticated;

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid references public.business_workspaces (id) on delete cascade,
  full_name text not null,
  company text not null,
  email text,
  role text,
  linkedin_url text,
  source text,
  budget_range text,
  deliverables text,
  timeline text,
  decision_maker text,
  service_type text,
  stage text not null default 'new'
    check (stage in ('new', 'researching', 'contacted', 'replied', 'qualified', 'meeting', 'won', 'lost')),
  estimated_value_gbp integer not null default 0 check (estimated_value_gbp >= 0),
  notes text,
  next_follow_up date,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prospects
  add column if not exists budget_range text,
  add column if not exists deliverables text,
  add column if not exists timeline text,
  add column if not exists decision_maker text,
  add column if not exists service_type text;

create index if not exists prospects_owner_idx
  on public.prospects (owner_id, updated_at desc);
create index if not exists prospects_workspace_idx
  on public.prospects (workspace_id, stage, updated_at desc);
create index if not exists prospects_follow_up_idx
  on public.prospects (next_follow_up)
  where next_follow_up is not null;

alter table public.prospects enable row level security;

drop policy if exists "Users can read accessible prospects" on public.prospects;
create policy "Users can read accessible prospects" on public.prospects
for select using (
  owner_id = auth.uid()
  or (workspace_id is not null and public.can_access_business_workspace(workspace_id))
);

drop policy if exists "Users can create accessible prospects" on public.prospects;
create policy "Users can create accessible prospects" on public.prospects
for insert with check (
  owner_id = auth.uid()
  and (workspace_id is null or public.can_access_business_workspace(workspace_id))
);

drop policy if exists "Users can update accessible prospects" on public.prospects;
create policy "Users can update accessible prospects" on public.prospects
for update using (
  owner_id = auth.uid()
  or (workspace_id is not null and public.can_access_business_workspace(workspace_id))
)
with check (
  workspace_id is null or public.can_access_business_workspace(workspace_id)
);

drop policy if exists "Users can delete accessible prospects" on public.prospects;
create policy "Users can delete accessible prospects" on public.prospects
for delete using (
  owner_id = auth.uid()
  or (workspace_id is not null and public.can_access_business_workspace(workspace_id))
);
