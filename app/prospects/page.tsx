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
  listProspectTasks,
  getProspectTaskDisplayTitle,
  getProspectTaskMessageRef,
  listProspectActivitiesForProspects,
  listProspects,
  PROSPECT_STAGES,
  PROSPECT_STAGE_LABELS,
  PROSPECT_WORKFLOW_LABELS,
  PROSPECT_WORKFLOW_STAGES,
  PROSPECT_WORKFLOW_VIEWS,
  setProspectTaskCompleted,
  updateProspect,
  updateProspectStage,
  type Prospect,
  type ProspectStage,
  type ProspectWorkflowView,
  type ProspectTask,
  type ProspectActivity,
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

function getLeadSource(prospect: Prospect) {
  return prospect.source?.trim() || "Unknown";
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
  const [workflowView, setWorkflowView] = useState<ProspectWorkflowView>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [pendingOutcome, setPendingOutcome] = useState<{
    prospect: Prospect;
    stage: "won" | "lost";
  } | null>(null);
  const [outcomeReason, setOutcomeReason] = useState("");
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
  const [activities, setActivities] = useState<ProspectActivity[]>([]);
  const [draggedProspectId, setDraggedProspectId] = useState<string | null>(null);
  const [dragStage, setDragStage] = useState<ProspectStage | null>(null);

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
  }, [hasProAccess, user]);

  useEffect(() => {
    void refresh().catch((error) => {
      setNotice(error instanceof Error ? error.message : "Prospects could not load.");
    });
  }, [refresh]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const workflowStages = PROSPECT_WORKFLOW_STAGES[workflowView];
    return prospects.filter((prospect) => {
      const matchesWorkflow = workflowStages.includes(prospect.stage);
      const matchesQuery =
        !normalized ||
        [prospect.full_name, prospect.company, prospect.email, prospect.role, prospect.source]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return matchesWorkflow && matchesQuery;
    });
  }, [prospects, query, workflowView]);

  const visiblePipelineStages = useMemo(
    () => PROSPECT_WORKFLOW_STAGES[workflowView],
    [workflowView]
  );

  const workflowCounts = useMemo(
    () =>
      Object.fromEntries(
        PROSPECT_WORKFLOW_VIEWS.map((item) => [
          item,
          prospects.filter((prospect) =>
            PROSPECT_WORKFLOW_STAGES[item].includes(prospect.stage)
          ).length,
        ])
      ) as Record<ProspectWorkflowView, number>,
    [prospects]
  );

  const metrics = useMemo(() => {
    const active = prospects.filter((prospect) => ACTIVE_STAGES.includes(prospect.stage));
    return {
      active: active.length,
      due: active.filter((prospect) => isDue(prospect.next_follow_up)).length,
      value: active.reduce((sum, prospect) => sum + prospect.estimated_value_gbp, 0),
      won: prospects.filter((prospect) => prospect.stage === "won").length,
    };
  }, [prospects]);
  const calculatedInputValue = Number(value) || 0;

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
    const nextMessageQueue = [
      ...scheduledFollowUps.map(({ task, prospect }) => ({
        id: `message-task-${task.id}`,
        label: "Send next",
        title: prospect?.full_name ?? getProspectTaskDisplayTitle(task.title),
        meta: prospect
          ? `${prospect.company} - ${getProspectTaskDisplayTitle(task.title)}`
          : getProspectTaskDisplayTitle(task.title),
        href: prospect ? `/prospects/${prospect.id}` : "/prospects",
        prospect,
      })),
      ...dueFollowUps.map(({ prospect }) => ({
        id: `message-followup-${prospect.id}`,
        label: "Follow up",
        title: prospect.full_name,
        meta: `${prospect.company} - ${PROSPECT_STAGE_LABELS[prospect.stage]}`,
        href: `/prospects/${prospect.id}`,
        prospect,
      })),
      ...replyNeeded.map((prospect) => ({
        id: `message-reply-${prospect.id}`,
        label: "Reply",
        title: prospect.full_name,
        meta: `${prospect.company} - keep the conversation moving`,
        href: `/prospects/${prospect.id}`,
        prospect,
      })),
    ].slice(0, 5);

    const priorityItems = [
      ...scheduledFollowUps.slice(0, 4).map(({ task, prospect }) => ({
        id: `followup-task-${task.id}`,
        prospectId: prospect?.id,
        label: "Reminder",
        title: getProspectTaskDisplayTitle(task.title),
        meta: prospect ? `${prospect.full_name} - ${prospect.company}` : "Prospect",
        href: prospect ? `/prospects/${prospect.id}` : "/prospects",
      })),
      ...dueFollowUps.slice(0, 4).map(({ prospect }) => ({
        id: `followup-prospect-${prospect.id}`,
        prospectId: prospect.id,
        label: "Due today",
        title: prospect.full_name,
        meta: `${prospect.company} - ${PROSPECT_STAGE_LABELS[prospect.stage]}`,
        href: `/prospects/${prospect.id}`,
      })),
      ...replyNeeded.slice(0, 3).map((prospect) => ({
        id: `reply-${prospect.id}`,
        prospectId: prospect.id,
        label: "Needs reply",
        title: prospect.full_name,
        meta: prospect.company,
        href: `/prospects/${prospect.id}`,
      })),
      ...coldProspects.slice(0, 3).map((prospect) => ({
        id: `cold-${prospect.id}`,
        prospectId: prospect.id,
        label: "Going cold",
        title: prospect.full_name,
        meta: `${prospect.company} - last touched ${daysSince(prospect.last_contacted_at ?? prospect.updated_at)} days ago`,
        href: `/prospects/${prospect.id}`,
      })),
      ...manualDueTasks.slice(0, 3).map(({ task, prospect }) => ({
        id: `task-${task.id}`,
        prospectId: prospect?.id,
        label: "Task due",
        title: getProspectTaskDisplayTitle(task.title),
        meta: prospect ? `${prospect.full_name} - ${prospect.company}` : "Prospect",
        href: prospect ? `/prospects/${prospect.id}` : "/prospects",
      })),
    ].slice(0, 8);
    const primaryMessage = nextMessageQueue[0];
    const supportingItems = priorityItems
      .filter((item) => !primaryMessage?.prospect || item.prospectId !== primaryMessage.prospect.id)
      .slice(0, 5);

    return {
      followUpsDue: scheduledFollowUps.length + dueFollowUps.length,
      replyNeeded,
      proposalsToChase,
      coldProspects,
      manualDueTasks,
      priorityItems,
      supportingItems,
      nextMessageQueue,
    };
  }, [prospects, todayItems]);

  const report = useMemo(() => {
    const closed = prospects.filter((prospect) => ["won", "lost"].includes(prospect.stage));
    const won = closed.filter((prospect) => prospect.stage === "won").length;
    const sourceBreakdown = Object.values(
      prospects.reduce<Record<string, { source: string; leads: number; won: number; value: number }>>(
        (summary, prospect) => {
          const sourceName = getLeadSource(prospect);
          summary[sourceName] ??= { source: sourceName, leads: 0, won: 0, value: 0 };
          summary[sourceName].leads += 1;
          if (prospect.stage === "won") {
            summary[sourceName].won += 1;
            summary[sourceName].value += prospect.estimated_value_gbp;
          }
          return summary;
        },
        {}
      )
    ).sort((a, b) => b.won - a.won || b.value - a.value || b.leads - a.leads);
    return {
      winRate: closed.length ? Math.round((won / closed.length) * 100) : 0,
      sourceBreakdown,
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

  async function handleQuickStageChange(
    prospect: Prospect,
    stage: ProspectStage,
    reason = ""
  ) {
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
      if (user && reason.trim()) {
        await createProspectActivity({
          prospectId: prospect.id,
          userId: user.id,
          activityType: "note",
          summary: `Outcome reason: ${reason.trim()}`,
        });
      }
      setPendingOutcome(null);
      setOutcomeReason("");
      setNotice(`${prospect.full_name} moved to ${PROSPECT_STAGE_LABELS[stage]}.`);
      await refresh();
    } catch (error) {
      setProspects(previous);
      setNotice(error instanceof Error ? error.message : "Prospect could not be updated.");
    }
  }

  function requestOutcome(prospect: Prospect, stage: "won" | "lost") {
    setPendingOutcome({ prospect, stage });
    setOutcomeReason("");
  }

  function handleRescueColdLead(prospect: Prospect) {
    window.localStorage.setItem(
      "thalovo_prospect_context",
      JSON.stringify({
        name: prospect.full_name,
        company: prospect.company,
        email: prospect.email,
        role: prospect.role,
        prospectId: prospect.id,
      })
    );
    router.push("/editor/re-engagement-emails/old-lead-restart");
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
          onClick={() => requestOutcome(prospect, "won")}
        >
          Handoff
        </button>
        <button
          type="button"
          className="button buttonUtility"
          onClick={() => requestOutcome(prospect, "lost")}
        >
          Closed
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
            <div className="badge">Pipeline tracking</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>Know where every replied lead stands</h1>
            <p className="muted">
              {user
                ? "Track prospects, proposals, retainers, handoffs, and next actions so promising client work does not slip through the cracks."
                : "Sign in first, then choose a plan to track where each lead is, what stage it is in, and what needs to happen next."}
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
            <div className="badge">Pipeline tracking</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>Know where every replied lead stands</h1>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              {workspaceId
                ? "Shared Business Pro view of prospects, proposals, retainers, handoffs, follow-ups, and booked clients"
                : "Your private view of prospects, proposals, retainers, handoffs, follow-ups, and booked clients"}
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

        {prospects.length === 0 ? (
          <section className="prospectOnboarding">
            <div>
              <span className="miniBadge">First client-work setup</span>
              <h2 className="sectionTitle">Track your first lead after they reply</h2>
              <p className="muted">
                Add one real lead, choose the follow-up plan that fits, send the first message, then keep their stage and next action clear.
              </p>
            </div>
            <div className="prospectOnboardingSteps">
              <div><strong>1</strong><span>Add first lead</span></div>
              <div><strong>2</strong><span>Choose a follow-up plan</span></div>
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
              <div className="formGroup"><label className="label">Potential work value (GBP)</label><input className="input" type="number" min="0" value={value} onChange={(event) => setValue(event.target.value)} placeholder="2500" /></div>
              <div className="formGroup"><label className="label">Next follow-up</label><input className="input" type="date" value={nextFollowUp} onChange={(event) => setNextFollowUp(event.target.value)} /></div>
            </div>
            <button className="button buttonPrimary" disabled={isWorking} onClick={() => void handleCreate()}>{isWorking ? "Adding..." : "Add lead"}</button>
          </section>
        ) : null}

        {notice ? <p className="notice">{notice}</p> : null}

        {pendingOutcome ? (
          <section className="prospectOutcomePanel" aria-label="Close lead outcome">
            <div>
              <span className="miniBadge">
                {pendingOutcome.stage === "won" ? "Client handoff" : "Lost / slipped"}
              </span>
              <h2 className="cardTitle">
                {pendingOutcome.stage === "won"
                  ? `What made ${pendingOutcome.prospect.full_name} ready for handoff?`
                  : `Why did ${pendingOutcome.prospect.full_name} slip?`}
              </h2>
              <p className="small">
                Optional, but useful later when you want to see which sources,
                offers, or objections affect booked client work.
              </p>
            </div>
            <input
              className="input"
              value={outcomeReason}
              onChange={(event) => setOutcomeReason(event.target.value)}
              placeholder={
                pendingOutcome.stage === "won"
                  ? "Signed retainer, kickoff booked, clear next step..."
                  : "No reply, price, bad fit, timing..."
              }
            />
            <div className="toolbar">
              <button
                className="button buttonPrimary"
                type="button"
                onClick={() =>
                  void handleQuickStageChange(
                    pendingOutcome.prospect,
                    pendingOutcome.stage,
                    outcomeReason
                  )
                }
              >
                Mark {pendingOutcome.stage === "won" ? "handoff" : "closed"}
              </button>
              <button
                className="button buttonUtility"
                type="button"
                onClick={() => {
                  setPendingOutcome(null);
                  setOutcomeReason("");
                }}
              >
                Cancel
              </button>
            </div>
          </section>
        ) : null}

        <div className="prospectToolbar">
          <div className="authModeTabs prospectViewTabs" role="tablist" aria-label="Prospect view">
            <button className={view === "reports" ? "authModeTab active" : "authModeTab"} onClick={() => setView("reports")}>Dashboard</button>
            <button className={view === "pipeline" ? "authModeTab active" : "authModeTab"} onClick={() => setView("pipeline")}>Agency pipeline</button>
            <button className={view === "today" ? "authModeTab active" : "authModeTab"} onClick={() => setView("today")}>Today&apos;s work</button>
            <button className={view === "list" ? "authModeTab active" : "authModeTab"} onClick={() => setView("list")}>Workflow list</button>
          </div>
          <input className="input prospectSearch" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lead, company, email..." />
        </div>

        <div className="prospectWorkflowTabs" aria-label="Agency workflow view">
          {PROSPECT_WORKFLOW_VIEWS.map((item) => (
            <button
              key={item}
              type="button"
              className={workflowView === item ? "prospectWorkflowTab isActive" : "prospectWorkflowTab"}
              onClick={() => setWorkflowView(item)}
            >
              <span>{PROSPECT_WORKFLOW_LABELS[item]}</span>
              <strong>{workflowCounts[item]}</strong>
            </button>
          ))}
        </div>

        {view === "pipeline" ? (
          <div className="prospectViewSection">
          <div className="prospectViewHeading"><h2 className="sectionTitle">{PROSPECT_WORKFLOW_LABELS[workflowView]} by stage</h2><p className="muted">Switch between prospects, proposals, retainers, and client handoff without losing the next action for each lead.</p></div>
          <div className="prospectBoard">
            {visiblePipelineStages.map((stage) => {
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
          <div className="prospectViewHeading"><h2 className="sectionTitle">{PROSPECT_WORKFLOW_LABELS[workflowView]}</h2><p className="muted">A focused list for this part of the agency workflow, from first prospect through proposal, retainer, and client handoff.</p></div>
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
          <div className="prospectViewHeading"><h2 className="sectionTitle">Today&apos;s agency pipeline actions</h2><p className="muted">Start here each day to see what needs a reply, proposal chase, retainer handoff, or stage move.</p></div>
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
                <span className="miniBadge">What to do next</span>
                <h2 className="pageTitle">
                  {dailyDashboard.nextMessageQueue.length
                    ? `Send this next: ${dailyDashboard.nextMessageQueue[0].title}`
                    : dailyDashboard.priorityItems.length
                      ? `${dailyDashboard.priorityItems.length} useful action${dailyDashboard.priorityItems.length === 1 ? "" : "s"} to handle.`
                      : "You are clear for today."}
                </h2>
                <p className="muted">Start with the action most likely to move a lead toward proposal, retainer, handoff, or booked client.</p>
                <div className="prospectFocusSummary" aria-label="Pipeline summary">
                  <span>{dailyDashboard.followUpsDue} follow-up{dailyDashboard.followUpsDue === 1 ? "" : "s"} due</span>
                  <span>{dailyDashboard.replyNeeded.length} repl{dailyDashboard.replyNeeded.length === 1 ? "y" : "ies"} waiting</span>
                  <span>{dailyDashboard.proposalsToChase.length} proposal{dailyDashboard.proposalsToChase.length === 1 ? "" : "s"} to chase</span>
                  <span>{dailyDashboard.coldProspects.length} lead{dailyDashboard.coldProspects.length === 1 ? "" : "s"} going cold</span>
                  <span>{formatMoney(metrics.value)} active potential work</span>
                </div>
              </div>
              <div className="toolbar">
                <button
                  className="button buttonPrimary"
                  onClick={() => {
                    const first = dailyDashboard.nextMessageQueue[0];
                    if (first?.prospect) {
                      handleDraftNextMessage(first.prospect);
                      return;
                    }
                    setView("today");
                  }}
                >
                  {dailyDashboard.nextMessageQueue.length ? "Open next message" : "Open today's work"}
                </button>
                <button className="button buttonSecondary" onClick={() => setView("pipeline")}>View pipeline</button>
              </div>
            </section>

            <div className="prospectDailyLayout">
              <section className="prospectDailyPanel">
                <div className="prospectDashboardSectionHeading"><h3 className="sectionTitle">Other agency pipeline work today</h3><p className="muted">A short backup list after the main action above: replies, proposal chases, follow-ups, stage moves, and handoffs.</p></div>
                <div className="prospectDailyActionList">
                  {dailyDashboard.supportingItems.map((item) => (
                    <Link key={item.id} href={item.href} className="prospectDailyAction">
                      <span className="miniBadge">{item.label}</span>
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.meta}</small>
                      </div>
                    </Link>
                  ))}
                  {dailyDashboard.supportingItems.length === 0 ? (
                    <div className="prospectDailyEmpty">
                      <strong>No extra work queued</strong>
                      <p className="muted">Handle the main action above, or add leads and schedule follow-ups so delay does not become a lost deal.</p>
                      <div className="prospectExampleList">
                        <span>Example: Chase proposal decision</span>
                        <span>Example: Rescue a lead after 14 quiet days</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="prospectDailyPanel">
                <div className="prospectDashboardSectionHeading"><h3 className="sectionTitle">Basic reporting</h3><p className="muted">Simple proof of what is working: replies, booked calls, and client handoffs.</p></div>
                <div className="prospectFocusStats">
                  <div><span>Replies</span><strong>{outreachMetrics.replied}</strong></div>
                  <div><span>Booked calls</span><strong>{outreachMetrics.meetings}</strong></div>
                  <div><span>Client handoffs</span><strong>{outreachMetrics.won}</strong></div>
                </div>
                <p className="small" style={{ margin: "10px 0 0" }}>
                  Reply rate {acquisitionRates.reply}% from {outreachMetrics.contacted} contacted lead{outreachMetrics.contacted === 1 ? "" : "s"}.
                </p>

                <div className="prospectDashboardSectionHeading prospectDashboardSubsection"><h3 className="cardTitle">Proposal decisions</h3></div>
                <div className="prospectMiniList">
                  {dailyDashboard.proposalsToChase.slice(0, 4).map((item) => {
                    const prospect = "prospect" in item ? item.prospect : undefined;
                    const task = "task" in item ? item.task : undefined;
                    return (
                      <Link key={item.id ?? `${prospect?.id}-${task?.id}`} href={prospect ? `/prospects/${prospect.id}` : "/prospects"} className="prospectMiniListItem">
                        <strong>{prospect?.full_name ?? (task ? getProspectTaskDisplayTitle(task.title) : "Proposal")}</strong>
                        <span>{prospect ? `${prospect.company} - chase decision` : "Open proposal task"}</span>
                      </Link>
                    );
                  })}
                  {dailyDashboard.proposalsToChase.length === 0 ? <p className="small">No proposals need chasing right now.</p> : null}
                </div>

                <div className="prospectDashboardSectionHeading prospectDashboardSubsection"><h3 className="cardTitle">Cold lead rescue</h3></div>
                <div className="prospectMiniList">
                  {dailyDashboard.coldProspects.slice(0, 4).map((prospect) => (
                    <div key={prospect.id} className="prospectMiniListItem prospectMiniListAction">
                      <div>
                        <strong>{prospect.full_name}</strong>
                        <span>{prospect.company} - last touched {daysSince(prospect.last_contacted_at ?? prospect.updated_at)} days ago</span>
                      </div>
                      <button className="button buttonSecondary" type="button" onClick={() => handleRescueColdLead(prospect)}>
                        Rescue
                      </button>
                    </div>
                  ))}
                  {dailyDashboard.coldProspects.length === 0 ? <p className="small">No stale leads need rescuing.</p> : null}
                </div>
              </section>
            </div>

            <section className="prospectDashboardSection prospectStageSnapshot">
              <div className="prospectDashboardSectionHeading"><h3 className="sectionTitle">Agency workflow</h3><p className="muted">A simple view of where work sits: prospects, proposals, retainers, client handoff, and lost leads.</p></div>
              <div className="prospectWorkflowSummary">
                {PROSPECT_WORKFLOW_VIEWS.filter((item) => item !== "all").map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="prospectWorkflowSummaryItem"
                    onClick={() => {
                      setWorkflowView(item);
                      setView("pipeline");
                    }}
                  >
                    <span>{PROSPECT_WORKFLOW_LABELS[item]}</span>
                    <strong>{workflowCounts[item]}</strong>
                  </button>
                ))}
                <button
                  type="button"
                  className="prospectWorkflowSummaryItem"
                  onClick={() => {
                    setWorkflowView("all");
                    setView("pipeline");
                  }}
                >
                  <span>Lost / closed</span>
                  <strong>{prospects.filter((prospect) => prospect.stage === "lost").length}</strong>
                </button>
              </div>
              <div className="prospectStageRows">
                {report.stages.map((row) => (
                  <div key={row.stage}><span>{PROSPECT_STAGE_LABELS[row.stage]}</span><i><b style={{ width: `${prospects.length ? (row.count / prospects.length) * 100 : 0}%` }} /></i><strong>{row.count}</strong></div>
                ))}
              </div>
            </section>

            <section className="prospectDashboardSection">
              <div className="prospectDashboardSectionHeading"><h3 className="sectionTitle">What is working</h3><p className="muted">Light source reporting only: enough to see where replies and booked work are coming from early.</p></div>
              <div className="prospectSourceRows">
                {report.sourceBreakdown.slice(0, 6).map((row) => (
                  <div key={row.source}>
                    <span>{row.source}</span>
                    <strong>{row.won} handoff{row.won === 1 ? "" : "s"}</strong>
                    <small>{row.leads} lead{row.leads === 1 ? "" : "s"} - {formatMoney(row.value)} client work</small>
                  </div>
                ))}
                {report.sourceBreakdown.length === 0 ? <p className="small">Add sources to leads to see what turns into client work.</p> : null}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

