"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { useAccount } from "@/components/account-provider";
import {
  listAccessibleBusinessWorkspaces,
  type BusinessWorkspaceAccess,
} from "@/lib/cloud";
import {
  createProspectsBatch,
  createProspect,
  createProspectActivity,
  DEFAULT_STAGE_PROBABILITIES,
  getForecastSettings,
  listProspectTasks,
  getProspectTaskDisplayTitle,
  getProspectTaskMessageRef,
  listProspectActivitiesForProspects,
  listProspects,
  PROSPECT_STAGES,
  PROSPECT_STAGE_LABELS,
  saveForecastSettings,
  setProspectTaskCompleted,
  updateProspect,
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

function isFutureDate(date: string | null) {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${date}T00:00:00`).getTime() > today.getTime();
}

function addDays(date: string, days: number) {
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

function daysSince(date: string | null) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const then = new Date(date);
  then.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - then.getTime()) / 86_400_000);
}

function isScheduledTask(task: ProspectTask) {
  const title = getProspectTaskDisplayTitle(task.title).toLowerCase();
  return title.includes("follow-up") || title.includes("follow up");
}

function isProposalTask(task: ProspectTask) {
  return getProspectTaskDisplayTitle(task.title).toLowerCase().includes("proposal");
}

function cleanFollowUpTaskTitle(title: string) {
  return getProspectTaskDisplayTitle(title).replace(/^(?:Proposal|Scheduled) follow-up \d+: /, "");
}

function getFollowUpStep(task: ProspectTask) {
  const stepMatch = task.title.match(/follow-up (\d):/);
  return Math.min(3, Math.max(1, Number(stepMatch?.[1]) || 1));
}

export default function ProspectsPage() {
  const router = useRouter();
  const { user, hasProAccess, isLoading, businessMembership } = useAccount();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(
    businessMembership?.workspace_id ?? null
  );
  const [workspaces, setWorkspaces] = useState<BusinessWorkspaceAccess[]>([]);
  const [view, setView] = useState<"pipeline" | "list" | "today" | "reports">("reports");
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

  const dailyDashboard = useMemo(() => {
    const openDueTasks = todayItems.openTasks.filter(({ task }) => task.due_date);
    const scheduledFollowUps = openDueTasks.filter(({ task }) => isScheduledTask(task));
    const manualDueTasks = openDueTasks.filter(({ task }) => !isScheduledTask(task));
    const taskProspectIds = new Set(openDueTasks.map(({ task }) => task.prospect_id));
    const dueFollowUps = todayItems.followUps.filter(
      ({ prospect }) => !taskProspectIds.has(prospect.id)
    );
    const replyNeeded = prospects.filter((prospect) => prospect.stage === "replied");
    const proposalsToChase = [
      ...openDueTasks.filter(({ task }) => isProposalTask(task)),
      ...prospects
        .filter(
          (prospect) =>
            ["qualified", "meeting"].includes(prospect.stage) &&
            isDue(prospect.next_follow_up)
        )
        .map((prospect) => ({ id: `proposal-${prospect.id}`, prospect })),
    ];
    const coldProspects = prospects.filter((prospect) => {
      if (!["contacted", "replied", "qualified", "meeting"].includes(prospect.stage)) {
        return false;
      }
      if (isDue(prospect.next_follow_up)) return false;
      const days = daysSince(prospect.last_contacted_at ?? prospect.updated_at);
      return days !== null && days >= 14;
    });

    const priorityItems = [
      ...scheduledFollowUps.slice(0, 4).map(({ task, prospect }) => ({
        id: `followup-task-${task.id}`,
        label: "Reminder",
        title: getProspectTaskDisplayTitle(task.title),
        meta: prospect ? `${prospect.full_name} - ${prospect.company}` : "Prospect",
        href: prospect ? `/prospects/${prospect.id}` : "/prospects",
      })),
      ...dueFollowUps.slice(0, 4).map(({ prospect }) => ({
        id: `followup-prospect-${prospect.id}`,
        label: "Due today",
        title: prospect.full_name,
        meta: `${prospect.company} - ${PROSPECT_STAGE_LABELS[prospect.stage]}`,
        href: `/prospects/${prospect.id}`,
      })),
      ...replyNeeded.slice(0, 3).map((prospect) => ({
        id: `reply-${prospect.id}`,
        label: "Needs reply",
        title: prospect.full_name,
        meta: prospect.company,
        href: `/prospects/${prospect.id}`,
      })),
      ...coldProspects.slice(0, 3).map((prospect) => ({
        id: `cold-${prospect.id}`,
        label: "Going cold",
        title: prospect.full_name,
        meta: `${prospect.company} - last touched ${daysSince(prospect.last_contacted_at ?? prospect.updated_at)} days ago`,
        href: `/prospects/${prospect.id}`,
      })),
      ...manualDueTasks.slice(0, 3).map(({ task, prospect }) => ({
        id: `task-${task.id}`,
        label: "Task due",
        title: getProspectTaskDisplayTitle(task.title),
        meta: prospect ? `${prospect.full_name} - ${prospect.company}` : "Prospect",
        href: prospect ? `/prospects/${prospect.id}` : "/prospects",
      })),
    ].slice(0, 8);

    return {
      followUpsDue: scheduledFollowUps.length + dueFollowUps.length,
      replyNeeded,
      proposalsToChase,
      coldProspects,
      manualDueTasks,
      priorityItems,
    };
  }, [prospects, todayItems]);

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
  const outreachMetrics = useMemo(() => {
    const outreachActivities = activities.filter((item) => ["email", "call", "meeting"].includes(item.activity_type));
    const contactedIds = new Set(outreachActivities.map((item) => item.prospect_id));
    prospects.filter((item) => item.last_contacted_at).forEach((item) => contactedIds.add(item.id));
    const meetingIds = new Set(activities.filter((item) => item.activity_type === "meeting").map((item) => item.prospect_id));
    prospects.filter((item) => ["meeting", "won"].includes(item.stage)).forEach((item) => meetingIds.add(item.id));
    return {
      actions: outreachActivities.length,
      contacted: contactedIds.size,
      replied: prospects.filter((item) => ["replied", "qualified", "meeting", "won"].includes(item.stage)).length,
      meetings: meetingIds.size,
      won: prospects.filter((item) => item.stage === "won").length,
    };
  }, [activities, prospects]);
  const acquisitionRates = useMemo(() => ({
    reply: outreachMetrics.contacted ? Math.min(100, Math.round((outreachMetrics.replied / outreachMetrics.contacted) * 100)) : 0,
    meeting: outreachMetrics.contacted ? Math.min(100, Math.round((outreachMetrics.meetings / outreachMetrics.contacted) * 100)) : 0,
    win: outreachMetrics.contacted ? Math.min(100, Math.round((outreachMetrics.won / outreachMetrics.contacted) * 100)) : 0,
  }), [outreachMetrics]);

  async function handleCreate() {
    if (!user || !fullName.trim() || !company.trim()) {
      setNotice("Add the prospect's name and company first.");
      return;
    }
    const isFirstLead = prospects.length === 0;
    setIsWorking(true);
    try {
      const created = await createProspect({
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
      if (isFirstLead) {
        router.push(`/prospects/${created.id}?onboarding=1`);
      }
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

  function getProspectUpdatePayload(prospect: Prospect, overrides: Partial<Prospect>) {
    return {
      full_name: overrides.full_name ?? prospect.full_name,
      company: overrides.company ?? prospect.company,
      email: overrides.email ?? prospect.email ?? "",
      role: overrides.role ?? prospect.role ?? "",
      linkedin_url: overrides.linkedin_url ?? prospect.linkedin_url ?? "",
      source: overrides.source ?? prospect.source ?? "",
      stage: overrides.stage ?? prospect.stage,
      estimated_value_gbp:
        overrides.estimated_value_gbp ?? prospect.estimated_value_gbp,
      notes: overrides.notes ?? prospect.notes ?? "",
      next_follow_up: overrides.next_follow_up ?? prospect.next_follow_up ?? "",
      last_contacted_at:
        overrides.last_contacted_at ?? prospect.last_contacted_at,
    };
  }

  function handleDraftNextMessage(prospect: Prospect) {
    const nextTask = tasks
      .filter((task) => task.prospect_id === prospect.id && !task.completed_at)
      .filter(
        (task) =>
          Boolean(getProspectTaskMessageRef(task.title)) ||
          task.title.startsWith("Proposal follow-up")
      )
      .sort((a, b) => (a.due_date || "9999-12-31").localeCompare(b.due_date || "9999-12-31"))[0];
    const messageRef = nextTask ? getProspectTaskMessageRef(nextTask.title) : null;
    const legacyProposalTemplateIds = [
      "proposal-check-in",
      "proposal-next-steps",
      "proposal-close-loop",
    ];
    const isLegacyProposalTask = nextTask?.title.startsWith("Proposal follow-up") ?? false;
    const workflowStep = nextTask ? getFollowUpStep(nextTask) : undefined;

    window.localStorage.setItem(
      "thalovo_prospect_context",
      JSON.stringify({
        name: prospect.full_name,
        company: prospect.company,
        email: prospect.email,
        role: prospect.role,
        prospectId: prospect.id,
        workflowTaskId: nextTask?.id,
        workflowStep,
        workflowLabel: nextTask ? cleanFollowUpTaskTitle(nextTask.title) : undefined,
      })
    );
    if (messageRef) {
      router.push(`/editor/${messageRef.playbookId}/${messageRef.templateId}`);
      return;
    }
    if (isLegacyProposalTask && workflowStep) {
      router.push(`/editor/proposal-follow-up/${legacyProposalTemplateIds[workflowStep - 1]}`);
      return;
    }
    router.push(`/prospects/${prospect.id}`);
  }

  async function handleQuickStageChange(prospect: Prospect, stage: ProspectStage) {
    const previous = prospects;
    setProspects((current) =>
      current.map((item) => (item.id === prospect.id ? { ...item, stage } : item))
    );
    try {
      await updateProspectStage(prospect.id, stage);
      if (user && ["replied", "won", "lost"].includes(stage)) {
        await createProspectActivity({
          prospectId: prospect.id,
          userId: user.id,
          activityType: "status",
          summary: `${prospect.full_name} marked ${PROSPECT_STAGE_LABELS[stage].toLowerCase()}.`,
        });
      }
      setNotice(`${prospect.full_name} moved to ${PROSPECT_STAGE_LABELS[stage]}.`);
      await refresh();
    } catch (error) {
      setProspects(previous);
      setNotice(error instanceof Error ? error.message : "Prospect could not be updated.");
    }
  }

  async function handleSnoozeFollowUp(prospect: Prospect, days = 3) {
    const nextDate = addDays(new Date().toISOString().slice(0, 10), days);
    const previous = prospects;
    setProspects((current) =>
      current.map((item) =>
        item.id === prospect.id ? { ...item, next_follow_up: nextDate } : item
      )
    );
    try {
      await updateProspect(
        prospect.id,
        getProspectUpdatePayload(prospect, { next_follow_up: nextDate })
      );
      if (user) {
        await createProspectActivity({
          prospectId: prospect.id,
          userId: user.id,
          activityType: "update",
          summary: `Follow-up snoozed until ${nextDate}.`,
        });
      }
      setNotice(`${prospect.full_name} snoozed until ${nextDate}.`);
      await refresh();
    } catch (error) {
      setProspects(previous);
      setNotice(error instanceof Error ? error.message : "Follow-up could not be snoozed.");
    }
  }

  async function handleUnsnoozeFollowUp(prospect: Prospect) {
    const today = new Date().toISOString().slice(0, 10);
    const previous = prospects;
    setProspects((current) =>
      current.map((item) =>
        item.id === prospect.id ? { ...item, next_follow_up: today } : item
      )
    );
    try {
      await updateProspect(
        prospect.id,
        getProspectUpdatePayload(prospect, { next_follow_up: today })
      );
      if (user) {
        await createProspectActivity({
          prospectId: prospect.id,
          userId: user.id,
          activityType: "update",
          summary: "Follow-up unsnoozed and moved back to today.",
        });
      }
      setNotice(`${prospect.full_name} is back in today's follow-ups.`);
      await refresh();
    } catch (error) {
      setProspects(previous);
      setNotice(error instanceof Error ? error.message : "Follow-up could not be unsnoozed.");
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

  function renderProspectQuickActions(prospect: Prospect) {
    const isSnoozed = isFutureDate(prospect.next_follow_up);
    return (
      <div className="prospectQuickActions" aria-label={`Quick actions for ${prospect.full_name}`}>
        <button
          type="button"
          className="button buttonPrimary"
          onClick={() => handleDraftNextMessage(prospect)}
        >
          Send next message
        </button>
        <button
          type="button"
          className="button buttonUtility"
          title={
            isSnoozed
              ? `Snoozed until ${prospect.next_follow_up}. Move back to today.`
              : "Move follow-up out by 3 days."
          }
          onClick={() =>
            void (isSnoozed
              ? handleUnsnoozeFollowUp(prospect)
              : handleSnoozeFollowUp(prospect))
          }
        >
          {isSnoozed ? "Unsnooze" : "Snooze"}
        </button>
        <button
          type="button"
          className="button buttonSecondary"
          onClick={() => void handleQuickStageChange(prospect, "won")}
        >
          Won
        </button>
        <button
          type="button"
          className="button buttonUtility"
          onClick={() => void handleQuickStageChange(prospect, "lost")}
        >
          Lost
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <main className="main"><section className="container"><div className="glassCard emptyState">Loading client work...</div></section></main>;
  }

  if (!user || !hasProAccess) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <div className="badge">Agency pipeline</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>Client Work Pipeline</h1>
            <p className="muted">
              {user
                ? "Track leads, chase follow-ups, and stop client work from slipping with Pro, Founder Pro, and Business Pro."
                : "Sign in first, then choose a plan to track leads and follow-ups."}
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
            <h1 className="pageTitle" style={{ marginTop: 14 }}>Client Work Pipeline</h1>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              {workspaceId
                ? "Shared Business Pro view of leads, replies, proposals, and won client work"
                : "Your private view of leads, replies, proposals, and won client work"}
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
              {showAdd ? "Close" : "Add lead"}
            </button>
          </div>
        </div>

        <div className="prospectMetrics">
          <div><span>Active leads</span><strong>{metrics.active}</strong></div>
          <div><span>Replies needed</span><strong>{dailyDashboard.replyNeeded.length}</strong></div>
          <div><span>Potential client work</span><strong>{formatMoney(metrics.value)}</strong></div>
          <div><span>Clients won</span><strong>{metrics.won}</strong></div>
        </div>

        {prospects.length === 0 ? (
          <section className="prospectOnboarding">
            <div>
              <span className="miniBadge">First client-work setup</span>
              <h2 className="sectionTitle">Get your first lead moving</h2>
              <p className="muted">
                Add one real lead, choose the sequence that fits, send the first message, then set the follow-up so they do not slip.
              </p>
            </div>
            <div className="prospectOnboardingSteps">
              <div><strong>1</strong><span>Add first lead</span></div>
              <div><strong>2</strong><span>Choose a sequence</span></div>
              <div><strong>3</strong><span>Send first message</span></div>
              <div><strong>4</strong><span>Set first follow-up</span></div>
            </div>
            <button className="button buttonPrimary" type="button" onClick={() => setShowAdd(true)}>
              Add first lead
            </button>
          </section>
        ) : null}

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
            <button className="button buttonPrimary" disabled={isWorking} onClick={() => void handleCreate()}>{isWorking ? "Adding..." : "Add lead"}</button>
          </section>
        ) : null}

        {notice ? <p className="notice">{notice}</p> : null}

        <div className="prospectToolbar">
          <div className="authModeTabs prospectViewTabs" role="tablist" aria-label="Prospect view">
            <button className={view === "reports" ? "authModeTab active" : "authModeTab"} onClick={() => setView("reports")}>Dashboard</button>
            <button className={view === "pipeline" ? "authModeTab active" : "authModeTab"} onClick={() => setView("pipeline")}>Opportunities</button>
            <button className={view === "today" ? "authModeTab active" : "authModeTab"} onClick={() => setView("today")}>Today&apos;s work</button>
            <button className={view === "list" ? "authModeTab active" : "authModeTab"} onClick={() => setView("list")}>Lead list</button>
          </div>
          <input className="input prospectSearch" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lead, company, email..." />
          <select className="input prospectStageFilter" value={stageFilter} onChange={(event) => setStageFilter(event.target.value as ProspectStage | "all")}>
            <option value="all">All stages</option>
            {PROSPECT_STAGES.map((stage) => <option key={stage} value={stage}>{PROSPECT_STAGE_LABELS[stage]}</option>)}
          </select>
        </div>

        {view === "pipeline" ? (
          <div className="prospectViewSection">
          <div className="prospectViewHeading"><h2 className="sectionTitle">Opportunities by stage</h2><p className="muted">Move leads forward as they get closer to booked client work, or park the ones that have slipped.</p></div>
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
                        {renderProspectQuickActions(prospect)}
                        <select className="input prospectCardStage" value={prospect.stage} onChange={(event) => void handleStageChange(prospect.id, event.target.value as ProspectStage)} aria-label={`Move ${prospect.full_name} to stage`} title="Move to another stage">
                          {PROSPECT_STAGES.map((option) => <option key={option} value={option}>{PROSPECT_STAGE_LABELS[option]}</option>)}
                        </select>
                      </article>
                    ))}
                    {stageProspects.length === 0 ? <p className="prospectEmpty">No leads</p> : null}
                  </div>
                </section>
              );
            })}
          </div>
          </div>
        ) : view === "list" ? (
          <div className="prospectViewSection">
          <div className="prospectViewHeading"><h2 className="sectionTitle">All leads</h2><p className="muted">Scan every possible client in one place, then find the replies, proposals, and cold leads that need action.</p></div>
          <div className="prospectTableWrap">
            <table className="prospectTable">
              <thead><tr><th>Lead</th><th>Stage</th><th>Client work value</th><th>Follow-up</th><th>Source</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map((prospect) => (
                  <tr key={prospect.id}>
                    <td><Link href={`/prospects/${prospect.id}`}><strong>{prospect.full_name}</strong><span>{prospect.company}{prospect.role ? ` - ${prospect.role}` : ""}</span></Link></td>
                    <td><select className="input prospectTableStage" value={prospect.stage} onChange={(event) => void handleStageChange(prospect.id, event.target.value as ProspectStage)}>{PROSPECT_STAGES.map((stage) => <option key={stage} value={stage}>{PROSPECT_STAGE_LABELS[stage]}</option>)}</select></td>
                    <td>{formatMoney(prospect.estimated_value_gbp)}</td>
                    <td className={isDue(prospect.next_follow_up) ? "prospectDue" : ""}>{prospect.next_follow_up || "Not set"}</td>
                    <td>{prospect.source || "-"}</td>
                    <td>{renderProspectQuickActions(prospect)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? <div className="emptyState"><p className="muted">No leads match this view.</p></div> : null}
          </div>
          </div>
        ) : view === "today" ? (
          <div className="prospectViewSection">
          <div className="prospectViewHeading"><h2 className="sectionTitle">Today&apos;s client-work actions</h2><p className="muted">Start here each day to chase replies, protect proposals, and keep warm leads from slipping.</p></div>
          <div className="prospectTodayGrid">
            <section className="prospectTodayPanel">
              <div className="prospectSectionHeader"><h2 className="cardTitle">Actions due</h2></div>
              <div className="prospectTodayList">
                {todayItems.openTasks.map(({ id, task, prospect }) => (
                  <div key={id} className="prospectTodayItem">
                    <div>
                      <strong>{getProspectTaskDisplayTitle(task.title)}</strong>
                      <span>{prospect ? `${prospect.full_name} - ${prospect.company}` : "Lead"}{task.due_date ? ` - Due ${task.due_date}` : ""}</span>
                    </div>
                    <div className="toolbar">
                      {prospect ? <Link href={`/prospects/${prospect.id}`} className="button buttonSecondary">Open</Link> : null}
                      <button className="button buttonPrimary" onClick={() => void handleTaskComplete(task)}>Complete</button>
                    </div>
                  </div>
                ))}
                {todayItems.openTasks.length === 0 ? <p className="muted">No overdue lead actions. Nicely handled.</p> : null}
              </div>
            </section>

            <section className="prospectTodayPanel">
              <div className="prospectSectionHeader"><h2 className="cardTitle">Leads to follow up</h2></div>
              <div className="prospectTodayList">
                {todayItems.followUps.map(({ id, prospect }) => (
                  <div key={id} className="prospectTodayItem">
                    <div><strong>{prospect.full_name}</strong><span>{prospect.company} - {PROSPECT_STAGE_LABELS[prospect.stage]} - Due {prospect.next_follow_up}</span></div>
                    <Link href={`/prospects/${prospect.id}`} className="button buttonPrimary">Follow up</Link>
                  </div>
                ))}
                {todayItems.followUps.length === 0 ? <p className="muted">No lead follow-ups are due.</p> : null}
              </div>
            </section>
          </div>
          </div>
        ) : (
          <div className="prospectReports">
            <section className="prospectDailyHero">
              <div>
                <span className="miniBadge">Daily view</span>
                <h2 className="pageTitle">
                  {dailyDashboard.priorityItems.length
                    ? `${dailyDashboard.priorityItems.length} useful action${dailyDashboard.priorityItems.length === 1 ? "" : "s"} to handle.`
                    : "You are clear for today."}
                </h2>
                <p className="muted">Start with the work that books clients: follow-ups, replies, proposal nudges, and leads starting to slip.</p>
              </div>
              <div className="toolbar">
                <button className="button buttonPrimary" onClick={() => setView("today")}>Open today&apos;s work</button>
                <button className="button buttonSecondary" onClick={() => setView("pipeline")}>View opportunities</button>
              </div>
            </section>

            <section className="prospectDailyCards" aria-label="Today action summary">
              <button type="button" onClick={() => setView("today")}>
                <strong>{dailyDashboard.followUpsDue}</strong>
                <span>Follow-ups to send today</span>
                <small>Warm leads that need a nudge before they slip.</small>
              </button>
              <button type="button" onClick={() => { setStageFilter("replied"); setView("list"); }}>
                <strong>{dailyDashboard.replyNeeded.length}</strong>
                <span>Leads need your reply</span>
                <small>Conversations waiting for you to move them toward booked work.</small>
              </button>
              <button type="button" onClick={() => setView("today")}>
                <strong>{dailyDashboard.proposalsToChase.length}</strong>
                <span>Proposals need chasing</span>
                <small>Late-stage client work that needs a decision.</small>
              </button>
              <button type="button" onClick={() => setView("list")}>
                <strong>{dailyDashboard.coldProspects.length}</strong>
                <span>Leads going cold</span>
                <small>No recent touch for 14+ days.</small>
              </button>
            </section>

            <div className="prospectDailyLayout">
              <section className="prospectDailyPanel">
                <div className="prospectDashboardSectionHeading"><h3 className="sectionTitle">Do these first</h3><p className="muted">The actions most likely to protect or book client work are pulled into one short list.</p></div>
                <div className="prospectDailyActionList">
                  {dailyDashboard.priorityItems.map((item) => (
                    <Link key={item.id} href={item.href} className="prospectDailyAction">
                      <span className="miniBadge">{item.label}</span>
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.meta}</small>
                      </div>
                    </Link>
                  ))}
                  {dailyDashboard.priorityItems.length === 0 ? (
                    <div className="prospectDailyEmpty">
                      <strong>No urgent actions</strong>
                      <p className="muted">Add leads, schedule follow-ups, or review opportunities when you want to create the next set of client-work actions.</p>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="prospectDailyPanel">
                <div className="prospectDashboardSectionHeading"><h3 className="sectionTitle">Client work health</h3><p className="muted">Enough context to see whether your next jobs are moving forward or slipping.</p></div>
                <div className="prospectPipelineNow">
                  <div><span>Active leads</span><strong>{metrics.active}</strong></div>
                  <div><span>Potential client work</span><strong>{formatMoney(metrics.value)}</strong></div>
                  <div><span>Reply rate</span><strong>{acquisitionRates.reply}%</strong></div>
                  <div><span>Closed win rate</span><strong>{report.winRate}%</strong></div>
                </div>
              </section>
            </div>

            <section className="prospectDashboardSection prospectStageSnapshot">
              <div className="prospectDashboardSectionHeading"><h3 className="sectionTitle">Where leads sit</h3><p className="muted">A quick view of what is moving, what needs a reply, and what may be slipping.</p></div>
              <div className="prospectStageRows">
                {report.stages.map((row) => (
                  <div key={row.stage}><span>{PROSPECT_STAGE_LABELS[row.stage]}</span><i><b style={{ width: `${prospects.length ? (row.count / prospects.length) * 100 : 0}%` }} /></i><strong>{row.count}</strong></div>
                ))}
              </div>
            </section>

            <details className="prospectForecastSettings prospectAdvancedReport">
              <summary><strong>Client work forecast settings</strong><span>Optional deal values, probabilities, and weighted forecasting</span></summary>
              <div className="prospectAdvancedReportContent">
              <div className="cardTop">
                <div>
                  <h2 className="cardTitle">Client work forecast</h2>
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
          </div>
        )}
      </section>
    </main>
  );
}
