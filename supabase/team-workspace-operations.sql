-- Run after business-workspaces.sql, lead-management.sql, and lead-operations.sql.
-- Adds team roles, workspace discovery, CRM assignments, and workspace activity.

alter table public.business_members
  drop constraint if exists business_members_role_check;

alter table public.business_members
  add constraint business_members_role_check
  check (role in ('admin', 'member'));

create or replace function public.can_manage_business_workspace(target_workspace_id uuid)
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
            and member.user_id = auth.uid()
            and member.role = 'admin'
            and member.status = 'active'
            and member.access_active = true
        )
      )
  );
$$;

revoke all on function public.can_manage_business_workspace(uuid) from public;
grant execute on function public.can_manage_business_workspace(uuid) to authenticated;

drop policy if exists "Owners can read their business workspace" on public.business_workspaces;
drop policy if exists "Workspace members can read their business workspace" on public.business_workspaces;
create policy "Workspace members can read their business workspace"
  on public.business_workspaces for select
  using (public.can_access_business_workspace(id));

drop policy if exists "Owners and members can read business members" on public.business_members;
drop policy if exists "Workspace members can read business members" on public.business_members;
create policy "Workspace members can read business members"
  on public.business_members for select
  using (public.can_access_business_workspace(workspace_id));

drop policy if exists "Business owners can invite members" on public.business_members;
drop policy if exists "Workspace managers can invite members" on public.business_members;
create policy "Workspace managers can invite members"
  on public.business_members for insert
  with check (public.can_manage_business_workspace(workspace_id));

drop policy if exists "Workspace managers can update members" on public.business_members;
create policy "Workspace managers can update members"
  on public.business_members for update
  using (public.can_manage_business_workspace(workspace_id))
  with check (public.can_manage_business_workspace(workspace_id));

drop policy if exists "Business owners can remove members" on public.business_members;
drop policy if exists "Workspace managers can remove members" on public.business_members;
create policy "Workspace managers can remove members"
  on public.business_members for delete
  using (public.can_manage_business_workspace(workspace_id));

alter table public.prospects
  add column if not exists assigned_user_id uuid references auth.users (id) on delete set null,
  add column if not exists assigned_email text;

create index if not exists prospects_assigned_user_idx
  on public.prospects (workspace_id, assigned_user_id, updated_at desc);

alter table public.prospect_tasks
  add column if not exists assigned_user_id uuid references auth.users (id) on delete set null;

create index if not exists prospect_tasks_assigned_user_idx
  on public.prospect_tasks (assigned_user_id, completed_at, due_date);

alter table public.prospect_activities
  add column if not exists actor_email text;

alter table public.prospect_activities
  drop constraint if exists prospect_activities_activity_type_check;

alter table public.prospect_activities
  add constraint prospect_activities_activity_type_check
  check (activity_type in ('note', 'email', 'call', 'meeting', 'status', 'update'));

create or replace function public.set_prospect_activity_actor()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.actor_email is null then
    select email into new.actor_email from auth.users where id = new.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists prospect_activity_actor_trigger on public.prospect_activities;
create trigger prospect_activity_actor_trigger
before insert on public.prospect_activities
for each row execute function public.set_prospect_activity_actor();

create or replace function public.log_prospect_operational_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if old.last_contacted_at is distinct from new.last_contacted_at then
    insert into public.prospect_activities (prospect_id, created_by, activity_type, summary)
    values (new.id, auth.uid(), 'update', 'Contact logged');
  elsif old.assigned_user_id is distinct from new.assigned_user_id
     or old.assigned_email is distinct from new.assigned_email then
    insert into public.prospect_activities (prospect_id, created_by, activity_type, summary)
    values (
      new.id,
      auth.uid(),
      'update',
      case
        when new.assigned_email is null then 'Prospect became unassigned'
        else 'Prospect assigned to ' || new.assigned_email
      end
    );
  elsif old.full_name is distinct from new.full_name
     or old.company is distinct from new.company
     or old.email is distinct from new.email
     or old.role is distinct from new.role
     or old.estimated_value_gbp is distinct from new.estimated_value_gbp
     or old.notes is distinct from new.notes
     or old.next_follow_up is distinct from new.next_follow_up then
    insert into public.prospect_activities (prospect_id, created_by, activity_type, summary)
    values (new.id, auth.uid(), 'update', 'Prospect details updated');
  end if;

  return new;
end;
$$;

drop trigger if exists prospect_operational_activity_trigger on public.prospects;
create trigger prospect_operational_activity_trigger
after update on public.prospects
for each row execute function public.log_prospect_operational_change();

create or replace function public.log_prospect_task_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    insert into public.prospect_activities (prospect_id, created_by, activity_type, summary)
    values (new.prospect_id, auth.uid(), 'update', 'Task added: ' || new.title);
  elsif tg_op = 'UPDATE' and old.completed_at is distinct from new.completed_at then
    insert into public.prospect_activities (prospect_id, created_by, activity_type, summary)
    values (
      new.prospect_id,
      auth.uid(),
      'update',
      case when new.completed_at is null then 'Task reopened: ' else 'Task completed: ' end || new.title
    );
  end if;
  return new;
end;
$$;

drop trigger if exists prospect_task_activity_trigger on public.prospect_tasks;
create trigger prospect_task_activity_trigger
after insert or update on public.prospect_tasks
for each row execute function public.log_prospect_task_change();
