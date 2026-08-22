-- Run this in Supabase SQL Editor after deploying explicit Business Pro invite acceptance.
-- Pending invites stay visible to the invited email, but workspace access only starts
-- after the invite link is accepted and the member row becomes active for that user.

create or replace function public.claim_business_membership()
returns setof public.business_members
language sql
security definer
set search_path = public
as $$
  select member.*
  from public.business_members as member
  join public.business_workspaces as workspace
    on workspace.id = member.workspace_id
  where workspace.status = 'active'
    and member.access_active = true
    and member.status = 'active'
    and member.user_id = auth.uid();
$$;

revoke all on function public.claim_business_membership() from public;
grant execute on function public.claim_business_membership() to authenticated;

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
            and member.status = 'active'
            and member.user_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.can_access_business_workspace(uuid) from public;
grant execute on function public.can_access_business_workspace(uuid) to authenticated;
