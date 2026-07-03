"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/account-provider";
import { getOwnedBusinessWorkspace } from "@/lib/cloud";
import {
  createProspect,
  listProspects,
  PROSPECT_STAGES,
  PROSPECT_STAGE_LABELS,
  updateProspectStage,
  type Prospect,
  type ProspectStage,
} from "@/lib/prospects";

const ACTIVE_STAGES: ProspectStage[] = [
  "new",
  "researching",
  "contacted",
  "replied",
  "qualified",
  "meeting",
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function isDue(date: string | null) {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${date}T00:00:00`).getTime() <= today.getTime();
}

export default function ProspectsPage() {
  const { user, hasProAccess, isLoading, plan, businessMembership } = useAccount();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(
    businessMembership?.workspace_id ?? null
  );
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<ProspectStage | "all">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [source, setSource] = useState("");
  const [value, setValue] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [notice, setNotice] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !hasProAccess) return;
    let activeWorkspaceId = businessMembership?.workspace_id ?? null;
    if (!activeWorkspaceId && plan === "business") {
      activeWorkspaceId = (await getOwnedBusinessWorkspace())?.id ?? null;
    }
    setWorkspaceId(activeWorkspaceId);
    setProspects(
      await listProspects({ userId: user.id, workspaceId: activeWorkspaceId })
    );
  }, [businessMembership?.workspace_id, hasProAccess, plan, user]);

  useEffect(() => {
    void refresh().catch((error) => {
      setNotice(error instanceof Error ? error.message : "Prospects could not load.");
    });
  }, [refresh]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return prospects.filter((prospect) => {
      const matchesStage = stageFilter === "all" || prospect.stage === stageFilter;
      const matchesQuery =
        !normalized ||
        [prospect.full_name, prospect.company, prospect.email, prospect.role, prospect.source]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return matchesStage && matchesQuery;
    });
  }, [prospects, query, stageFilter]);

  const metrics = useMemo(() => {
    const active = prospects.filter((prospect) => ACTIVE_STAGES.includes(prospect.stage));
    return {
      active: active.length,
      due: active.filter((prospect) => isDue(prospect.next_follow_up)).length,
      value: active.reduce((sum, prospect) => sum + prospect.estimated_value_gbp, 0),
      won: prospects.filter((prospect) => prospect.stage === "won").length,
    };
  }, [prospects]);

  async function handleCreate() {
    if (!user || !fullName.trim() || !company.trim()) {
      setNotice("Add the prospect's name and company first.");
      return;
    }
    setIsWorking(true);
    try {
      await createProspect({
        userId: user.id,
        workspaceId,
        input: {
          full_name: fullName,
          company,
          email,
          role,
          source,
          estimated_value_gbp: Number(value) || 0,
          next_follow_up: nextFollowUp,
        },
      });
      setFullName("");
      setCompany("");
      setEmail("");
      setRole("");
      setSource("");
      setValue("");
      setNextFollowUp("");
      setShowAdd(false);
      setNotice("Prospect added to the pipeline.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Prospect could not be added.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleStageChange(id: string, stage: ProspectStage) {
    setProspects((current) =>
      current.map((prospect) => (prospect.id === id ? { ...prospect, stage } : prospect))
    );
    try {
      await updateProspectStage(id, stage);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Stage could not be updated.");
      await refresh();
    }
  }

  if (isLoading) {
    return <main className="main"><section className="container"><div className="glassCard emptyState">Loading pipeline...</div></section></main>;
  }

  if (!user || !hasProAccess) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <div className="badge">Client Acquisition</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>Prospect Pipeline</h1>
            <p className="muted">
              {user
                ? "Prospect management is available with Pro, Founder Pro, and Business Pro."
                : "Sign in first, then choose a plan to manage prospects and follow-ups."}
            </p>
            <Link href={user ? "/pricing" : "/account"} className="button buttonPrimary">
              {user ? "View plans" : "Sign in"}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="main">
      <section className="container">
        <div className="prospectHeader">
          <div>
            <div className="badge">Client Acquisition</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>Prospect Pipeline</h1>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              {workspaceId
                ? "Shared Business Pro pipeline"
                : "Your private prospect pipeline"}
            </p>
          </div>
          <button className="button buttonPrimary" onClick={() => setShowAdd((open) => !open)}>
            {showAdd ? "Close" : "Add prospect"}
          </button>
        </div>

        <div className="prospectMetrics">
          <div><span>Active prospects</span><strong>{metrics.active}</strong></div>
          <div><span>Follow-ups due</span><strong>{metrics.due}</strong></div>
          <div><span>Open value</span><strong>{formatMoney(metrics.value)}</strong></div>
          <div><span>Clients won</span><strong>{metrics.won}</strong></div>
        </div>

        {showAdd ? (
          <section className="prospectAddPanel">
            <div className="prospectFormGrid">
              <div className="formGroup"><label className="label">Name</label><input className="input" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Alex Morgan" /></div>
              <div className="formGroup"><label className="label">Company</label><input className="input" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Northstar Labs" /></div>
              <div className="formGroup"><label className="label">Work email</label><input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="alex@company.com" /></div>
              <div className="formGroup"><label className="label">Role</label><input className="input" value={role} onChange={(event) => setRole(event.target.value)} placeholder="Head of Growth" /></div>
              <div className="formGroup"><label className="label">Source</label><input className="input" value={source} onChange={(event) => setSource(event.target.value)} placeholder="LinkedIn, referral, event" /></div>
              <div className="formGroup"><label className="label">Estimated value (GBP)</label><input className="input" type="number" min="0" value={value} onChange={(event) => setValue(event.target.value)} placeholder="2500" /></div>
              <div className="formGroup"><label className="label">Next follow-up</label><input className="input" type="date" value={nextFollowUp} onChange={(event) => setNextFollowUp(event.target.value)} /></div>
            </div>
            <button className="button buttonPrimary" disabled={isWorking} onClick={() => void handleCreate()}>{isWorking ? "Adding..." : "Add to pipeline"}</button>
          </section>
        ) : null}

        {notice ? <p className="notice">{notice}</p> : null}

        <div className="prospectToolbar">
          <div className="authModeTabs prospectViewTabs" role="tablist" aria-label="Prospect view">
            <button className={view === "pipeline" ? "authModeTab active" : "authModeTab"} onClick={() => setView("pipeline")}>Pipeline</button>
            <button className={view === "list" ? "authModeTab active" : "authModeTab"} onClick={() => setView("list")}>List</button>
          </div>
          <input className="input prospectSearch" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, company, email..." />
          <select className="input prospectStageFilter" value={stageFilter} onChange={(event) => setStageFilter(event.target.value as ProspectStage | "all")}>
            <option value="all">All stages</option>
            {PROSPECT_STAGES.map((stage) => <option key={stage} value={stage}>{PROSPECT_STAGE_LABELS[stage]}</option>)}
          </select>
        </div>

        {view === "pipeline" ? (
          <div className="prospectBoard">
            {PROSPECT_STAGES.map((stage) => {
              const stageProspects = filtered.filter((prospect) => prospect.stage === stage);
              return (
                <section key={stage} className="prospectColumn">
                  <div className="prospectColumnHeader"><strong>{PROSPECT_STAGE_LABELS[stage]}</strong><span>{stageProspects.length}</span></div>
                  <div className="prospectColumnBody">
                    {stageProspects.map((prospect) => (
                      <article key={prospect.id} className="prospectCard">
                        <Link href={`/prospects/${prospect.id}`} className="prospectCardLink">
                          <strong>{prospect.full_name}</strong>
                          <span>{prospect.company}{prospect.role ? ` · ${prospect.role}` : ""}</span>
                          <span>{formatMoney(prospect.estimated_value_gbp)}</span>
                          {prospect.next_follow_up ? <span className={isDue(prospect.next_follow_up) ? "prospectDue" : ""}>Follow up {prospect.next_follow_up}</span> : null}
                        </Link>
                        <select className="input prospectCardStage" value={prospect.stage} onChange={(event) => void handleStageChange(prospect.id, event.target.value as ProspectStage)} aria-label={`Move ${prospect.full_name} to stage`}>
                          {PROSPECT_STAGES.map((option) => <option key={option} value={option}>{PROSPECT_STAGE_LABELS[option]}</option>)}
                        </select>
                      </article>
                    ))}
                    {stageProspects.length === 0 ? <p className="prospectEmpty">No prospects</p> : null}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="prospectTableWrap">
            <table className="prospectTable">
              <thead><tr><th>Prospect</th><th>Stage</th><th>Value</th><th>Follow-up</th><th>Source</th></tr></thead>
              <tbody>
                {filtered.map((prospect) => (
                  <tr key={prospect.id}>
                    <td><Link href={`/prospects/${prospect.id}`}><strong>{prospect.full_name}</strong><span>{prospect.company}{prospect.role ? ` · ${prospect.role}` : ""}</span></Link></td>
                    <td><select className="input prospectTableStage" value={prospect.stage} onChange={(event) => void handleStageChange(prospect.id, event.target.value as ProspectStage)}>{PROSPECT_STAGES.map((stage) => <option key={stage} value={stage}>{PROSPECT_STAGE_LABELS[stage]}</option>)}</select></td>
                    <td>{formatMoney(prospect.estimated_value_gbp)}</td>
                    <td className={isDue(prospect.next_follow_up) ? "prospectDue" : ""}>{prospect.next_follow_up || "Not set"}</td>
                    <td>{prospect.source || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? <div className="emptyState"><p className="muted">No prospects match this view.</p></div> : null}
          </div>
        )}
      </section>
    </main>
  );
}
