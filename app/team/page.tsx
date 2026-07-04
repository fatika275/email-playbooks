"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/account-provider";
import {
  assignWorkspaceCustomRole,
  createWorkspaceRole,
  deleteBusinessWorkspace,
  inviteBusinessMember,
  listAccessibleBusinessWorkspaces,
  listBusinessMembers,
  listWorkspaceNotifications,
  listWorkspaceRoles,
  markWorkspaceNotificationRead,
  listTeamShares,
  removeBusinessMember,
  removeTeamShare,
  saveCustomTemplateRecord,
  saveEmailRecord,
  updateBusinessMember,
  transferBusinessWorkspace,
  type BusinessMember,
  type BusinessWorkspace,
  type BusinessWorkspaceAccess,
  type WorkspaceNotification,
  type WorkspaceRole,
  type TeamShare,
} from "@/lib/cloud";
import {
  listProspectComments,
  listMyOverdueWorkspaceTasks,
  listProspectTasks,
  listProspects,
  listWorkspaceProspectActivities,
  type WorkspaceProspectActivity,
  type OverdueWorkspaceTask,
} from "@/lib/prospects";

function makeSharedId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function TeamLibraryPage() {
  const { user, hasProAccess, isLoading, businessMembership } = useAccount();
  const [shares, setShares] = useState<TeamShare[]>([]);
  const [workspace, setWorkspace] = useState<BusinessWorkspace | null>(null);
  const [workspaces, setWorkspaces] = useState<BusinessWorkspaceAccess[]>([]);
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [activity, setActivity] = useState<WorkspaceProspectActivity[]>([]);
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<OverdueWorkspaceTask[]>([]);
  const [roles, setRoles] = useState<WorkspaceRole[]>([]);
  const [roleName, setRoleName] = useState("");
  const [roleMembers, setRoleMembers] = useState(false);
  const [roleExport, setRoleExport] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [notice, setNotice] = useState("");

  async function refreshShares() {
    setIsLoadingShares(true);
    try {
      setShares(await listTeamShares());
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Team Library could not load."
      );
    } finally {
      setIsLoadingShares(false);
    }
  }

  const refreshBusinessTeam = useCallback(async () => {
    const accessible = await listAccessibleBusinessWorkspaces();
    setWorkspaces(accessible);
    const storedId = window.localStorage.getItem("thalovo_active_workspace_id");
    const selected = accessible.find((item) => item.id === storedId) ?? accessible[0] ?? null;
    setWorkspace(selected);
    if (!selected) {
      setMembers([]);
      setActivity([]);
      return;
    }
    window.localStorage.setItem("thalovo_active_workspace_id", selected.id);
    const [nextMembers, nextActivity, nextRoles, nextNotifications, nextOverdueTasks] = await Promise.all([
      listBusinessMembers(selected.id),
      listWorkspaceProspectActivities(selected.id),
      listWorkspaceRoles(selected.id),
      listWorkspaceNotifications(),
      user ? listMyOverdueWorkspaceTasks(selected.id, user.id) : Promise.resolve([]),
    ]);
    setMembers(nextMembers);
    setActivity(nextActivity);
    setRoles(nextRoles);
    setNotifications(nextNotifications);
    setOverdueTasks(nextOverdueTasks);
  }, [user]);

  useEffect(() => {
    if (!user || !hasProAccess) return;
    void refreshShares();
    void refreshBusinessTeam().catch((error) => {
      setNotice(
        error instanceof Error ? error.message : "Business team could not load."
      );
    });
  }, [hasProAccess, refreshBusinessTeam, user]);

  const incoming = useMemo(
    () => shares.filter((share) => share.owner_id !== user?.id),
    [shares, user?.id]
  );
  const outgoing = useMemo(
    () => shares.filter((share) => share.owner_id === user?.id),
    [shares, user?.id]
  );
  const activeWorkspaceAccess = workspaces.find((item) => item.id === workspace?.id);
  const currentMembership = members.find((member) => member.user_id === user?.id);
  const currentCustomRole = roles.find((role) => role.id === currentMembership?.custom_role_id);
  const canExportWorkspace =
    activeWorkspaceAccess?.access_role === "owner" ||
    activeWorkspaceAccess?.access_role === "admin" ||
    currentCustomRole?.can_export_data;

  async function handleSaveToWorkspace(share: TeamShare) {
    try {
      if (share.asset_type === "email") {
        await saveEmailRecord({
          id: makeSharedId("shared-email"),
          playbookId: "team-library",
          templateId: "shared-email",
          templateLabel: share.title,
          subject: share.subject,
          body: share.body,
          tags: ["team-shared"],
          folder: "Shared with me",
          isFavorite: false,
          createdAt: new Date().toISOString(),
        });
      } else {
        await saveCustomTemplateRecord({
          id: makeSharedId("shared-sequence"),
          title: share.title,
          subject: share.subject,
          body: share.body,
          sourcePlaybookId: "team-library",
          sourceTemplateId: share.source_id,
          tags: ["team-shared"],
          folder: "Shared with me",
          isFavorite: false,
          createdAt: new Date().toISOString(),
        });
      }

      setNotice(`Saved “${share.title}” to your workspace.`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not save this shared item."
      );
    }
  }

  async function handleRemoveShare(id: string) {
    try {
      await removeTeamShare(id);
      await refreshShares();
      setNotice("Share removed.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not remove this share."
      );
    }
  }

  async function handleInviteMember() {
    if (!workspace) {
      setNotice("Your Business Pro workspace is not ready yet. Refresh after payment.");
      return;
    }

    try {
      await inviteBusinessMember(workspace.id, inviteEmail);
      const refreshed = await listBusinessMembers(workspace.id);
      const invited = refreshed.find(
        (member) => member.email === inviteEmail.trim().toLowerCase()
      );
      if (invited && inviteRole !== "member") {
        await updateBusinessMember(invited.id, { role: inviteRole });
      }
      await refreshBusinessTeam();
      setNotice(
        `Invitation created for ${inviteEmail.trim().toLowerCase()}. Send them the sign-in instructions.`
      );
      setInviteEmail("");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not invite this teammate."
      );
    }
  }

  async function handleMemberUpdate(
    member: BusinessMember,
    updates: Partial<Pick<BusinessMember, "role" | "access_active">>
  ) {
    try {
      await updateBusinessMember(member.id, updates);
      await refreshBusinessTeam();
      setNotice("Teammate access updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update this teammate.");
    }
  }

  function handleResendInvite(member: BusinessMember) {
    const subject = encodeURIComponent(`You have been invited to ${workspace?.name ?? "Thalovo"}`);
    const body = encodeURIComponent(
      `You have been invited to our Thalovo workspace. Sign up or sign in using ${member.email}, then open the Team page to access the workspace.\n\nhttps://thalovo.com/account`
    );
    window.location.href = `mailto:${encodeURIComponent(member.email)}?subject=${subject}&body=${body}`;
  }

  async function handleWorkspaceChange(workspaceId: string) {
    window.localStorage.setItem("thalovo_active_workspace_id", workspaceId);
    const selected = workspaces.find((item) => item.id === workspaceId) ?? null;
    setWorkspace(selected);
    if (!selected) return;
    const [nextMembers, nextActivity, nextRoles] = await Promise.all([
      listBusinessMembers(selected.id),
      listWorkspaceProspectActivities(selected.id),
      listWorkspaceRoles(selected.id),
    ]);
    setMembers(nextMembers);
    setActivity(nextActivity);
    setRoles(nextRoles);
  }

  async function handleCreateRole() {
    if (!workspace || !roleName.trim()) return;
    try {
      await createWorkspaceRole({ workspace_id: workspace.id, name: roleName.trim(), can_manage_members: roleMembers, can_manage_pipeline: true, can_export_data: roleExport });
      setRoleName(""); setRoleMembers(false); setRoleExport(false);
      await refreshBusinessTeam();
      setNotice("Custom role created.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Role could not be created."); }
  }

  async function handleExportWorkspace() {
    if (!workspace || !user) return;
    try {
      const prospects = await listProspects({ userId: user.id, workspaceId: workspace.id });
      const [tasks, comments] = await Promise.all([
        listProspectTasks(prospects.map((item) => item.id)),
        Promise.all(prospects.map((item) => listProspectComments(item.id))).then((rows) => rows.flat()),
      ]);
      const payload = { exported_at: new Date().toISOString(), workspace, members, prospects, tasks, activities: activity, comments };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-export.json`; anchor.click(); URL.revokeObjectURL(url);
      setNotice("Workspace export downloaded.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Workspace export failed."); }
  }

  async function handleTransferOwnership(userId: string) {
    if (!workspace || !userId || !window.confirm("Transfer ownership permanently to this teammate?")) return;
    try { await transferBusinessWorkspace(workspace.id, userId); await refreshBusinessTeam(); setNotice("Workspace ownership transferred."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Ownership could not be transferred."); }
  }

  async function handleDeleteWorkspace() {
    if (!workspace || !window.confirm(`Permanently delete ${workspace.name} and all shared CRM data?`)) return;
    try { await deleteBusinessWorkspace(workspace.id); window.localStorage.removeItem("thalovo_active_workspace_id"); await refreshBusinessTeam(); setNotice("Workspace deleted."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Workspace could not be deleted."); }
  }

  async function handleRemoveMember(id: string) {
    try {
      await removeBusinessMember(id);
      await refreshBusinessTeam();
      setNotice("Teammate access removed.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not remove this teammate."
      );
    }
  }

  if (isLoading) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">Loading Team Library...</div>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <h1 className="pageTitle">Sign in to use Team Library</h1>
            <p className="muted">Shared items are matched to your account email.</p>
            <Link href="/account" className="button buttonPrimary">
              Sign in
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!hasProAccess) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <h1 className="pageTitle">Team sharing is a Pro feature</h1>
            <p className="muted">
              Upgrade to share saved templates and reusable sequences securely.
            </p>
            <Link href="/pricing" className="button buttonPrimary">
              View Pro
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Team workspace</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Your team, shared work, and access
          </h1>
          <p className="muted" style={{ maxWidth: 760, lineHeight: 1.75 }}>
            Invite teammates and manage everyday access here. Advanced controls
            stay out of the way until you need them.
          </p>
        </div>

        {notice ? <p className="notice">{notice}</p> : null}

        {notifications.length || overdueTasks.length ? <section className="glassCard teamNotificationPanel">
          <div className="cardTop"><h2 className="cardTitle">Notifications</h2><span className="statusPill">{notifications.filter((item) => !item.read_at).length + overdueTasks.length} needs attention</span></div>
          <div className="prospectTimeline">{overdueTasks.map((task) => <div key={`overdue-${task.id}`} className="prospectTimelineItem"><span className="miniBadge">Overdue</span><div><Link href={`/prospects/${task.prospects.id}`}><strong>{task.title}</strong></Link><p className="small">{task.prospects.full_name} · Due {task.due_date}</p></div></div>)}{notifications.slice(0, 8).map((item) => <div key={item.id} className="prospectTimelineItem"><span className="miniBadge">{item.kind}</span><div><Link href={item.href || "/team"} onClick={() => void markWorkspaceNotificationRead(item.id)}><strong>{item.title}</strong></Link><p className="small">{item.body || "Workspace update"} · {new Date(item.created_at).toLocaleString()}</p></div></div>)}</div>
        </section> : null}

        {workspace ? (
          <section className="glassCard" style={{ padding: 24, marginBottom: 22 }}>
            <div className="cardTop">
              <div>
                <h2 className="cardTitle">{workspace.name}</h2>
                <p className="muted" style={{ margin: "8px 0 0" }}>
                  One subscription covers the owner and invited teammates. Manage
                  roles, access, assignments, and shared pipeline work here.
                </p>
              </div>
              <span className="statusPill statusPillSuccess">
                {members.length}/{workspace.seat_limit} teammate seats
              </span>
            </div>

            {workspaces.length > 1 ? (
              <div className="formGroup" style={{ marginTop: 18, maxWidth: 420 }}>
                <label className="label" htmlFor="active-team-workspace">Active workspace</label>
                <select id="active-team-workspace" className="input" value={workspace.id} onChange={(event) => void handleWorkspaceChange(event.target.value)}>
                  {workspaces.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.access_role}</option>)}
                </select>
              </div>
            ) : null}

            {workspaces.find((item) => item.id === workspace.id)?.access_role !== "member" ? <><div
              className="businessInviteGrid"
              style={{ alignItems: "end", marginTop: 18 }}
            >
              <div className="formGroup" style={{ marginBottom: 0 }}>
                <label className="label" htmlFor="business-invite-email">
                  Teammate email
                </label>
                <input
                  id="business-invite-email"
                  className="input"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="teammate@company.com"
                />
              </div>
              <div className="formGroup" style={{ marginBottom: 0 }}>
                <label className="label" htmlFor="business-invite-role">Access level</label>
                <select id="business-invite-role" className="input" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "admin" | "member")}>
                  <option value="member">Member - works in the workspace</option>
                  <option value="admin">Admin - also manages teammates</option>
                </select>
                <p className="small" style={{ margin: "6px 0 0" }}>Choose Member for most people. Admins can invite, pause, and remove teammates.</p>
              </div>
              <button
                className="button buttonPrimary"
                disabled={!inviteEmail.trim() || members.length >= workspace.seat_limit}
                onClick={() => void handleInviteMember()}
              >
                Invite teammate
              </button>
            </div></> : null}

            <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
              {members.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: 14,
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <strong>{member.email}</strong>
                    <p className="small" style={{ margin: "4px 0 0" }}>
                      {member.access_active ? (member.status === "active" ? "Active" : "Pending invitation") : "Access paused"} · {member.role}
                    </p>
                  </div>
                  {workspaces.find((item) => item.id === workspace.id)?.access_role !== "member" ? <div className="toolbar">
                    <select className="input teamRoleSelect" value={member.role} aria-label={`Role for ${member.email}`} onChange={(event) => void handleMemberUpdate(member, { role: event.target.value as "admin" | "member" })}>
                      <option value="member">Member</option><option value="admin">Admin</option>
                    </select>
                    {member.status === "invited" ? <button className="button buttonSecondary" onClick={() => handleResendInvite(member)}>Resend invite</button> : null}
                    <button className="button buttonSecondary" onClick={() => void handleMemberUpdate(member, { access_active: !member.access_active })}>{member.access_active ? "Pause" : "Restore"}</button>
                    <button className="button buttonUtility" onClick={() => void handleRemoveMember(member.id)}>Remove</button>
                  </div> : null}
                </div>
              ))}
            </div>

            <div className="teamActivitySection">
              <div className="cardTop"><h3 className="cardTitle">Workspace activity</h3><span className="miniBadge">Latest {activity.length}</span></div>
              <div className="prospectTimeline">
                {activity.map((item) => (
                  <div key={item.id} className="prospectTimelineItem">
                    <span className="miniBadge">{item.activity_type}</span>
                    <div><Link href={`/prospects/${item.prospects.id}`}><strong>{item.prospects.full_name} · {item.prospects.company}</strong></Link><p className="small">{item.summary} · {item.actor_email || "Teammate"} · {new Date(item.created_at).toLocaleString()}</p></div>
                  </div>
                ))}
                {activity.length === 0 ? <p className="muted">No shared pipeline activity yet.</p> : null}
              </div>
            </div>

            <div className="teamActivitySection">
              <div className="cardTop"><h3 className="cardTitle">Team performance</h3><span className="miniBadge">Last {activity.length} actions</span></div>
              <div className="prospectReportSummary">{Array.from(new Set(activity.map((item) => item.actor_email || "Teammate"))).map((email) => <div key={email}><span>{email}</span><strong>{activity.filter((item) => (item.actor_email || "Teammate") === email).length} actions</strong></div>)}</div>
            </div>

            {workspaces.find((item) => item.id === workspace.id)?.access_role !== "member" ? <details className="teamAdvancedPanel">
              <summary><strong>Optional: custom permissions</strong><span>Only open this when Admin and Member are not specific enough.</span></summary>
              <div className="teamAdvancedContent">
              <p className="muted teamSectionDescription">Most teams only need Admin and Member. A custom role gives someone selected extra permissions without making them a full Admin.</p>
              <div className="teamRoleBuilder">
                <div className="formGroup"><label className="label">Custom role name</label><input className="input" value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="For example, Sales lead" /></div>
                <label className="teamPermissionOption"><input type="checkbox" checked={roleMembers} onChange={(event) => setRoleMembers(event.target.checked)} /><span><strong>Can manage teammates</strong><small>Can invite people, pause access, change roles, and remove teammates.</small></span></label>
                <label className="teamPermissionOption"><input type="checkbox" checked={roleExport} onChange={(event) => setRoleExport(event.target.checked)} /><span><strong>Can download workspace data</strong><small>Can export prospects, tasks, comments, and activity as a backup file.</small></span></label>
                <p className="small">Leave a box unticked when that permission should not be included. Shared pipeline access is included automatically.</p>
                <button className="button buttonPrimary" disabled={!roleName.trim()} onClick={() => void handleCreateRole()}>Create custom role</button>
              </div>
              {roles.length ? <div className="prospectTaskList">{roles.map((role) => <div className="prospectTask" key={role.id}><span className="miniBadge">Role</span><div><strong>{role.name}</strong><span>{role.can_manage_members ? "Manages members" : "Pipeline access"}{role.can_export_data ? " · Can export" : ""}</span></div></div>)}</div> : null}
              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>{members.map((member) => <div key={member.id} className="teamRoleAssignment"><span>{member.email}</span><select className="input" value={member.custom_role_id || ""} onChange={(event) => void assignWorkspaceCustomRole(member.id, event.target.value || null).then(refreshBusinessTeam)}><option value="">Standard {member.role}</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div>)}</div>
              </div>
            </details> : null}

            <div className="teamActivitySection">
              <div className="cardTop"><div><h3 className="cardTitle">Workspace data</h3><p className="small">Export a complete JSON backup of members, prospects, tasks, comments, and activity.</p></div>{canExportWorkspace ? <button className="button buttonSecondary" onClick={() => void handleExportWorkspace()}>Export workspace</button> : <span className="miniBadge">Export permission required</span>}</div>
              {workspaces.find((item) => item.id === workspace.id)?.access_role === "owner" ? <details className="teamOwnerControls"><summary>Ownership and deletion</summary><p className="small">These controls are rarely needed. Transfer ownership changes who controls the workspace. Deleting removes all shared workspace data permanently.</p><div className="teamDangerZone"><select className="input" defaultValue="" onChange={(event) => void handleTransferOwnership(event.target.value)}><option value="" disabled>Transfer ownership to...</option>{members.filter((member) => member.user_id && member.status === "active").map((member) => <option key={member.id} value={member.user_id!}>{member.email}</option>)}</select><button className="button buttonUtility" onClick={() => void handleDeleteWorkspace()}>Delete workspace</button></div></details> : null}
            </div>
          </section>
        ) : businessMembership?.access_active ? (
          <section className="glassCard" style={{ padding: 22, marginBottom: 22 }}>
            <span className="statusPill statusPillSuccess">Business Pro active</span>
            <h2 className="cardTitle" style={{ marginTop: 14 }}>
              Your access is covered by your business
            </h2>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              You receive full Pro access through this team membership. You do
              not need a separate paid subscription.
            </p>
          </section>
        ) : (
          <section className="glassCard" style={{ padding: 22, marginBottom: 22 }}>
            <h2 className="cardTitle">Need access for a whole business?</h2>
            <p className="muted" style={{ margin: "8px 0 14px" }}>
              Business Pro gives one payer and up to 10 teammates full Pro access.
            </p>
            <Link href="/business" className="button buttonPrimary">
              View Business Pro
            </Link>
          </section>
        )}

        <div className="toolbar" style={{ marginBottom: 22 }}>
          <button
            className="button buttonSecondary"
            disabled={isLoadingShares}
            onClick={() => void refreshShares()}
          >
            {isLoadingShares ? "Refreshing..." : "Refresh shares"}
          </button>
          <Link href="/history" className="button buttonSecondary">
            Choose a saved email
          </Link>
          <Link href="/custom-templates" className="button buttonSecondary">
            Choose a sequence
          </Link>
        </div>

        <section className="section">
          <h2 className="sectionTitle">Shared with me</h2>
          <div className="workspaceGrid" style={{ marginTop: 16 }}>
            {incoming.map((share) => (
              <article key={share.id} className="glassCard workspaceCard">
                <div className="cardTop">
                  <h3 className="cardTitle">{share.title}</h3>
                  <span className="miniBadge">
                    {share.asset_type === "email" ? "Template" : "Sequence"}
                  </span>
                </div>
                <p className="small">From {share.owner_email}</p>
                <p className="templateMeta">Subject: {share.subject}</p>
                <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
                  {share.body.length > 220
                    ? `${share.body.slice(0, 220).trim()}...`
                    : share.body}
                </p>
                <button
                  className="button buttonPrimary"
                  onClick={() => void handleSaveToWorkspace(share)}
                >
                  Save to my workspace
                </button>
              </article>
            ))}
          </div>
          {!isLoadingShares && incoming.length === 0 ? (
            <p className="muted">Nothing has been shared with this email yet.</p>
          ) : null}
        </section>

        <section className="section">
          <h2 className="sectionTitle">Shared by me</h2>
          <div className="workspaceGrid" style={{ marginTop: 16 }}>
            {outgoing.map((share) => (
              <article key={share.id} className="glassCard workspaceCard">
                <div className="cardTop">
                  <h3 className="cardTitle">{share.title}</h3>
                  <span className="miniBadge">{share.asset_type}</span>
                </div>
                <p className="small">Sent to {share.recipient_email}</p>
                <p className="templateMeta">Subject: {share.subject}</p>
                <button
                  className="button buttonUtility"
                  onClick={() => void handleRemoveShare(share.id)}
                >
                  Remove access
                </button>
              </article>
            ))}
          </div>
          {!isLoadingShares && outgoing.length === 0 ? (
            <p className="muted">You have not shared anything yet.</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
