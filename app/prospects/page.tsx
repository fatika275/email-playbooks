"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { useAccount } from "@/components/account-provider";
import {
  listAccessibleBusinessWorkspaces,
  type BusinessWorkspaceAccess,
} from "@/lib/cloud";
import {
  createProspectsBatch,
  createProspect,
  DEFAULT_STAGE_PROBABILITIES,
  getForecastSettings,
  listProspectTasks,
  listProspectActivitiesForProspects,
  listProspects,
  PROSPECT_STAGES,
  PROSPECT_STAGE_LABELS,
  saveForecastSettings,
  setProspectTaskCompleted,
  updateProspectStage,
  type Prospect,
  type ProspectStage,
  type ProspectTask,
  type ProspectActivity,
  type ForecastValueBasis,
  type StageProbabilities,
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
  const { user, hasProAccess, isLoading, businessMembership } = useAccount();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(
    businessMembership?.workspace_id ?? null
  );
  const [workspaces, setWorkspaces] = useState<BusinessWorkspaceAccess[]>([]);
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
  const [valueMonths, setValueMonths] = useState(12);
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [notice, setNotice] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [tasks, setTasks] = useState<ProspectTask[]>([]);
  const [activities, setActivities] = useState<ProspectActivity[]>([]);
  const [draggedProspectId, setDraggedProspectId] = useState<string | null>(null);
  const [dragStage, setDragStage] = useState<ProspectStage | null>(null);
  const [valueBasis, setValueBasis] = useState<ForecastValueBasis>("fixed");
  const [probabilities, setProbabilities] = useState<StageProbabilities>(
    DEFAULT_STAGE_PROBABILITIES
  );
  const [isSavingForecast, setIsSavingForecast] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !hasProAccess) return;
    const accessible = await listAccessibleBusinessWorkspaces();
    setWorkspaces(accessible);
    const storedId = window.localStorage.getItem("thalovo_active_workspace_id");
    const activeWorkspace =
      accessible.find((item) => item.id === storedId) ?? accessible[0] ?? null;
    const activeWorkspaceId = activeWorkspace?.id ?? null;
    if (activeWorkspaceId) {
      window.localStorage.setItem("thalovo_active_workspace_id", activeWorkspaceId);
    }
    setWorkspaceId(activeWorkspaceId);
    const nextProspects = await listProspects({
      userId: user.id,
      workspaceId: activeWorkspaceId,
    });
    setProspects(nextProspects);
    const prospectIds = nextProspects.map((prospect) => prospect.id);
    const [nextTasks, nextActivities] = await Promise.all([
      listProspectTasks(prospectIds),
      listProspectActivitiesForProspects(prospectIds),
    ]);
    setTasks(nextTasks);
    setActivities(nextActivities);
    const settings = await getForecastSettings({
      userId: user.id,
      workspaceId: activeWorkspaceId,
    });
    if (settings) {
      setValueBasis(settings.value_basis);
      setValueMonths(settings.default_months);
      setProbabilities(settings.stage_probabilities);
    }
  }, [hasProAccess, user]);

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
  const activeWorkspace = workspaces.find((item) => item.id === workspaceId);
  const canEditForecast = !workspaceId || activeWorkspace?.access_role !== "member";
  const calculatedInputValue =
    valueBasis === "monthly"
      ? (Number(value) || 0) * Math.max(1, valueMonths)
      : Number(value) || 0;

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
    const closed = prospects.filter((prospect) => ["won", "lost"].includes(prospect.stage));
    const won = closed.filter((prospect) => prospect.stage === "won").length;
    return {
      weighted: prospects.reduce(
        (sum, prospect) =>
          sum + prospect.estimated_value_gbp * (probabilities[prospect.stage] / 100),
        0
      ),
      winRate: closed.length ? Math.round((won / closed.length) * 100) : 0,
      closedCount: closed.length,
      confidence: closed.length >= 20 ? "High" : closed.length >= 5 ? "Medium" : "Low",
      stages: PROSPECT_STAGES.map((stage) => {
        const rows = prospects.filter((prospect) => prospect.stage === stage);
        return {
          stage,
          count: rows.length,
          value: rows.reduce((sum, prospect) => sum + prospect.estimated_value_gbp, 0),
        };
      }),
    };
  }, [probabilities, prospects]);
  const outreachMetrics = useMemo(() => ({
    contacted: activities.filter((item) => ["email", "call", "meeting"].includes(item.activity_type)).length,
    replied: prospects.filter((item) => ["replied", "qualified", "meeting", "won"].includes(item.stage)).length,
    meetings: activities.filter((item) => item.activity_type === "meeting").length,
    won: prospects.filter((item) => item.stage === "won").length,
  }), [activities, prospects]);

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
          estimated_value_gbp: calculatedInputValue,
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

  async function handleWorkspaceChange(nextWorkspaceId: string) {
    window.localStorage.setItem("thalovo_active_workspace_id", nextWorkspaceId);
    setWorkspaceId(nextWorkspaceId);
    setIsWorking(true);
    try {
      const nextProspects = await listProspects({ userId: user!.id, workspaceId: nextWorkspaceId });
      setProspects(nextProspects);
      const prospectIds = nextProspects.map((prospect) => prospect.id);
      const [nextTasks, nextActivities] = await Promise.all([
        listProspectTasks(prospectIds),
        listProspectActivitiesForProspects(prospectIds),
      ]);
      setTasks(nextTasks);
      setActivities(nextActivities);
      setNotice("Workspace switched.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Workspace could not be opened.");
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

  async function handleSaveForecast() {
    if (!user || !canEditForecast) return;
    setIsSavingForecast(true);
    try {
      const saved = await saveForecastSettings({
        owner_id: user.id,
        workspace_id: workspaceId,
        value_basis: valueBasis,
        default_months: valueMonths,
        stage_probabilities: probabilities,
      });
      setValueBasis(saved.value_basis);
      setValueMonths(saved.default_months);
      setProbabilities(saved.stage_probabilities);
      setNotice("Forecast model updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Forecast settings could not be saved.");
    } finally {
      setIsSavingForecast(false);
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
            <div className="badge">Agency pipeline</div>
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
            <div className="badge">Agency pipeline</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>Prospect Pipeline</h1>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              {workspaceId
                ? "Shared Business Pro pipeline"
                : "Your private prospect pipeline"}
            </p>
          </div>
          <div className="toolbar">
            {workspaces.length > 1 ? <select className="input prospectWorkspaceSelect" value={workspaceId ?? ""} aria-label="Active workspace" onChange={(event) => void handleWorkspaceChange(event.target.value)}>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.access_role}</option>)}</select> : null}
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
              <div className="formGroup"><label className="label">{valueBasis === "monthly" ? "Monthly fee (GBP)" : valueBasis === "annual" ? "Annual contract value (GBP)" : "Fixed deal value (GBP)"}</label><input className="input" type="number" min="0" value={value} onChange={(event) => setValue(event.target.value)} placeholder="2500" />{valueBasis === "monthly" ? <p className="small" style={{ margin: "6px 0 0" }}>Stored contract value: {formatMoney(calculatedInputValue)}</p> : null}</div>
              {valueBasis === "monthly" ? <div className="formGroup"><label className="label">Expected months</label><input className="input" type="number" min="1" max="60" value={valueMonths} onChange={(event) => setValueMonths(Math.max(1, Number(event.target.value) || 1))} /></div> : null}
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
                          <div className="prospectCardTop">
                            <div><strong>{prospect.full_name}</strong><span>{prospect.company}</span></div>
                            {prospect.estimated_value_gbp > 0 ? <span className="prospectCardValue">{formatMoney(prospect.estimated_value_gbp)}</span> : null}
                          </div>
                          {prospect.next_follow_up ? <span className={isDue(prospect.next_follow_up) ? "prospectCardFollowUp prospectDue" : "prospectCardFollowUp"}>{isDue(prospect.next_follow_up) ? "Due" : "Follow up"} {prospect.next_follow_up}</span> : null}
                        </Link>
                        <select className="input prospectCardStage" value={prospect.stage} onChange={(event) => void handleStageChange(prospect.id, event.target.value as ProspectStage)} aria-label={`Move ${prospect.full_name} to stage`} title="Move to another stage">
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
              <div><span>Outreach logged</span><strong>{outreachMetrics.contacted}</strong></div>
              <div><span>Leads that replied</span><strong>{outreachMetrics.replied}</strong></div>
              <div><span>Meetings logged</span><strong>{outreachMetrics.meetings}</strong></div>
              <div><span>Work won</span><strong>{outreachMetrics.won}</strong></div>
            </section>
            <details className="prospectForecastSettings prospectAdvancedReport">
              <summary><strong>Advanced forecast settings</strong><span>Optional deal values, probabilities, and weighted forecasting</span></summary>
              <div className="prospectAdvancedReportContent">
              <div className="cardTop">
                <div>
                  <h2 className="cardTitle">Forecast settings</h2>
                  <p className="muted" style={{ margin: "8px 0 0" }}>
                    Weighted forecast = each deal&apos;s stored contract value × its
                    current stage probability.
                  </p>
                </div>
                <span className="statusPill statusPillNeutral">
                  {report.closedCount} closed deals · {report.confidence} confidence
                </span>
              </div>

              <div className="prospectForecastControls">
                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Default value basis</label>
                  <select className="input" value={valueBasis} disabled={!canEditForecast} onChange={(event) => setValueBasis(event.target.value as ForecastValueBasis)}>
                    <option value="fixed">Fixed project / contract value</option>
                    <option value="monthly">Monthly fee × expected months</option>
                    <option value="annual">Annual contract value</option>
                  </select>
                </div>
                {valueBasis === "monthly" ? (
                  <div className="formGroup" style={{ marginBottom: 0 }}>
                    <label className="label">Default expected months</label>
                    <input className="input" type="number" min="1" max="60" value={valueMonths} disabled={!canEditForecast} onChange={(event) => setValueMonths(Math.min(60, Math.max(1, Number(event.target.value) || 1)))} />
                  </div>
                ) : null}
              </div>

              <div className="prospectProbabilityGrid">
                {PROSPECT_STAGES.map((stage) => (
                  <div className="formGroup" key={stage} style={{ marginBottom: 0 }}>
                    <label className="label" htmlFor={`probability-${stage}`}>{PROSPECT_STAGE_LABELS[stage]}</label>
                    <div className="prospectProbabilityInput">
                      <input id={`probability-${stage}`} className="input" type="number" min="0" max="100" value={probabilities[stage]} disabled={!canEditForecast || stage === "won" || stage === "lost"} onChange={(event) => setProbabilities((current) => ({ ...current, [stage]: Math.min(100, Math.max(0, Number(event.target.value) || 0)) }))} />
                      <span>%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="toolbar" style={{ marginTop: 18 }}>
                {canEditForecast ? (
                  <>
                    <button className="button buttonPrimary" disabled={isSavingForecast} onClick={() => void handleSaveForecast()}>{isSavingForecast ? "Saving..." : "Save forecast model"}</button>
                    <button className="button buttonUtility" onClick={() => setProbabilities(DEFAULT_STAGE_PROBABILITIES)}>Reset probabilities</button>
                  </>
                ) : (
                  <p className="small">Your Business Pro owner controls the shared forecast model.</p>
                )}
              </div>
              </div>
            </details>
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
