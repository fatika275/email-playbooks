"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/account-provider";
import {
  inviteBusinessMember,
  listAccessibleBusinessWorkspaces,
  listBusinessMembers,
  listTeamShares,
  removeBusinessMember,
  removeTeamShare,
  saveCustomTemplateRecord,
  saveEmailRecord,
  updateBusinessMember,
  type BusinessMember,
  type BusinessWorkspace,
  type BusinessWorkspaceAccess,
  type TeamShare,
} from "@/lib/cloud";
import {
  listWorkspaceProspectActivities,
  type WorkspaceProspectActivity,
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
    const [nextMembers, nextActivity] = await Promise.all([
      listBusinessMembers(selected.id),
      listWorkspaceProspectActivities(selected.id),
    ]);
    setMembers(nextMembers);
    setActivity(nextActivity);
  }, []);

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
    const [nextMembers, nextActivity] = await Promise.all([
      listBusinessMembers(selected.id),
      listWorkspaceProspectActivities(selected.id),
    ]);
    setMembers(nextMembers);
    setActivity(nextActivity);
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
          <div className="badge">Team Library</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Shared templates and sequences
          </h1>
          <p className="muted" style={{ maxWidth: 760, lineHeight: 1.75 }}>
            Share from any saved email or reusable sequence. Teammates must sign
            in using the exact email address you shared with.
          </p>
        </div>

        {notice ? <p className="notice">{notice}</p> : null}

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
                <label className="label" htmlFor="business-invite-role">Role</label>
                <select id="business-invite-role" className="input" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "admin" | "member")}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
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
