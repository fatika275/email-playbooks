"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { useAccount } from "@/components/account-provider";
import { getOwnedBusinessWorkspace } from "@/lib/cloud";
import {
  createProspectsBatch,
  createProspect,
  listProspectTasks,
  listProspects,
  PROSPECT_STAGES,
  PROSPECT_STAGE_LABELS,
  setProspectTaskCompleted,
  updateProspectStage,
  type Prospect,
  type ProspectStage,
  type ProspectTask,
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
  const [view, setView] = useState<"pipeline" | "list" | "today" | "reports">("pipeline");
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
  const [tasks, setTasks] = useState<ProspectTask[]>([]);
  const [draggedProspectId, setDraggedProspectId] = useState<string | null>(null);
  const [dragStage, setDragStage] = useState<ProspectStage | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !hasProAccess) return;
    let activeWorkspaceId = businessMembership?.workspace_id ?? null;
    if (!activeWorkspaceId && plan === "business") {
      activeWorkspaceId = (await getOwnedBusinessWorkspace())?.id ?? null;
    }
    setWorkspaceId(activeWorkspaceId);
    const nextProspects = await listProspects({
      userId: user.id,
      workspaceId: activeWorkspaceId,
    });
    setProspects(nextProspects);
    setTasks(await listProspectTasks(nextProspects.map((prospect) => prospect.id)));
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

  const todayItems = useMemo(() => {
    const openTasks = tasks
      .filter((task) => !task.completed_at && isDue(task.due_date))
      .map((task) => ({
        id: `task-${task.id}`,
        task,
        prospect: prospects.find((prospect) => prospect.id === task.prospect_id),
      }));
    const followUps = prospects
      .filter(
        (prospect) =>
          ACTIVE_STAGES.includes(prospect.stage) && isDue(prospect.next_follow_up)
      )
      .map((prospect) => ({ id: `followup-${prospect.id}`, prospect }));
    return { openTasks, followUps };
  }, [prospects, tasks]);

  const report = useMemo(() => {
    const probabilities: Record<ProspectStage, number> = {
      new: 0.05,
      researching: 0.1,
      contacted: 0.2,
      replied: 0.35,
      qualified: 0.55,
      meeting: 0.75,
      won: 1,
      lost: 0,
    };
    const closed = prospects.filter((prospect) => ["won", "lost"].includes(prospect.stage));
    const won = closed.filter((prospect) => prospect.stage === "won").length;
    return {
      weighted: prospects.reduce(
        (sum, prospect) => sum + prospect.estimated_value_gbp * probabilities[prospect.stage],
        0
      ),
      winRate: closed.length ? Math.round((won / closed.length) * 100) : 0,
      stages: PROSPECT_STAGES.map((stage) => {
        const rows = prospects.filter((prospect) => prospect.stage === stage);
        return {
          stage,
          count: rows.length,
          value: rows.reduce((sum, prospect) => sum + prospect.estimated_value_gbp, 0),
        };
      }),
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

  async function handleDrop(stage: ProspectStage) {
    if (!draggedProspectId) return;
    const id = draggedProspectId;
    setDraggedProspectId(null);
    setDragStage(null);
    await handleStageChange(id, stage);
  }

  async function handleCsvImport(file: File) {
    if (!user) return;
    setIsWorking(true);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) =>
        header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      complete: (result) => {
        void (async () => {
          try {
            const inputs = result.data
              .map((row) => {
                const rawStage = (row.stage || "new").trim().toLowerCase();
                const stage = PROSPECT_STAGES.includes(rawStage as ProspectStage)
                  ? (rawStage as ProspectStage)
                  : "new";
                return {
                  full_name: row.full_name || row.name || row.contact_name || "",
                  company: row.company || row.company_name || row.account || "",
                  email: row.email || row.work_email || "",
                  role: row.role || row.job_title || row.title || "",
                  linkedin_url: row.linkedin_url || row.linkedin || "",
                  source: row.source || "CSV import",
                  stage,
                  estimated_value_gbp: Number(
                    row.estimated_value_gbp || row.value || row.deal_value || 0
                  ),
                  notes: row.notes || "",
                  next_follow_up: row.next_follow_up || row.follow_up || "",
                };
              })
              .filter((row) => row.full_name.trim() && row.company.trim());
            if (!inputs.length) {
              throw new Error("No valid rows found. CSV needs name and company columns.");
            }
            await createProspectsBatch({ userId: user.id, workspaceId, inputs });
            await refresh();
            setNotice(`Imported ${inputs.length} prospects.`);
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "CSV import failed.");
          } finally {
            setIsWorking(false);
          }
        })();
      },
      error: (error) => {
        setNotice(error.message || "CSV import failed.");
        setIsWorking(false);
      },
    });
  }

  async function handleTaskComplete(task: ProspectTask) {
    try {
      await setProspectTaskCompleted(task.id, true);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Task could not be completed.");
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
          <div className="toolbar">
            <label className="button buttonSecondary prospectImportButton">
              Import CSV
              <input
                className="prospectImportInput"
                type="file"
                accept=".csv,text/csv"
                disabled={isWorking}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleCsvImport(file);
                  event.target.value = "";
                }}
              />
            </label>
            <button className="button buttonPrimary" onClick={() => setShowAdd((open) => !open)}>
              {showAdd ? "Close" : "Add prospect"}
            </button>
          </div>
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
            <button className={view === "today" ? "authModeTab active" : "authModeTab"} onClick={() => setView("today")}>Today</button>
            <button className={view === "reports" ? "authModeTab active" : "authModeTab"} onClick={() => setView("reports")}>Reports</button>
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
                <section
                  key={stage}
                  className={dragStage === stage ? "prospectColumn isDragTarget" : "prospectColumn"}
                  onDragEnter={() => setDragStage(stage)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => void handleDrop(stage)}
                >
                  <div className="prospectColumnHeader"><strong>{PROSPECT_STAGE_LABELS[stage]}</strong><span>{stageProspects.length}</span></div>
                  <div className="prospectColumnBody">
                    {stageProspects.map((prospect) => (
                      <article
                        key={prospect.id}
                        className="prospectCard"
                        draggable
                        onDragStart={() => setDraggedProspectId(prospect.id)}
                        onDragEnd={() => {
                          setDraggedProspectId(null);
                          setDragStage(null);
                        }}
                      >
                        <Link href={`/prospects/${prospect.id}`} className="prospectCardLink">
                          <strong>{prospect.full_name}</strong>
                          <span>{prospect.company}{prospect.role ? ` - ${prospect.role}` : ""}</span>
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
        ) : view === "list" ? (
          <div className="prospectTableWrap">
            <table className="prospectTable">
              <thead><tr><th>Prospect</th><th>Stage</th><th>Value</th><th>Follow-up</th><th>Source</th></tr></thead>
              <tbody>
                {filtered.map((prospect) => (
                  <tr key={prospect.id}>
                    <td><Link href={`/prospects/${prospect.id}`}><strong>{prospect.full_name}</strong><span>{prospect.company}{prospect.role ? ` - ${prospect.role}` : ""}</span></Link></td>
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
        ) : view === "today" ? (
          <div className="prospectTodayGrid">
            <section className="prospectTodayPanel">
              <div className="prospectSectionHeader"><h2 className="cardTitle">Tasks due</h2></div>
              <div className="prospectTodayList">
                {todayItems.openTasks.map(({ id, task, prospect }) => (
                  <div key={id} className="prospectTodayItem">
                    <div>
                      <strong>{task.title}</strong>
                      <span>{prospect ? `${prospect.full_name} - ${prospect.company}` : "Prospect"}{task.due_date ? ` - Due ${task.due_date}` : ""}</span>
                    </div>
                    <div className="toolbar">
                      {prospect ? <Link href={`/prospects/${prospect.id}`} className="button buttonSecondary">Open</Link> : null}
                      <button className="button buttonPrimary" onClick={() => void handleTaskComplete(task)}>Complete</button>
                    </div>
                  </div>
                ))}
                {todayItems.openTasks.length === 0 ? <p className="muted">No overdue tasks. Nicely handled.</p> : null}
              </div>
            </section>

            <section className="prospectTodayPanel">
              <div className="prospectSectionHeader"><h2 className="cardTitle">Prospects to follow up</h2></div>
              <div className="prospectTodayList">
                {todayItems.followUps.map(({ id, prospect }) => (
                  <div key={id} className="prospectTodayItem">
                    <div><strong>{prospect.full_name}</strong><span>{prospect.company} - {PROSPECT_STAGE_LABELS[prospect.stage]} - Due {prospect.next_follow_up}</span></div>
                    <Link href={`/prospects/${prospect.id}`} className="button buttonPrimary">Follow up</Link>
                  </div>
                ))}
                {todayItems.followUps.length === 0 ? <p className="muted">No prospect follow-ups are due.</p> : null}
              </div>
            </section>
          </div>
        ) : (
          <div className="prospectReports">
            <section className="prospectReportSummary">
              <div><span>Weighted forecast</span><strong>{formatMoney(report.weighted)}</strong></div>
              <div><span>Closed win rate</span><strong>{report.winRate}%</strong></div>
              <div><span>Total records</span><strong>{prospects.length}</strong></div>
            </section>
            <section className="prospectReportTableWrap">
              <table className="prospectTable">
                <thead><tr><th>Stage</th><th>Prospects</th><th>Total value</th><th>Share of pipeline</th></tr></thead>
                <tbody>
                  {report.stages.map((row) => (
                    <tr key={row.stage}>
                      <td><strong>{PROSPECT_STAGE_LABELS[row.stage]}</strong></td>
                      <td>{row.count}</td>
                      <td>{formatMoney(row.value)}</td>
                      <td><div className="prospectReportBar"><span style={{ width: `${prospects.length ? (row.count / prospects.length) * 100 : 0}%` }} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
