-- Run after team-workspace-operations.sql.

create table if not exists public.workspace_roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces (id) on delete cascade,
  name text not null,
  can_manage_members boolean not null default false,
  can_manage_pipeline boolean not null default true,
  can_export_data boolean not null default false,
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

alter table public.workspace_roles enable row level security;
drop policy if exists "Workspace members can read custom roles" on public.workspace_roles;
create policy "Workspace members can read custom roles" on public.workspace_roles for select
  using (public.can_access_business_workspace(workspace_id));
drop policy if exists "Workspace managers can create custom roles" on public.workspace_roles;
create policy "Workspace managers can create custom roles" on public.workspace_roles for insert
  with check (public.can_manage_business_workspace(workspace_id));
drop policy if exists "Workspace managers can update custom roles" on public.workspace_roles;
create policy "Workspace managers can update custom roles" on public.workspace_roles for update
  using (public.can_manage_business_workspace(workspace_id))
  with check (public.can_manage_business_workspace(workspace_id));
drop policy if exists "Workspace managers can delete custom roles" on public.workspace_roles;
create policy "Workspace managers can delete custom roles" on public.workspace_roles for delete
  using (public.can_manage_business_workspace(workspace_id));

alter table public.business_members
  add column if not exists custom_role_id uuid references public.workspace_roles (id) on delete set null;

create or replace function public.can_manage_business_workspace(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.business_workspaces workspace
    where workspace.id = target_workspace_id and workspace.status = 'active'
      and (
        workspace.owner_id = auth.uid()
        or exists (
          select 1 from public.business_members member
          left join public.workspace_roles custom_role on custom_role.id = member.custom_role_id
          where member.workspace_id = workspace.id
            and member.user_id = auth.uid()
            and member.status = 'active'
            and member.access_active = true
            and (member.role = 'admin' or custom_role.can_manage_members = true)
        )
      )
  );
$$;

create table if not exists public.prospect_comments (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_email text,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists prospect_comments_prospect_idx
  on public.prospect_comments (prospect_id, created_at desc);
alter table public.prospect_comments enable row level security;
drop policy if exists "Users can read accessible prospect comments" on public.prospect_comments;
create policy "Users can read accessible prospect comments" on public.prospect_comments for select
  using (public.can_access_prospect(prospect_id));
drop policy if exists "Users can create accessible prospect comments" on public.prospect_comments;
create policy "Users can create accessible prospect comments" on public.prospect_comments for insert
  with check (author_id = auth.uid() and public.can_access_prospect(prospect_id));
drop policy if exists "Users can delete their prospect comments" on public.prospect_comments;
create policy "Users can delete their prospect comments" on public.prospect_comments for delete
  using (author_id = auth.uid() and public.can_access_prospect(prospect_id));

create table if not exists public.workspace_notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces (id) on delete cascade,
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('mention', 'assignment', 'task', 'overdue')),
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists workspace_notifications_recipient_idx
  on public.workspace_notifications (recipient_user_id, read_at, created_at desc);
alter table public.workspace_notifications enable row level security;
drop policy if exists "Users can read their notifications" on public.workspace_notifications;
create policy "Users can read their notifications" on public.workspace_notifications for select
  using (recipient_user_id = auth.uid());
drop policy if exists "Workspace users can create notifications" on public.workspace_notifications;
create policy "Workspace users can create notifications" on public.workspace_notifications for insert
  with check (actor_id = auth.uid() and public.can_access_business_workspace(workspace_id));
drop policy if exists "Users can update their notifications" on public.workspace_notifications;
create policy "Users can update their notifications" on public.workspace_notifications for update
  using (recipient_user_id = auth.uid()) with check (recipient_user_id = auth.uid());
drop policy if exists "Users can delete their notifications" on public.workspace_notifications;
create policy "Users can delete their notifications" on public.workspace_notifications for delete
  using (recipient_user_id = auth.uid());

create or replace function public.transfer_business_workspace(target_workspace_id uuid, new_owner_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare old_owner uuid;
begin
  select owner_id into old_owner from public.business_workspaces where id = target_workspace_id for update;
  if old_owner is null or old_owner <> auth.uid() then raise exception 'Only the workspace owner can transfer ownership.'; end if;
  if not exists (select 1 from public.business_members where workspace_id = target_workspace_id and user_id = new_owner_id and status = 'active' and access_active = true) then
    raise exception 'The new owner must be an active workspace member.';
  end if;
  update public.business_workspaces set owner_id = new_owner_id, updated_at = now() where id = target_workspace_id;
  delete from public.business_members where workspace_id = target_workspace_id and user_id = new_owner_id;
  insert into public.business_members (workspace_id, email, user_id, role, status, access_active)
  select target_workspace_id, email, old_owner, 'admin', 'active', true from auth.users where id = old_owner
  on conflict (workspace_id, (lower(email))) do update set user_id = excluded.user_id, role = 'admin', status = 'active', access_active = true;
end; $$;

revoke all on function public.transfer_business_workspace(uuid, uuid) from public;
grant execute on function public.transfer_business_workspace(uuid, uuid) to authenticated;

create or replace function public.delete_business_workspace(target_workspace_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.business_workspaces where id = target_workspace_id and owner_id = auth.uid()) then
    raise exception 'Only the workspace owner can delete this workspace.';
  end if;
  delete from public.business_workspaces where id = target_workspace_id;
end; $$;

revoke all on function public.delete_business_workspace(uuid) from public;
grant execute on function public.delete_business_workspace(uuid) to authenticated;
