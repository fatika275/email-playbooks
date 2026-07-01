-- Run this once in Supabase SQL Editor before using Business Pro teams.

alter table public.user_profiles
  drop constraint if exists user_profiles_plan_check;

alter table public.user_profiles
  add constraint user_profiles_plan_check
  check (plan in ('free', 'pro', 'founder', 'business'));

create table if not exists public.business_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null default 'Business workspace',
  status text not null default 'active' check (status in ('active', 'inactive')),
  seat_limit integer not null default 10 check (seat_limit between 1 and 100),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces (id) on delete cascade,
  email text not null,
  user_id uuid references auth.users (id) on delete set null,
  role text not null default 'member' check (role = 'member'),
  status text not null default 'invited' check (status in ('invited', 'active')),
  access_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists business_members_workspace_email_idx
  on public.business_members (workspace_id, lower(email));

create index if not exists business_members_email_idx
  on public.business_members (lower(email), access_active);

alter table public.business_workspaces enable row level security;
alter table public.business_members enable row level security;

drop policy if exists "Owners can read their business workspace"
  on public.business_workspaces;
create policy "Owners can read their business workspace"
  on public.business_workspaces
  for select
  using (auth.uid() = owner_id);

drop policy if exists "Owners and members can read business members"
  on public.business_members;
create policy "Owners and members can read business members"
  on public.business_members
  for select
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) = lower(email)
    or exists (
      select 1
      from public.business_workspaces
      where business_workspaces.id = business_members.workspace_id
        and business_workspaces.owner_id = auth.uid()
    )
  );

drop policy if exists "Business owners can invite members"
  on public.business_members;
create policy "Business owners can invite members"
  on public.business_members
  for insert
  with check (
    exists (
      select 1
      from public.business_workspaces
      where business_workspaces.id = business_members.workspace_id
        and business_workspaces.owner_id = auth.uid()
        and business_workspaces.status = 'active'
    )
  );

drop policy if exists "Business owners can remove members"
  on public.business_members;
create policy "Business owners can remove members"
  on public.business_members
  for delete
  using (
    exists (
      select 1
      from public.business_workspaces
      where business_workspaces.id = business_members.workspace_id
        and business_workspaces.owner_id = auth.uid()
    )
  );

create or replace function public.claim_business_membership()
returns setof public.business_members
language sql
security definer
set search_path = public
as $$
  update public.business_members as member
  set user_id = auth.uid(),
      status = 'active',
      updated_at = now()
  from public.business_workspaces as workspace
  where member.workspace_id = workspace.id
    and workspace.status = 'active'
    and member.access_active = true
    and lower(member.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  returning member.*;
$$;

revoke all on function public.claim_business_membership() from public;
grant execute on function public.claim_business_membership() to authenticated;

create or replace function public.enforce_business_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_members integer;
  allowed_members integer;
begin
  select seat_limit into allowed_members
  from public.business_workspaces
  where id = new.workspace_id and status = 'active';

  if allowed_members is null then
    raise exception 'This Business Pro workspace is not active.';
  end if;

  select count(*) into current_members
  from public.business_members
  where workspace_id = new.workspace_id;

  if current_members >= allowed_members then
    raise exception 'This Business Pro workspace already has 10 teammates.';
  end if;

  return new;
end;
$$;

drop trigger if exists business_seat_limit_trigger
  on public.business_members;
create trigger business_seat_limit_trigger
before insert on public.business_members
for each row execute function public.enforce_business_seat_limit();
