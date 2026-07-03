-- Run after lead-management.sql to add tasks and activity history.

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
      )
  );
$$;

revoke all on function public.can_access_prospect(uuid) from public;
grant execute on function public.can_access_prospect(uuid) to authenticated;

create table if not exists public.prospect_activities (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  activity_type text not null
    check (activity_type in ('note', 'email', 'call', 'meeting', 'status')),
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists prospect_activities_prospect_idx
  on public.prospect_activities (prospect_id, created_at desc);

alter table public.prospect_activities enable row level security;

drop policy if exists "Users can read accessible prospect activities"
  on public.prospect_activities;
create policy "Users can read accessible prospect activities"
  on public.prospect_activities for select
  using (public.can_access_prospect(prospect_id));

drop policy if exists "Users can create accessible prospect activities"
  on public.prospect_activities;
create policy "Users can create accessible prospect activities"
  on public.prospect_activities for insert
  with check (
    created_by = auth.uid()
    and public.can_access_prospect(prospect_id)
  );

drop policy if exists "Users can delete their prospect activities"
  on public.prospect_activities;
create policy "Users can delete their prospect activities"
  on public.prospect_activities for delete
  using (
    created_by = auth.uid()
    and public.can_access_prospect(prospect_id)
  );

create table if not exists public.prospect_tasks (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  title text not null,
  due_date date,
  assigned_email text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospect_tasks_prospect_idx
  on public.prospect_tasks (prospect_id, completed_at, due_date);

alter table public.prospect_tasks enable row level security;

drop policy if exists "Users can read accessible prospect tasks"
  on public.prospect_tasks;
create policy "Users can read accessible prospect tasks"
  on public.prospect_tasks for select
  using (public.can_access_prospect(prospect_id));

drop policy if exists "Users can create accessible prospect tasks"
  on public.prospect_tasks;
create policy "Users can create accessible prospect tasks"
  on public.prospect_tasks for insert
  with check (
    created_by = auth.uid()
    and public.can_access_prospect(prospect_id)
  );

drop policy if exists "Users can update accessible prospect tasks"
  on public.prospect_tasks;
create policy "Users can update accessible prospect tasks"
  on public.prospect_tasks for update
  using (public.can_access_prospect(prospect_id))
  with check (public.can_access_prospect(prospect_id));

drop policy if exists "Users can delete accessible prospect tasks"
  on public.prospect_tasks;
create policy "Users can delete accessible prospect tasks"
  on public.prospect_tasks for delete
  using (public.can_access_prospect(prospect_id));

create or replace function public.log_prospect_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.stage is distinct from new.stage and auth.uid() is not null then
    insert into public.prospect_activities (
      prospect_id,
      created_by,
      activity_type,
      summary
    ) values (
      new.id,
      auth.uid(),
      'status',
      'Stage changed from ' || initcap(old.stage) || ' to ' || initcap(new.stage)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists prospect_stage_activity_trigger on public.prospects;
create trigger prospect_stage_activity_trigger
after update of stage on public.prospects
for each row execute function public.log_prospect_stage_change();
