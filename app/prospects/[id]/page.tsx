"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "@/components/account-provider";
import { listBusinessMembers, type BusinessMember } from "@/lib/cloud";
import {
  createProspectActivity,
  createProspectComment,
  createProspectTask,
  deleteProspect,
  deleteProspectTask,
  getProspect,
  getProspectTaskDisplayTitle,
  getProspectTaskMessageRef,
  listProspectActivities,
  listProspectComments,
  listProspectTasks,
  PROSPECT_STAGES,
  PROSPECT_STAGE_LABELS,
  setProspectTaskCompleted,
  updateProspect,
  updateProspectAssignment,
  type ProspectActivity,
  type ProspectActivityType,
  type ProspectTask,
  type ProspectComment,
  type Prospect,
  type ProspectStage,
} from "@/lib/prospects";
import { playbooks } from "@/lib/data";
import { type CustomTemplate, useCustomTemplates } from "@/lib/storage";

const SEQUENCE_TIMING: Record<string, number[]> = {
  "cold-outreach-sequence": [1, 3, 7, 10],
  "follow-up-frameworks": [2, 5, 9, 14],
  "re-engagement-emails": [1, 5, 10],
  "proposal-follow-up": [2, 5, 10],
  "meeting-follow-up": [0],
  "demo-booking-sequence": [0, 2],
  "inbound-lead-replies": [0, 2],
  "no-show-recovery": [0, 3],
  "client-renewal-upsell": [0, 5],
};

const builtInScheduledSequences = playbooks.filter((playbook) => SEQUENCE_TIMING[playbook.id]);

type ScheduledSequence = {
  id: string;
  name: string;
  sourceLabel: string;
  steps: {
    playbookId: string;
    templateId: string;
    label: string;
    dayOffset: number;
  }[];
};

function isScheduledFollowUpTask(task: ProspectTask) {
  return task.title.startsWith("Proposal follow-up") || task.title.startsWith("Scheduled follow-up");
}

function cleanFollowUpTaskTitle(title: string) {
  return getProspectTaskDisplayTitle(title).replace(/^(?:Proposal|Scheduled) follow-up \d+: /, "");
}

function cleanTemplateLabel(label: string) {
  return label.replace(/\s*\(Day\s+\d+\)/i, "").trim();
}

function getLegacyCustomSequenceSteps(template: CustomTemplate): ScheduledSequence["steps"] {
  if (template.sequenceSteps?.length) {
    return template.sequenceSteps.map((step, index) => ({
      playbookId: step.playbookId,
      templateId: step.templateId,
      label: step.templateLabel || `Step ${index + 1}`,
      dayOffset: step.dayOffset,
    }));
  }

  const parsedLabels = Array.from(
    template.body.matchAll(/^Step\s+\d+:\s*(.+)$/gim)
  ).map((match) => match[1]?.trim()).filter(Boolean);

  const labels = parsedLabels.length > 0 ? parsedLabels : [template.title];

  return labels
    .map((label, index) => {
      const normalizedLabel = label.toLowerCase();
      const match = playbooks
        .flatMap((playbook) =>
          playbook.templates.map((item, templateIndex) => ({
            playbook,
            item,
            templateIndex,
          }))
        )
        .find(({ item }) => cleanTemplateLabel(item.label).toLowerCase() === normalizedLabel);

      if (!match && index > 0) return null;

      const playbookId = match?.playbook.id ?? template.sourcePlaybookId;
      const templateId = match?.item.id ?? template.sourceTemplateId;
      const sourceTiming = SEQUENCE_TIMING[playbookId];

      return {
        playbookId,
        templateId,
        label: match ? cleanTemplateLabel(match.item.label) : label,
        dayOffset: sourceTiming?.[match?.templateIndex ?? index] ?? index * 3,
      };
    })
    .filter((step): step is ScheduledSequence["steps"][number] => Boolean(step));
}

function addDays(date: string, days: number) {
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

export default function ProspectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasProAccess, isLoading } = useAccount();
  const customTemplates = useCustomTemplates();
  const id = useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [source, setSource] = useState("");
  const [stage, setStage] = useState<ProspectStage>("new");
  const [value, setValue] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [lastContactedAt, setLastContactedAt] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [notice, setNotice] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [activities, setActivities] = useState<ProspectActivity[]>([]);
  const [tasks, setTasks] = useState<ProspectTask[]>([]);
  const [comments, setComments] = useState<ProspectComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [activityType, setActivityType] = useState<ProspectActivityType>("note");
  const [activitySummary, setActivitySummary] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssignee, setTaskAssignee] = useState(user?.email ?? "");
  const [teamMembers, setTeamMembers] = useState<BusinessMember[]>([]);
  const [proposalSentDate, setProposalSentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedSequenceId, setSelectedSequenceId] = useState("");
  const [sequenceSearch, setSequenceSearch] = useState("");
  const [isSequencePickerOpen, setIsSequencePickerOpen] = useState(false);
  const [isStartingProposalWorkflow, setIsStartingProposalWorkflow] = useState(false);
  const [detailView, setDetailView] = useState<"overview" | "followup" | "activity">("overview");
  const [activityFilter, setActivityFilter] = useState<"useful" | "outreach" | "notes" | "all">("useful");
  const [showAllActivity, setShowAllActivity] = useState(false);

  const scheduledSequences = useMemo<ScheduledSequence[]>(() => {
    const builtIn = builtInScheduledSequences.map((playbook) => ({
      id: playbook.id,
      name: playbook.name,
      sourceLabel: "Message Library",
      steps: playbook.templates.map((template, index) => ({
        playbookId: playbook.id,
        templateId: template.id,
        label: cleanTemplateLabel(template.label),
        dayOffset: SEQUENCE_TIMING[playbook.id][index] ?? index * 3,
      })),
    }));

    const saved = customTemplates
      .map((template) => ({
        id: `custom:${template.id}`,
        name: template.title,
        sourceLabel: template.sequenceSteps?.length ? "Saved sequence" : "Saved sequence",
        steps: getLegacyCustomSequenceSteps(template),
      }))
      .filter((sequence) => sequence.steps.length > 0);

    return [...saved, ...builtIn];
  }, [customTemplates]);

  const selectedScheduledSequence = useMemo(
    () =>
      scheduledSequences.find((sequence) => sequence.id === selectedSequenceId) ??
      null,
    [scheduledSequences, selectedSequenceId]
  );

  const filteredScheduledSequences = useMemo(() => {
    const normalized = sequenceSearch.trim().toLowerCase();
    if (!normalized) return scheduledSequences;

    return scheduledSequences.filter((sequence) =>
      [
        sequence.name,
        sequence.sourceLabel,
        ...sequence.steps.map((step) => step.label),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [scheduledSequences, sequenceSearch]);
  const proposalWorkflowTasks = useMemo(
    () => tasks.filter(isScheduledFollowUpTask),
    [tasks]
  );
  const activeProposalTasks = proposalWorkflowTasks.filter((task) => !task.completed_at);
  const nextProposalTask = [...activeProposalTasks].sort((a, b) =>
    (a.due_date || "").localeCompare(b.due_date || "")
  )[0];
  const openManualTasks = tasks.filter(
    (task) => !task.completed_at && !isScheduledFollowUpTask(task)
  );
  const filteredActivities = useMemo(() => activities.filter((activity) => {
    if (activityFilter === "all") return true;
    if (activityFilter === "outreach") return ["email", "call", "meeting"].includes(activity.activity_type);
    if (activityFilter === "notes") return activity.activity_type === "note";
    return ["email", "call", "meeting", "status"].includes(activity.activity_type);
  }), [activities, activityFilter]);
  const visibleActivities = showAllActivity ? filteredActivities : filteredActivities.slice(0, 8);
  const showOnboardingGuide =
    searchParams.get("onboarding") === "1" ||
    Boolean(prospect && !lastContactedAt && !nextFollowUp && tasks.length === 0);
  const onboardingSequenceStarted = activeProposalTasks.length > 0 || Boolean(nextFollowUp);
  const onboardingFirstMessageSent = Boolean(lastContactedAt);
  const onboardingFollowUpSet = Boolean(lastContactedAt && nextFollowUp);

  useEffect(() => {
    if (searchParams.get("onboarding") !== "1") return;
    setDetailView("followup");
    if (!nextProposalTask && activeProposalTasks.length === 0) {
      setIsSequencePickerOpen(true);
    }
  }, [activeProposalTasks.length, nextProposalTask, searchParams]);

  useEffect(() => {
    if (!id || !user || !hasProAccess) return;
    void getProspect(id)
      .then((record) => {
        if (!record) {
          setNotice("This prospect could not be found or you no longer have access.");
          return;
        }
        setProspect(record);
        setFullName(record.full_name);
        setCompany(record.company);
        setEmail(record.email ?? "");
        setRole(record.role ?? "");
        setLinkedinUrl(record.linkedin_url ?? "");
        setSource(record.source ?? "");
        setStage(record.stage);
        setValue(String(record.estimated_value_gbp || ""));
        setNextFollowUp(record.next_follow_up ?? "");
        setLastContactedAt(record.last_contacted_at);
        setNotes(record.notes ?? "");
        return Promise.all([
          listProspectActivities(record.id),
          listProspectTasks([record.id]),
          listProspectComments(record.id),
        ]);
      })
      .then((operations) => {
        if (!operations) return;
        setActivities(operations[0]);
        setTasks(operations[1]);
        setComments(operations[2]);
      })
      .catch((error) => {
        setNotice(error instanceof Error ? error.message : "Prospect could not load.");
      });
  }, [hasProAccess, id, user]);

  useEffect(() => {
    if (!prospect?.workspace_id) {
      setTeamMembers([]);
      return;
    }
    void listBusinessMembers(prospect.workspace_id)
      .then((rows) => setTeamMembers(rows.filter((member) => member.access_active)))
      .catch(() => setTeamMembers([]));
  }, [prospect?.workspace_id]);

  async function save(options?: { markContacted?: boolean }) {
    if (!id || !fullName.trim() || !company.trim()) {
      setNotice("Name and company are required.");
      return;
    }
    setIsWorking(true);
    try {
      const contactedAt = options?.markContacted
        ? new Date().toISOString()
        : lastContactedAt;
      const updated = await updateProspect(id, {
        full_name: fullName,
        company,
        email,
        role,
        linkedin_url: linkedinUrl,
        source,
        stage: options?.markContacted && stage === "new" ? "contacted" : stage,
        estimated_value_gbp: Number(value) || 0,
        next_follow_up: nextFollowUp,
        last_contacted_at: contactedAt,
        notes,
      });
      setProspect(updated);
      setStage(updated.stage);
      setLastContactedAt(updated.last_contacted_at);
      setNotice(options?.markContacted ? "Contact logged and prospect updated." : "Prospect updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Prospect could not be updated.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleDelete() {
    if (!id || !window.confirm("Delete this prospect permanently?")) return;
    setIsWorking(true);
    try {
      await deleteProspect(id);
      router.push("/prospects");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Prospect could not be deleted.");
      setIsWorking(false);
    }
  }

  async function refreshOperations() {
    if (!id) return;
    const [nextActivities, nextTasks, nextComments] = await Promise.all([
      listProspectActivities(id),
      listProspectTasks([id]),
      listProspectComments(id),
    ]);
    setActivities(nextActivities);
    setTasks(nextTasks);
    setComments(nextComments);
  }

  async function handleAddComment() {
    if (!id || !user || !prospect?.workspace_id || !commentBody.trim()) return;
    try {
      await createProspectComment({ prospectId: id, workspaceId: prospect.workspace_id, userId: user.id, userEmail: user.email, body: commentBody, members: teamMembers });
      setCommentBody("");
      await refreshOperations();
      setNotice("Comment added.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Comment could not be added.");
    }
  }

  async function handleAddActivity() {
    if (!id || !user || !activitySummary.trim()) return;
    try {
      await createProspectActivity({
        prospectId: id,
        userId: user.id,
        activityType,
        summary: activitySummary,
      });
      setActivitySummary("");
      await refreshOperations();
      setNotice("Activity logged.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Activity could not be logged.");
    }
  }

  async function handleAddTask() {
    if (!id || !user || !taskTitle.trim()) return;
    try {
      await createProspectTask({
        prospectId: id,
        userId: user.id,
        title: taskTitle,
        dueDate: taskDueDate,
        assignedEmail: taskAssignee,
        assignedUserId:
          teamMembers.find((member) => member.email === taskAssignee)?.user_id ??
          (taskAssignee === user.email ? user.id : null),
        workspaceId: prospect?.workspace_id,
      });
      setTaskTitle("");
      setTaskDueDate("");
      await refreshOperations();
      setNotice("Task added.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Task could not be added.");
    }
  }

  async function handleProspectAssignment(value: string) {
    if (!id) return;
    const member = teamMembers.find((item) => item.id === value);
    const assigningSelf = value === "self";
    try {
      const updated = await updateProspectAssignment({
        id,
        userId: member?.user_id ?? (assigningSelf ? user?.id : null),
        email: member?.email ?? (assigningSelf ? user?.email : null),
        actorId: user?.id,
      });
      setProspect(updated);
      await refreshOperations();
      setNotice(member || assigningSelf ? "Prospect assigned." : "Prospect unassigned.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Assignment could not be updated.");
    }
  }

  async function handleTaskToggle(task: ProspectTask) {
    try {
      await setProspectTaskCompleted(task.id, !task.completed_at);
      await refreshOperations();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Task could not be updated.");
    }
  }

  async function handleTaskDelete(taskId: string) {
    try {
      await deleteProspectTask(taskId);
      await refreshOperations();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Task could not be removed.");
    }
  }

  function handleDraftProposalFollowUp(task: ProspectTask) {
    const stepMatch = task.title.match(/follow-up (\d):/);
    const step = Math.min(3, Math.max(1, Number(stepMatch?.[1]) || 1));
    const messageRef = getProspectTaskMessageRef(task.title);
    const templateIds = ["proposal-check-in", "proposal-next-steps", "proposal-close-loop"];
    const isLegacyProposal = task.title.startsWith("Proposal follow-up");
    const workflowLabel = cleanFollowUpTaskTitle(task.title);
    localStorage.setItem(
      "thalovo_prospect_context",
      JSON.stringify({
        name: fullName,
        company,
        email,
        role,
        prospectId: id,
        workflowTaskId: task.id,
        workflowStep: step,
        workflowLabel,
      })
    );
    router.push(messageRef ? `/editor/${messageRef.playbookId}/${messageRef.templateId}` : isLegacyProposal ? `/editor/proposal-follow-up/${templateIds[step - 1]}` : "/library");
  }

  async function handleCompleteProposalTask(task: ProspectTask) {
    if (!id) return;
    try {
      await setProspectTaskCompleted(task.id, true);
      const nextTask = activeProposalTasks
        .filter((item) => item.id !== task.id)
        .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))[0];
      const nextDate = nextTask?.due_date ?? "";
      const updated = await updateProspect(id, {
        full_name: fullName,
        company,
        email,
        role,
        linkedin_url: linkedinUrl,
        source,
        stage,
        estimated_value_gbp: Number(value) || 0,
        next_follow_up: nextDate,
        last_contacted_at: new Date().toISOString(),
        notes,
      });
      setProspect(updated);
      setNextFollowUp(nextDate);
      setLastContactedAt(updated.last_contacted_at);
      await refreshOperations();
      setNotice(nextTask ? "Follow-up completed. The next reminder is scheduled." : "Final follow-up completed. Record the outcome when they respond.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Follow-up could not be completed.");
    }
  }

  async function handleStartProposalWorkflow() {
    if (!id || !user || !proposalSentDate) return;
    const selectedSequence = scheduledSequences.find((playbook) => playbook.id === selectedSequenceId);
    if (!selectedSequence || selectedSequence.steps.length === 0) return;
    if (activeProposalTasks.length && !window.confirm("Replace the current follow-up schedule with a new one?")) return;
    setIsStartingProposalWorkflow(true);
    try {
      await Promise.all(activeProposalTasks.map((task) => setProspectTaskCompleted(task.id, true)));
      const assignedUserId =
        teamMembers.find((member) => member.email === taskAssignee)?.user_id ??
        (taskAssignee === user.email ? user.id : null);
      await Promise.all(selectedSequence.steps.map((step, index) => createProspectTask({
        prospectId: id,
        userId: user.id,
        title: `Scheduled follow-up ${index + 1}: ${step.label} [[thalovo:${step.playbookId}/${step.templateId}]]`,
        dueDate: addDays(proposalSentDate, step.dayOffset),
        assignedEmail: taskAssignee,
        assignedUserId,
        workspaceId: prospect?.workspace_id,
      })));
      await createProspectActivity({
        prospectId: id,
        userId: user.id,
        activityType: "email",
        summary: `${selectedSequence.name} scheduled with ${selectedSequence.steps.length} step${selectedSequence.steps.length === 1 ? "" : "s"}.`,
      });
      const firstFollowUp = addDays(proposalSentDate, selectedSequence.steps[0]?.dayOffset ?? 0);
      const updated = await updateProspect(id, {
        full_name: fullName,
        company,
        email,
        role,
        linkedin_url: linkedinUrl,
        source,
        stage,
        estimated_value_gbp: Number(value) || 0,
        next_follow_up: firstFollowUp,
        last_contacted_at: new Date(`${proposalSentDate}T12:00:00`).toISOString(),
        notes,
      });
      setProspect(updated);
      setNextFollowUp(firstFollowUp);
      setLastContactedAt(updated.last_contacted_at);
      await refreshOperations();
      setNotice(`${selectedSequence.name} started. Your reminders are ready.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Scheduled follow-up could not be started.");
    } finally {
      setIsStartingProposalWorkflow(false);
    }
  }

  async function handleProposalOutcome(outcome: "replied" | "won" | "lost") {
    if (!id || !user) return;
    setIsStartingProposalWorkflow(true);
    try {
      await Promise.all(activeProposalTasks.map((task) => setProspectTaskCompleted(task.id, true)));
      const updated = await updateProspect(id, {
        full_name: fullName,
        company,
        email,
        role,
        linkedin_url: linkedinUrl,
        source,
        stage: outcome,
        estimated_value_gbp: Number(value) || 0,
        next_follow_up: "",
        last_contacted_at: lastContactedAt,
        notes,
      });
      await createProspectActivity({
        prospectId: id,
        userId: user.id,
        activityType: "status",
        summary: `Scheduled follow-up closed: ${PROSPECT_STAGE_LABELS[outcome]}.`,
      });
      setProspect(updated);
      setStage(outcome);
      setNextFollowUp("");
      await refreshOperations();
      setNotice(`Scheduled follow-up closed as ${PROSPECT_STAGE_LABELS[outcome].toLowerCase()}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Scheduled follow-up could not be closed.");
    } finally {
      setIsStartingProposalWorkflow(false);
    }
  }

  function handleDraftOutreach() {
    localStorage.setItem(
      "thalovo_prospect_context",
      JSON.stringify({ name: fullName, company, email, role, prospectId: id })
    );
    router.push("/library");
  }

  if (isLoading) {
    return <main className="main"><section className="container"><div className="glassCard emptyState">Loading lead...</div></section></main>;
  }

  if (!user || !hasProAccess) {
    return (
      <main className="main"><section className="container"><div className="glassCard emptyState">
        <h1 className="pageTitle">Lead pipeline access required</h1>
        <Link href={user ? "/pricing" : "/account"} className="button buttonPrimary">{user ? "View plans" : "Sign in"}</Link>
      </div></section></main>
    );
  }

  if (!prospect && notice) {
    return (
      <main className="main"><section className="container"><div className="glassCard emptyState">
        <h1 className="pageTitle">Lead unavailable</h1><p className="muted">{notice}</p><Link href="/prospects" className="button buttonPrimary">Back to client work</Link>
      </div></section></main>
    );
  }

  return (
    <main className="main">
      <section className="container">
        <div className="prospectHeader">
          <div>
            <div className="badge">Client work lead</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>{fullName || "Lead"}</h1>
            <p className="muted" style={{ margin: "8px 0 0" }}>{company || "Loading company..."}</p>
          </div>
          <Link href="/prospects" className="button buttonSecondary">Back to client work</Link>
        </div>

        {notice ? <p className="notice">{notice}</p> : null}

        <div className="prospectDetailTabs" role="tablist" aria-label="Lead details">
          <button type="button" role="tab" aria-selected={detailView === "overview"} className={detailView === "overview" ? "active" : ""} onClick={() => setDetailView("overview")}>Overview</button>
          <button type="button" role="tab" aria-selected={detailView === "followup"} className={detailView === "followup" ? "active" : ""} onClick={() => setDetailView("followup")}>Next steps{activeProposalTasks.length + openManualTasks.length ? ` (${activeProposalTasks.length + openManualTasks.length})` : ""}</button>
          <button type="button" role="tab" aria-selected={detailView === "activity"} className={detailView === "activity" ? "active" : ""} onClick={() => setDetailView("activity")}>Activity</button>
        </div>

        {showOnboardingGuide ? (
          <section className="prospectOnboarding prospectOnboardingDetail">
            <div>
              <span className="miniBadge">First client-work setup</span>
              <h2 className="sectionTitle">Turn this lead into an action plan</h2>
              <p className="muted">
                Choose a sequence, open the first message, then schedule the follow-up so this lead does not disappear after the first touch.
              </p>
            </div>
            <div className="prospectOnboardingSteps">
              <div className="isDone"><strong>1</strong><span>Lead added</span></div>
              <div className={onboardingSequenceStarted ? "isDone" : ""}><strong>2</strong><span>Choose a sequence</span></div>
              <div className={onboardingFirstMessageSent ? "isDone" : ""}><strong>3</strong><span>Send first message</span></div>
              <div className={onboardingFollowUpSet ? "isDone" : ""}><strong>4</strong><span>Set first follow-up</span></div>
            </div>
            <button
              className="button buttonPrimary"
              type="button"
              onClick={() => {
                if (nextProposalTask) {
                  handleDraftProposalFollowUp(nextProposalTask);
                  return;
                }
                setDetailView("followup");
                setIsSequencePickerOpen(true);
              }}
            >
              {nextProposalTask ? "Open first message" : "Choose a sequence"}
            </button>
          </section>
        ) : null}

        <div className="prospectDetailLayout">
          <section className="prospectDetailMain">
            <div hidden={detailView !== "overview"}>
            <div className="prospectSectionHeader"><h2 className="cardTitle">Lead and company</h2></div>
            <div className="prospectFormGrid">
              <div className="formGroup"><label className="label">Name</label><input className="input" value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
              <div className="formGroup"><label className="label">Company</label><input className="input" value={company} onChange={(event) => setCompany(event.target.value)} /></div>
              <div className="formGroup"><label className="label">Work email</label><input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
              <div className="formGroup"><label className="label">Role</label><input className="input" value={role} onChange={(event) => setRole(event.target.value)} /></div>
              <div className="formGroup"><label className="label">LinkedIn URL</label><input className="input" type="url" value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} placeholder="https://linkedin.com/in/..." /></div>
              <div className="formGroup"><label className="label">Lead source</label><input className="input" value={source} onChange={(event) => setSource(event.target.value)} placeholder="Referral, LinkedIn, event..." /></div>
            </div>

            <div className="prospectSectionHeader"><h2 className="cardTitle">Deal fit and follow-up</h2></div>
            <div className="prospectFormGrid">
              <div className="formGroup"><label className="label">Client work stage</label><select className="input" value={stage} onChange={(event) => setStage(event.target.value as ProspectStage)}>{PROSPECT_STAGES.map((option) => <option key={option} value={option}>{PROSPECT_STAGE_LABELS[option]}</option>)}</select></div>
              <div className="formGroup"><label className="label">Potential client work value (GBP)</label><input className="input" type="number" min="0" value={value} onChange={(event) => setValue(event.target.value)} /><p className="small" style={{ margin: "6px 0 0" }}>Use the full fixed, calculated monthly, or annual value of the client work this lead could become.</p></div>
              <div className="formGroup"><label className="label">Next follow-up</label><input className="input" type="date" value={nextFollowUp} onChange={(event) => setNextFollowUp(event.target.value)} /></div>
              <div className="formGroup"><label className="label">Last contacted</label><input className="input" value={lastContactedAt ? new Date(lastContactedAt).toLocaleString() : "Not contacted yet"} disabled /></div>
              {prospect?.workspace_id ? <div className="formGroup"><label className="label">Lead owner</label><select className="input" value={teamMembers.find((member) => member.user_id === prospect.assigned_user_id || member.email === prospect.assigned_email)?.id ?? (prospect.assigned_user_id === user.id ? "self" : "")} onChange={(event) => void handleProspectAssignment(event.target.value)}><option value="">Unassigned</option><option value="self">Me ({user.email})</option>{teamMembers.filter((member) => member.user_id !== user.id && member.email !== user.email).map((member) => <option key={member.id} value={member.id}>{member.email} · {member.role}</option>)}</select></div> : null}
            </div>

            <div className="formGroup"><label className="label">Notes</label><textarea className="input" rows={9} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Decision criteria, pain points, client-work context, objections, and next steps..." /></div>
            </div>

            <section className="prospectOpsPanel proposalWorkflowPanel" hidden={detailView !== "followup"}>
              <div className="proposalWorkflowHeader">
                <div><span className="miniBadge">Follow-up sequence</span><h2 className="cardTitle">{nextProposalTask ? "Next message to send" : "Start a client-work sequence"}</h2><p className="small">{nextProposalTask ? "Work through the active reminders for this lead. Opening a message loads the right template for the current step." : "Choose a reusable sequence, set the start date, and create reminders that keep this lead moving."}</p></div>
                {activeProposalTasks.length ? <span className="statusPill statusPillSuccess">{activeProposalTasks.length} reminder{activeProposalTasks.length === 1 ? "" : "s"} active</span> : <span className="statusPill">No sequence running</span>}
              </div>
              {!nextProposalTask ? <><div className="proposalWorkflowForm">
                <div className="formGroup proposalSequencePicker"><label className="label">Sequence</label>
                  <div className="proposalSelectedSequence">
                    <div>
                      <span className="miniBadge">{selectedScheduledSequence?.sourceLabel ?? "Not selected"}</span>
                      <strong>{selectedScheduledSequence?.name ?? "Choose a sequence"}</strong>
                      <p>{selectedScheduledSequence ? `${selectedScheduledSequence.steps.length} step${selectedScheduledSequence.steps.length === 1 ? "" : "s"}` : "Pick the sequence that fits this lead and the client work you want to win."}</p>
                    </div>
                    <button type="button" className="button buttonSecondary" onClick={() => setIsSequencePickerOpen((current) => !current)}>
                      {selectedScheduledSequence ? "Change" : "Choose"}
                    </button>
                  </div>
                  {isSequencePickerOpen ? (
                    <div className="proposalSequenceChooser">
                      <div className="proposalSequencePickerActions">
                        <input className="input" value={sequenceSearch} onChange={(event) => setSequenceSearch(event.target.value)} placeholder="Search by name, source, or step" />
                        <button type="button" className="button buttonUtility" onClick={() => { setIsSequencePickerOpen(false); setSequenceSearch(""); }}>
                          Close
                        </button>
                      </div>
                      <div className="proposalSequenceResults" aria-label="Sequence results">
                        {filteredScheduledSequences.map((sequence) => (
                          <button key={sequence.id} type="button" className={sequence.id === selectedSequenceId ? "proposalSequenceOption isSelected" : "proposalSequenceOption"} onClick={() => { setSelectedSequenceId(sequence.id); setSequenceSearch(""); setIsSequencePickerOpen(false); }} aria-pressed={sequence.id === selectedSequenceId}>
                            <span>
                              <strong>{sequence.name}</strong>
                              <small>{sequence.sourceLabel} - {sequence.steps.length} step{sequence.steps.length === 1 ? "" : "s"}</small>
                            </span>
                            <span className="miniBadge">{sequence.id === selectedSequenceId ? "Selected" : "Use"}</span>
                          </button>
                        ))}
                        {filteredScheduledSequences.length === 0 ? <div className="proposalSequenceEmpty">No matching sequences.</div> : null}
                      </div>
                    </div>
                  ) : null}
                  <p className="small" style={{ margin: "6px 0 0" }}>{selectedScheduledSequence ? "This sequence will create the reminders below from the start date." : "Nothing is preselected for this lead."}</p>
                </div>
                <div className="formGroup"><label className="label">Start date</label><input className="input" type="date" value={proposalSentDate} onChange={(event) => setProposalSentDate(event.target.value)} /></div>
                <div className="formGroup"><label className="label">Assigned to</label>{prospect?.workspace_id ? <select className="input" value={taskAssignee} onChange={(event) => setTaskAssignee(event.target.value)}><option value="">Unassigned</option><option value={user.email ?? ""}>Me ({user.email})</option>{teamMembers.filter((member) => member.email !== user.email).map((member) => <option key={member.id} value={member.email}>{member.email}</option>)}</select> : <input className="input" type="email" value={taskAssignee} onChange={(event) => setTaskAssignee(event.target.value)} placeholder="Assignee email" />}</div>
              </div>
              <div className="proposalWorkflowActions">
                <button className="button buttonPrimary" disabled={isStartingProposalWorkflow || !proposalSentDate || !selectedSequenceId} onClick={() => void handleStartProposalWorkflow()}>{isStartingProposalWorkflow ? "Starting..." : "Start sequence"}</button>
              </div></> : <>
                <div className="proposalNextMessage">
                  <div><span>{nextProposalTask.due_date ? `Due ${nextProposalTask.due_date}` : "Ready when you are"}</span><strong>{cleanFollowUpTaskTitle(nextProposalTask.title)}</strong><p>{activeProposalTasks.length > 1 ? `${activeProposalTasks.length - 1} later reminder${activeProposalTasks.length - 1 === 1 ? "" : "s"} already scheduled.` : "This is the final scheduled reminder."}</p></div>
                  <div className="proposalTaskActions"><button className="button buttonPrimary" onClick={() => handleDraftProposalFollowUp(nextProposalTask)}>Open message</button><button className="button buttonSecondary" onClick={() => void handleCompleteProposalTask(nextProposalTask)}>Mark sent</button></div>
                </div>
                <div className="proposalWorkflowActions proposalOutcomeActions"><span>Close this schedule</span><button className="button buttonSecondary" disabled={isStartingProposalWorkflow} onClick={() => void handleProposalOutcome("replied")}>They replied</button><button className="button buttonSecondary" disabled={isStartingProposalWorkflow} onClick={() => void handleProposalOutcome("won")}>Booked client work</button><button className="button buttonUtility" disabled={isStartingProposalWorkflow} onClick={() => void handleProposalOutcome("lost")}>Lost / slipped</button></div>
              </>}
            </section>

            <div className={detailView === "overview" ? "prospectOpsGrid isHidden" : "prospectOpsGrid prospectOpsGridSingle"}>
              <section className="prospectOpsPanel" hidden={detailView !== "followup"}>
                <div className="prospectSectionHeader"><h2 className="cardTitle">Lead actions and reminders</h2></div>
                <p className="small">Only open actions appear here. Completed work is archived automatically so the list stays focused on what could move the lead forward.</p>
                <div className="formGroup"><label className="label">Next action</label><input className="input" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Send case study, call decision-maker..." /></div>
                <div className="prospectTaskForm">
                  <input className="input" type="date" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} aria-label="Task due date" />
                  {prospect?.workspace_id ? <select className="input" value={taskAssignee} onChange={(event) => setTaskAssignee(event.target.value)} aria-label="Task assignee"><option value="">Unassigned</option><option value={user.email ?? ""}>Me ({user.email})</option>{teamMembers.filter((member) => member.email !== user.email).map((member) => <option key={member.id} value={member.email}>{member.email}</option>)}</select> : <input className="input" type="email" value={taskAssignee} onChange={(event) => setTaskAssignee(event.target.value)} placeholder="Assignee email" aria-label="Task assignee" />}
                  <button className="button buttonPrimary" disabled={!taskTitle.trim()} onClick={() => void handleAddTask()}>Add action</button>
                </div>
                <div className="prospectTaskList">
                  {openManualTasks.map((task) => (
                    <div key={task.id} className="prospectTask">
                      <input type="checkbox" checked={false} onChange={() => void handleTaskToggle(task)} aria-label={`Complete ${getProspectTaskDisplayTitle(task.title)}`} />
                      <div><strong>{getProspectTaskDisplayTitle(task.title)}</strong><span>{task.due_date ? `Due ${task.due_date}` : "No due date"}{task.assigned_email ? ` · ${task.assigned_email}` : ""}</span></div>
                      <button className="button buttonUtility" onClick={() => void handleTaskDelete(task.id)} aria-label={`Delete ${getProspectTaskDisplayTitle(task.title)}`}>Remove</button>
                    </div>
                  ))}
                  {openManualTasks.length === 0 ? <p className="small">No open lead actions.</p> : null}
                </div>
              </section>

              <section className="prospectOpsPanel" hidden={detailView !== "activity"}>
                <div className="prospectActivityHeading"><div><h2 className="cardTitle">Activity timeline</h2><p className="small">Useful shows outreach and client-work outcomes. Routine edits stay hidden unless you choose All activity.</p></div><select className="input" value={activityFilter} onChange={(event) => { setActivityFilter(event.target.value as "useful" | "outreach" | "notes" | "all"); setShowAllActivity(false); }} aria-label="Filter lead activity"><option value="useful">Useful activity</option><option value="outreach">Outreach only</option><option value="notes">Notes only</option><option value="all">All activity</option></select></div>
                <div className="prospectActivityForm">
                  <select className="input" value={activityType} onChange={(event) => setActivityType(event.target.value as ProspectActivityType)} aria-label="Activity type">
                    <option value="note">Note</option><option value="email">Email</option><option value="call">Call</option><option value="meeting">Meeting</option>
                  </select>
                  <input className="input" value={activitySummary} onChange={(event) => setActivitySummary(event.target.value)} placeholder="What happened?" />
                  <button className="button buttonPrimary" disabled={!activitySummary.trim()} onClick={() => void handleAddActivity()}>Log</button>
                </div>
                <div className="prospectTimeline">
                  {visibleActivities.map((activity) => (
                    <div key={activity.id} className="prospectTimelineItem">
                      <span className="miniBadge">{activity.activity_type}</span>
                      <div><strong>{activity.summary}</strong><p className="small">{activity.actor_email || "Teammate"} · {new Date(activity.created_at).toLocaleString()}</p></div>
                    </div>
                  ))}
                  {filteredActivities.length === 0 ? <p className="small">No activity matches this view.</p> : null}
                </div>
                {filteredActivities.length > 8 ? <button className="button buttonSecondary prospectActivityMore" onClick={() => setShowAllActivity((current) => !current)}>{showAllActivity ? "Show recent only" : `Show ${filteredActivities.length - 8} more`}</button> : null}
              </section>
            </div>

            {prospect?.workspace_id ? <section className="prospectOpsPanel prospectCommentsPanel" hidden={detailView !== "activity"}>
              <div className="prospectSectionHeader"><h2 className="cardTitle">Team comments</h2></div>
              <p className="small">Mention a teammate using their full email, for example @{teamMembers[0]?.email || "teammate@company.com"}.</p>
              <textarea className="input" rows={3} value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder="Add context, ask a question, or mention a teammate..." />
              <button className="button buttonPrimary" disabled={!commentBody.trim()} onClick={() => void handleAddComment()}>Add comment</button>
              <div className="prospectTimeline">
                {comments.slice(0, 8).map((comment) => <div key={comment.id} className="prospectTimelineItem"><span className="miniBadge">Comment</span><div><strong>{comment.author_email || "Teammate"}</strong><p className="muted" style={{ whiteSpace: "pre-wrap", margin: "4px 0" }}>{comment.body}</p><p className="small">{new Date(comment.created_at).toLocaleString()}</p></div></div>)}
                {comments.length === 0 ? <p className="small">No comments yet.</p> : null}
              </div>
            </section> : null}

            <div className="toolbar" hidden={detailView !== "overview"}>
              <button className="button buttonPrimary" disabled={isWorking} onClick={() => void save()} title="Save changes to this lead without recording a new contact">{isWorking ? "Saving..." : "Save lead"}</button>
              <button className="button buttonSecondary" disabled={isWorking} onClick={() => void save({ markContacted: true })} title="Save changes and record that you contacted this lead now">Log contact now</button>
              <button className="button buttonUtility" disabled={isWorking} onClick={() => void handleDelete()}>Delete lead</button>
            </div>
            <p className="prospectActionHelp" hidden={detailView !== "overview"}>
              <strong>Save lead</strong> stores your edits. <strong>Log contact now</strong> records the latest touch so this lead does not look warmer than it is; it does not send a message.
            </p>
          </section>

          <aside className="prospectActionPanel">
            <h2 className="cardTitle">Next best move</h2>
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
              Turn the account context into a relevant message, then come back to log the touch and schedule the next follow-up.
            </p>
            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              <button className="button buttonPrimary" onClick={handleDraftOutreach}>Draft next message</button>
              {email ? <a className="button buttonSecondary" href={`mailto:${encodeURIComponent(email)}`}>Email {fullName || "lead"}</a> : null}
              {linkedinUrl ? <a className="button buttonSecondary" href={linkedinUrl} target="_blank" rel="noreferrer">Open LinkedIn</a> : null}
            </div>
            <div className="prospectContextBlock">
              <span>Client work stage</span><strong>{PROSPECT_STAGE_LABELS[stage]}</strong>
              <span>Next follow-up</span><strong>{nextFollowUp || "Not scheduled"}</strong>
              <span>Assigned to</span><strong>{prospect?.assigned_email || "Unassigned"}</strong>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
