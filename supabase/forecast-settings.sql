-- Run after lead-management.sql to enable adaptable pipeline forecasting.

create table if not exists public.forecast_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid references public.business_workspaces (id) on delete cascade,
  value_basis text not null default 'fixed'
    check (value_basis in ('fixed', 'monthly', 'annual')),
  default_months integer not null default 12 check (default_months between 1 and 60),
  stage_probabilities jsonb not null default
    '{"new":5,"researching":10,"contacted":20,"replied":35,"qualified":55,"meeting":75,"won":100,"lost":0}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists forecast_settings_personal_idx
  on public.forecast_settings (owner_id)
  where workspace_id is null;

create unique index if not exists forecast_settings_workspace_idx
  on public.forecast_settings (workspace_id)
  where workspace_id is not null;

alter table public.forecast_settings enable row level security;

drop policy if exists "Users can read accessible forecast settings"
  on public.forecast_settings;
create policy "Users can read accessible forecast settings"
  on public.forecast_settings for select
  using (
    owner_id = auth.uid()
    or (
      workspace_id is not null
      and public.can_access_business_workspace(workspace_id)
    )
  );

drop policy if exists "Users can create owned forecast settings"
  on public.forecast_settings;
create policy "Users can create owned forecast settings"
  on public.forecast_settings for insert
  with check (
    owner_id = auth.uid()
    and (
      workspace_id is null
      or exists (
        select 1 from public.business_workspaces
        where business_workspaces.id = forecast_settings.workspace_id
          and business_workspaces.owner_id = auth.uid()
          and business_workspaces.status = 'active'
      )
    )
  );

drop policy if exists "Owners can update forecast settings"
  on public.forecast_settings;
create policy "Owners can update forecast settings"
  on public.forecast_settings for update
  using (
    owner_id = auth.uid()
    and (
      workspace_id is null
      or exists (
        select 1 from public.business_workspaces
        where business_workspaces.id = forecast_settings.workspace_id
          and business_workspaces.owner_id = auth.uid()
      )
    )
  )
  with check (owner_id = auth.uid());
