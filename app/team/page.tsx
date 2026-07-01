"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/account-provider";
import {
  listTeamShares,
  removeTeamShare,
  saveCustomTemplateRecord,
  saveEmailRecord,
  type TeamShare,
} from "@/lib/cloud";

function makeSharedId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function TeamLibraryPage() {
  const { user, hasProAccess, isLoading } = useAccount();
  const [shares, setShares] = useState<TeamShare[]>([]);
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

  useEffect(() => {
    if (!user || !hasProAccess) return;
    void refreshShares();
  }, [hasProAccess, user]);

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
