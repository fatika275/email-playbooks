"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/account-provider";
import PageLoadingState from "@/components/page-loading-state";
import {
  deleteBusinessWorkspace,
  inviteBusinessMember,
  listAccessibleBusinessWorkspaces,
  listBusinessMembers,
  listWorkspaceNotifications,
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
  type TeamShare,
} from "@/lib/cloud";
import {
  listProspectComments,
  listMyOverdueWorkspaceTasks,
  listProspectTasks,
  getProspectTaskDisplayTitle,
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

function getActivitySeenKey(workspaceId: string) {
  return `thalovo_team_activity_seen_${workspaceId}`;
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [showInvite, setShowInvite] = useState(false);
  const [activityFilter, setActivityFilter] = useState<"key" | "outreach" | "tasks" | "all">("key");
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [activitySeenAt, setActivitySeenAt] = useState("");
  const [teamView, setTeamView] = useState<"workspace" | "library">("workspace");
  const [libraryView, setLibraryView] = useState<"incoming" | "outgoing">("incoming");
  const [shareSearch, setShareSearch] = useState("");
  const [shareType, setShareType] = useState<"all" | "email" | "sequence">("all");
  const [sharePage, setSharePage] = useState(1);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [notice, setNotice] = useState("");

  async function refreshShares() {
    setIsLoadingShares(true);
    try {
      setShares(await listTeamShares());
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Shared templates could not load."
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
    setActivitySeenAt(window.localStorage.getItem(getActivitySeenKey(selected.id)) ?? "");
    const [nextMembers, nextActivity, nextNotifications, nextOverdueTasks] = await Promise.all([
      listBusinessMembers(selected.id),
      listWorkspaceProspectActivities(selected.id),
      listWorkspaceNotifications(),
      user ? listMyOverdueWorkspaceTasks(selected.id, user.id) : Promise.resolve([]),
    ]);
    setMembers(nextMembers);
    setActivity(nextActivity);
    setNotifications(nextNotifications.filter((item) => !item.read_at));
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
  const filteredShares = useMemo(() => {
    const source = libraryView === "incoming" ? incoming : outgoing;
    const query = shareSearch.trim().toLowerCase();
    return source.filter((share) => {
      const matchesType = shareType === "all" || share.asset_type === shareType;
      const searchable = `${share.title} ${share.subject} ${share.owner_email} ${share.recipient_email}`.toLowerCase();
      return matchesType && (!query || searchable.includes(query));
    });
  }, [incoming, libraryView, outgoing, shareSearch, shareType]);
  const sharePageSize = 12;
  const sharePageCount = Math.max(1, Math.ceil(filteredShares.length / sharePageSize));
  const visibleShares = filteredShares.slice((sharePage - 1) * sharePageSize, sharePage * sharePageSize);
  const filteredActivity = useMemo(() => activity.filter((item) => {
    const summary = item.summary.toLowerCase();
    if (activityFilter === "all") return true;
    if (activityFilter === "outreach") {
      return ["email", "call", "meeting"].includes(item.activity_type) || summary.includes("contact logged");
    }
    if (activityFilter === "tasks") {
      return summary.includes("task") || summary.includes("follow-up");
    }
    return (
      ["email", "call", "meeting", "status"].includes(item.activity_type) ||
      summary.includes("contact logged") ||
      summary.includes("assigned") ||
      summary.includes("task completed")
    );
  }), [activity, activityFilter]);
  const visibleActivity = showAllActivity ? filteredActivity : filteredActivity.slice(0, 8);
  const newActivityCount = activitySeenAt
    ? filteredActivity.filter((item) => new Date(item.created_at).getTime() > new Date(activitySeenAt).getTime()).length
    : filteredActivity.length;
  const unreadNotifications = notifications.filter((item) => !item.read_at);
  const attentionCount = unreadNotifications.length + overdueTasks.length;
  const activeWorkspaceAccess = workspaces.find((item) => item.id === workspace?.id);
  const canExportWorkspace =
    activeWorkspaceAccess?.access_role === "owner" ||
    activeWorkspaceAccess?.access_role === "admin";

  async function handleNotificationSeen(id: string) {
    setNotifications((current) => current.filter((item) => item.id !== id));
    try {
      await markWorkspaceNotificationRead(id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Update could not be marked seen.");
      void refreshBusinessTeam().catch(() => undefined);
    }
  }

  async function handleAllNotificationsSeen() {
    const unreadIds = unreadNotifications.map((item) => item.id);
    if (!unreadIds.length) return;
    setNotifications((current) => current.filter((item) => !unreadIds.includes(item.id)));
    try {
      await Promise.all(unreadIds.map((id) => markWorkspaceNotificationRead(id)));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Updates could not be marked seen.");
      void refreshBusinessTeam().catch(() => undefined);
    }
  }

  function handleActivityDisclosureToggle(isOpen: boolean) {
    if (!isOpen || !workspace) return;
    const seenAt = new Date().toISOString();
    window.localStorage.setItem(getActivitySeenKey(workspace.id), seenAt);
    setActivitySeenAt(seenAt);
  }

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

      setNotice(`Saved "${share.title}" to your saved work.`);
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
      setNotice("Your Business Pro agency workspace is not ready yet. Refresh after payment.");
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
      setShowInvite(false);
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
      `You have been invited to our Thalovo team pipeline. Sign up or sign in using ${member.email}, then open the Team page to access the shared leads.\n\nhttps://thalovo.com/account`
    );
    window.location.href = `mailto:${encodeURIComponent(member.email)}?subject=${subject}&body=${body}`;
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
      setNotice("Agency data export downloaded.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Agency data export failed."); }
  }

  async function handleTransferOwnership(userId: string) {
    if (!workspace || !userId || !window.confirm("Transfer ownership permanently to this teammate?")) return;
    try { await transferBusinessWorkspace(workspace.id, userId); await refreshBusinessTeam(); setNotice("Team pipeline ownership transferred."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Ownership could not be transferred."); }
  }

  async function handleDeleteWorkspace() {
    if (!workspace || !window.confirm(`Permanently delete ${workspace.name} and all shared lead data?`)) return;
    try { await deleteBusinessWorkspace(workspace.id); window.localStorage.removeItem("thalovo_active_workspace_id"); await refreshBusinessTeam(); setNotice("Team pipeline deleted."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Team pipeline could not be deleted."); }
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
      <PageLoadingState
        eyebrow="Team"
        title="Loading team deal room"
        detail="Preparing shared leads, handoffs, and team activity."
      />
    );
  }

  if (!user) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <h1 className="pageTitle">Sign in to use the team deal room</h1>
            <p className="muted">Shared pipelines, notes, and templates are matched to your account email.</p>
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
              Upgrade when more than one person needs a shared pipeline, shared
              notes, and simple ownership for lead follow-up.
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
          <div className="badge">Team collaboration</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Shared notes and handoff visibility for agency teams.
          </h1>
          <p className="muted" style={{ maxWidth: 760, lineHeight: 1.75 }}>
            Give teammates one place to see who started the deal, who owns it
            now, and what context needs to travel with the lead so nobody
            duplicates chasing or lets a good opportunity slip.
          </p>
        </div>

        {notice ? <p className="notice">{notice}</p> : null}

        <div className="teamViewTabs" role="tablist" aria-label="Team page view">
          <button
            type="button"
            role="tab"
            aria-selected={teamView === "workspace"}
            className={teamView === "workspace" ? "teamViewTab active" : "teamViewTab"}
            onClick={() => setTeamView("workspace")}
          >
            Team pipeline
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={teamView === "library"}
            className={teamView === "library" ? "teamViewTab active" : "teamViewTab"}
            onClick={() => setTeamView("library")}
          >
            Shared templates{incoming.length ? ` (${incoming.length})` : ""}
          </button>
        </div>

        {teamView === "workspace" && attentionCount ? <section className="teamAttentionPanel">
          <div className="cardTop">
            <div>
              <h2 className="sectionTitle">Needs attention</h2>
              <p className="muted">Overdue follow-ups stay until done. Lead updates clear once seen.</p>
            </div>
            <div className="teamAttentionActions">
              <span className="statusPill">{attentionCount}</span>
              {unreadNotifications.length ? <button type="button" className="button buttonSecondary" onClick={() => void handleAllNotificationsSeen()}>Mark updates seen</button> : null}
            </div>
          </div>
          <div className="prospectTimeline">{overdueTasks.map((task) => <div key={`overdue-${task.id}`} className="prospectTimelineItem"><span className="miniBadge">Overdue</span><div><Link href={`/prospects/${task.prospects.id}`}><strong>{getProspectTaskDisplayTitle(task.title)}</strong></Link><p className="small">{task.prospects.full_name} · Due {task.due_date}</p></div></div>)}{unreadNotifications.slice(0, 8).map((item) => <div key={item.id} className="prospectTimelineItem"><span className="miniBadge">{item.kind}</span><div><Link href={item.href || "/team"} onClick={() => void handleNotificationSeen(item.id)}><strong>{item.title}</strong></Link><p className="small">{item.body || "Agency update"} · {new Date(item.created_at).toLocaleString()}</p></div></div>)}</div>
        </section> : null}

        {teamView === "workspace" ? (workspace ? (
          <section className="teamWorkspaceOverview">
            <div className="teamWorkspaceHero">
              <div>
                <span className="miniBadge">Active team pipeline</span>
                <h2 className="pageTitle">{workspace.name}</h2>
                <p className="muted" style={{ margin: "8px 0 0" }}>
                  One shared pipeline for lead ownership, shared notes, follow-ups, and handoff context.
                </p>
              </div>
              <Link href="/prospects" className="button buttonPrimary">Open shared pipeline</Link>
            </div>

            <div className="teamWorkspaceStats">
              <div><strong>{members.filter((member) => member.status === "active" && member.access_active).length}</strong><span>Active teammates</span></div>
              <div><strong>{members.filter((member) => member.status === "invited" && member.access_active).length}</strong><span>Pending invites</span></div>
              <div><strong>{workspace.seat_limit - members.length}</strong><span>Seats available</span></div>
              <div><strong>{incoming.length + outgoing.length}</strong><span>Shared templates</span></div>
            </div>

            <section className="teamPeopleSection">
              <div className="teamPeopleHeading"><div className="teamSectionHeading"><h3 className="sectionTitle">People and ownership</h3><p className="muted">Assign the lead owner, then keep scope, decision-maker, and next action visible when someone else continues the deal.</p></div>{workspaces.find((item) => item.id === workspace.id)?.access_role !== "member" ? <button className={`button ${showInvite ? "buttonSecondary" : "buttonPrimary"}`} onClick={() => setShowInvite((current) => !current)}>{showInvite ? "Close invite" : "Invite teammate"}</button> : null}</div>

            {showInvite && workspaces.find((item) => item.id === workspace.id)?.access_role !== "member" ? <><div
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
                <label className="label inviteRoleLabel" htmlFor="business-invite-role"><span>Teammate access</span><span>Most people only need lead access. Team leads can also invite teammates.</span></label>
                <select id="business-invite-role" className="input" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "admin" | "member")}>
                  <option value="member">Teammate - owns and works assigned leads</option>
                  <option value="admin">Team lead - can invite teammates too</option>
                </select>
              </div>
              <button
                className="button buttonPrimary"
                disabled={!inviteEmail.trim() || members.length >= workspace.seat_limit}
                onClick={() => void handleInviteMember()}
              >
                Send invite
              </button>
            </div></> : null}

            <div className="teamMemberList">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="teamMemberRow"
                >
                  <div>
                    <strong>{member.email}</strong>
                    <p className="small" style={{ margin: "4px 0 0" }}>
                      {member.access_active ? (member.status === "active" ? "Active" : "Pending invitation") : "Access paused"} - {member.role === "admin" ? "Team lead" : "Teammate"}
                    </p>
                  </div>
                  {workspaces.find((item) => item.id === workspace.id)?.access_role !== "member" ? <details className="teamMemberManage">
                    <summary>Edit</summary>
                    <div className="teamMemberMenu">
                      <label className="label">Access<select className="input" value={member.role} aria-label={`Access for ${member.email}`} onChange={(event) => void handleMemberUpdate(member, { role: event.target.value as "admin" | "member" })}><option value="member">Teammate</option><option value="admin">Team lead</option></select></label>
                      <div className="toolbar">{member.status === "invited" ? <button className="button buttonSecondary" onClick={() => handleResendInvite(member)}>Resend invite</button> : null}<button className="button buttonSecondary" onClick={() => void handleMemberUpdate(member, { access_active: !member.access_active })}>{member.access_active ? "Pause access" : "Restore access"}</button><button className="button buttonUtility" onClick={() => void handleRemoveMember(member.id)}>Remove</button></div>
                    </div>
                  </details> : null}
                </div>
              ))}
              {members.length === 0 ? <p className="muted">No teammates yet. Invite the first person when someone else starts handling leads with you.</p> : null}
            </div>
            </section>

            <details className="teamActivitySection teamActivityDisclosure" onToggle={(event) => handleActivityDisclosureToggle(event.currentTarget.open)}>
              <summary><strong>Agency activity</strong><span>{newActivityCount ? `${newActivityCount} new ${newActivityCount === 1 ? "update" : "updates"}` : "Seen"}</span></summary>
              <div className="teamActivityControls"><div><h3 className="cardTitle">Recent activity</h3><p className="small">See who started it, who owns it now, and the latest context before anyone continues the deal.</p></div><select className="input" value={activityFilter} onChange={(event) => { setActivityFilter(event.target.value as "key" | "outreach" | "tasks" | "all"); setShowAllActivity(false); }} aria-label="Filter agency activity"><option value="key">Key updates</option><option value="outreach">Outreach only</option><option value="tasks">Tasks only</option><option value="all">All changes</option></select></div>
              <div className="prospectTimeline">
                {visibleActivity.map((item) => (
                  <div key={item.id} className="prospectTimelineItem">
                    <span className="miniBadge">{item.activity_type}</span>
                    <div><Link href={`/prospects/${item.prospects.id}`}><strong>{item.prospects.full_name} · {item.prospects.company}</strong></Link><p className="small">{item.summary} · {item.actor_email || "Teammate"} · {new Date(item.created_at).toLocaleString()}</p></div>
                  </div>
                ))}
                {filteredActivity.length === 0 ? <p className="muted">No activity matches this filter yet.</p> : null}
              </div>
              {filteredActivity.length > 8 ? <button className="button buttonSecondary teamActivityMore" onClick={() => setShowAllActivity((current) => !current)}>{showAllActivity ? "Show less" : `Show ${filteredActivity.length - 8} more`}</button> : null}
            </details>

            <details className="teamWorkspaceSettings">
              <summary><strong>Download backup</strong><span>Optional</span></summary>
              <div className="teamWorkspaceSettingsContent">
              <div className="cardTop"><div><h3 className="cardTitle">Backup lead data</h3><p className="small">Download a copy of team leads, notes, tasks, and activity when you need one.</p></div>{canExportWorkspace ? <button className="button buttonSecondary" onClick={() => void handleExportWorkspace()}>Download backup</button> : <span className="miniBadge">Team lead only</span>}</div>
              {workspaces.find((item) => item.id === workspace.id)?.access_role === "owner" ? <details className="teamOwnerControls"><summary>Rare account changes</summary><p className="small">Most teams never need these. Transfer ownership only changes who controls billing and invites. Deleting removes shared lead data permanently.</p><div className="teamDangerZone"><select className="input" defaultValue="" onChange={(event) => void handleTransferOwnership(event.target.value)}><option value="" disabled>Transfer ownership to...</option>{members.filter((member) => member.user_id && member.status === "active").map((member) => <option key={member.id} value={member.user_id!}>{member.email}</option>)}</select><button className="button buttonUtility" onClick={() => void handleDeleteWorkspace()}>Delete team pipeline</button></div></details> : null}
              </div>
            </details>
          </section>
        ) : businessMembership?.access_active ? (
          <section className="glassCard" style={{ padding: 22, marginBottom: 22 }}>
            <span className="statusPill statusPillSuccess">Business Pro active</span>
            <h2 className="cardTitle" style={{ marginTop: 14 }}>
              Your access is covered by your business
            </h2>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              You can work from the shared pipeline, notes, outreach, and
              follow-ups without a separate paid subscription.
            </p>
          </section>
        ) : (
          <section className="glassCard" style={{ padding: 22, marginBottom: 22 }}>
            <h2 className="cardTitle">Need access for a whole business?</h2>
            <p className="muted" style={{ margin: "8px 0 14px" }}>
              Business Pro gives one payer, a shared pipeline, handoff notes,
              simple ownership rules, and up to 10 teammates full Pro access.
            </p>
            <Link href="/business" className="button buttonPrimary">
              View Business Pro
            </Link>
          </section>
        )) : null}

        {teamView === "library" ? <>
        <div className="teamLibraryActions">
          <div className="teamLibraryHeadingRow">
            <div>
              <h2 className="sectionTitle">Shared agency use-case templates</h2>
              <p className="muted">Keep proven messages and follow-up plans available to everyone handling leads.</p>
            </div>
            <button
              className="button buttonUtility"
              disabled={isLoadingShares}
              onClick={() => void refreshShares()}
            >
              {isLoadingShares ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className="teamLibraryShareActions" aria-label="Share saved work with the team">
            <Link href="/workspace" className="teamLibraryShareAction">
              <span>Share a saved message</span>
              <small>Outreach, proposal chase, win-back, or reply templates</small>
            </Link>
            <Link href="/workspace" className="teamLibraryShareAction">
              <span>Share a follow-up plan</span>
              <small>Give the team a reusable chase sequence for live leads</small>
            </Link>
          </div>
        </div>

        <div className="sharedLibraryControls">
          <div className="sharedLibraryTabs" role="tablist" aria-label="Shared template direction">
            <button type="button" role="tab" aria-selected={libraryView === "incoming"} className={libraryView === "incoming" ? "sharedLibraryTab active" : "sharedLibraryTab"} onClick={() => { setLibraryView("incoming"); setSharePage(1); }}>Shared with me <span>{incoming.length}</span></button>
            <button type="button" role="tab" aria-selected={libraryView === "outgoing"} className={libraryView === "outgoing" ? "sharedLibraryTab active" : "sharedLibraryTab"} onClick={() => { setLibraryView("outgoing"); setSharePage(1); }}>Shared by me <span>{outgoing.length}</span></button>
          </div>
          <div className="sharedLibraryFilters">
            <input className="input" type="search" value={shareSearch} onChange={(event) => { setShareSearch(event.target.value); setSharePage(1); }} placeholder="Search outreach, proposal, win-back, or teammate" aria-label="Search shared templates" />
            <select className="input" value={shareType} onChange={(event) => { setShareType(event.target.value as "all" | "email" | "sequence"); setSharePage(1); }} aria-label="Filter shared templates by type"><option value="all">All types</option><option value="email">Messages</option><option value="sequence">Follow-up plans</option></select>
          </div>
        </div>

        <section className="section sharedLibrarySection">
          <div className="teamSectionHeading"><h2 className="sectionTitle">{libraryView === "incoming" ? "Shared with me" : "Shared by me"}</h2><p className="muted">{libraryView === "incoming" ? "Agency use-case templates and follow-up plans teammates have sent to your account." : "Outreach, follow-up, proposal, and win-back assets you have made available so teammates can chase leads consistently."}</p></div>
          <div className="workspaceGrid" style={{ marginTop: 16 }}>
            {visibleShares.map((share) => (
              <article key={share.id} className="glassCard workspaceCard">
                <div className="cardTop">
                  <h3 className="cardTitle">{share.title}</h3>
                  <span className="miniBadge">
                    {share.asset_type === "email" ? "Template" : "Follow-up Plan"}
                  </span>
                </div>
                <p className="small">{libraryView === "incoming" ? `From ${share.owner_email}` : `Sent to ${share.recipient_email}`}</p>
                <p className="templateMeta">Subject: {share.subject}</p>
                {libraryView === "incoming" ? <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
                  {share.body.length > 220
                    ? `${share.body.slice(0, 220).trim()}...`
                    : share.body}
                </p> : null}
                {libraryView === "incoming" ? <button
                  className="button buttonPrimary"
                  onClick={() => void handleSaveToWorkspace(share)}
                >
                  Save to saved work
                </button> : <button className="button buttonUtility" onClick={() => void handleRemoveShare(share.id)}>Remove access</button>}
              </article>
            ))}
          </div>
          {!isLoadingShares && filteredShares.length === 0 ? (
            <p className="muted">{shareSearch || shareType !== "all" ? "No shared items match these filters." : libraryView === "incoming" ? "Nothing has been shared with this email yet." : "You have not shared anything yet."}</p>
          ) : null}
          {filteredShares.length > sharePageSize ? <div className="sharedLibraryPagination"><button className="button buttonSecondary" disabled={sharePage === 1} onClick={() => setSharePage((page) => Math.max(1, page - 1))}>Previous</button><span>Page {sharePage} of {sharePageCount}</span><button className="button buttonSecondary" disabled={sharePage === sharePageCount} onClick={() => setSharePage((page) => Math.min(sharePageCount, page + 1))}>Next</button></div> : null}
        </section>
        </> : null}
      </section>
    </main>
  );
}
