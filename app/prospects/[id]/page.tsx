"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "@/components/account-provider";
import { listBusinessMembers, type BusinessMember } from "@/lib/cloud";
import {
  createProspectActivity,
  createProspectComment,
  createProspectTask,
  deleteProspect,
  deleteProspectTask,
  getProspect,
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

export default function ProspectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, hasProAccess, isLoading } = useAccount();
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

  function handleDraftOutreach() {
    localStorage.setItem(
      "thalovo_prospect_context",
      JSON.stringify({ name: fullName, company, email, role, prospectId: id })
    );
    router.push("/library");
  }

  if (isLoading) {
    return <main className="main"><section className="container"><div className="glassCard emptyState">Loading prospect...</div></section></main>;
  }

  if (!user || !hasProAccess) {
    return (
      <main className="main"><section className="container"><div className="glassCard emptyState">
        <h1 className="pageTitle">Prospect access required</h1>
        <Link href={user ? "/pricing" : "/account"} className="button buttonPrimary">{user ? "View plans" : "Sign in"}</Link>
      </div></section></main>
    );
  }

  if (!prospect && notice) {
    return (
      <main className="main"><section className="container"><div className="glassCard emptyState">
        <h1 className="pageTitle">Prospect unavailable</h1><p className="muted">{notice}</p><Link href="/prospects" className="button buttonPrimary">Back to pipeline</Link>
      </div></section></main>
    );
  }

  return (
    <main className="main">
      <section className="container">
        <div className="prospectHeader">
          <div>
            <div className="badge">Prospect workspace</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>{fullName || "Prospect"}</h1>
            <p className="muted" style={{ margin: "8px 0 0" }}>{company || "Loading company..."}</p>
          </div>
          <Link href="/prospects" className="button buttonSecondary">Back to pipeline</Link>
        </div>

        {notice ? <p className="notice">{notice}</p> : null}

        <div className="prospectDetailLayout">
          <section className="prospectDetailMain">
            <div className="prospectSectionHeader"><h2 className="cardTitle">Contact and company</h2></div>
            <div className="prospectFormGrid">
              <div className="formGroup"><label className="label">Name</label><input className="input" value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
              <div className="formGroup"><label className="label">Company</label><input className="input" value={company} onChange={(event) => setCompany(event.target.value)} /></div>
              <div className="formGroup"><label className="label">Work email</label><input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
              <div className="formGroup"><label className="label">Role</label><input className="input" value={role} onChange={(event) => setRole(event.target.value)} /></div>
              <div className="formGroup"><label className="label">LinkedIn URL</label><input className="input" type="url" value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} placeholder="https://linkedin.com/in/..." /></div>
              <div className="formGroup"><label className="label">Lead source</label><input className="input" value={source} onChange={(event) => setSource(event.target.value)} placeholder="Referral, LinkedIn, event..." /></div>
            </div>

            <div className="prospectSectionHeader"><h2 className="cardTitle">Qualification and follow-up</h2></div>
            <div className="prospectFormGrid">
              <div className="formGroup"><label className="label">Pipeline stage</label><select className="input" value={stage} onChange={(event) => setStage(event.target.value as ProspectStage)}>{PROSPECT_STAGES.map((option) => <option key={option} value={option}>{PROSPECT_STAGE_LABELS[option]}</option>)}</select></div>
              <div className="formGroup"><label className="label">Stored contract value (GBP)</label><input className="input" type="number" min="0" value={value} onChange={(event) => setValue(event.target.value)} /><p className="small" style={{ margin: "6px 0 0" }}>Use the full fixed, calculated monthly, or annual value defined by your forecast model.</p></div>
              <div className="formGroup"><label className="label">Next follow-up</label><input className="input" type="date" value={nextFollowUp} onChange={(event) => setNextFollowUp(event.target.value)} /></div>
              <div className="formGroup"><label className="label">Last contacted</label><input className="input" value={lastContactedAt ? new Date(lastContactedAt).toLocaleString() : "Not contacted yet"} disabled /></div>
              {prospect?.workspace_id ? <div className="formGroup"><label className="label">Prospect owner</label><select className="input" value={teamMembers.find((member) => member.user_id === prospect.assigned_user_id || member.email === prospect.assigned_email)?.id ?? (prospect.assigned_user_id === user.id ? "self" : "")} onChange={(event) => void handleProspectAssignment(event.target.value)}><option value="">Unassigned</option><option value="self">Me ({user.email})</option>{teamMembers.filter((member) => member.user_id !== user.id && member.email !== user.email).map((member) => <option key={member.id} value={member.id}>{member.email} · {member.role}</option>)}</select></div> : null}
            </div>

            <div className="formGroup"><label className="label">Notes</label><textarea className="input" rows={9} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Decision criteria, pain points, context, objections, and next steps..." /></div>

            <div className="prospectOpsGrid">
              <section className="prospectOpsPanel">
                <div className="prospectSectionHeader"><h2 className="cardTitle">Tasks and reminders</h2></div>
                <div className="formGroup"><label className="label">Next task</label><input className="input" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Send case study, call decision-maker..." /></div>
                <div className="prospectTaskForm">
                  <input className="input" type="date" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} aria-label="Task due date" />
                  {prospect?.workspace_id ? <select className="input" value={taskAssignee} onChange={(event) => setTaskAssignee(event.target.value)} aria-label="Task assignee"><option value="">Unassigned</option><option value={user.email ?? ""}>Me ({user.email})</option>{teamMembers.filter((member) => member.email !== user.email).map((member) => <option key={member.id} value={member.email}>{member.email}</option>)}</select> : <input className="input" type="email" value={taskAssignee} onChange={(event) => setTaskAssignee(event.target.value)} placeholder="Assignee email" aria-label="Task assignee" />}
                  <button className="button buttonPrimary" disabled={!taskTitle.trim()} onClick={() => void handleAddTask()}>Add task</button>
                </div>
                <div className="prospectTaskList">
                  {tasks.map((task) => (
                    <div key={task.id} className={task.completed_at ? "prospectTask isComplete" : "prospectTask"}>
                      <input type="checkbox" checked={Boolean(task.completed_at)} onChange={() => void handleTaskToggle(task)} aria-label={`Complete ${task.title}`} />
                      <div><strong>{task.title}</strong><span>{task.due_date ? `Due ${task.due_date}` : "No due date"}{task.assigned_email ? ` · ${task.assigned_email}` : ""}</span></div>
                      <button className="button buttonUtility" onClick={() => void handleTaskDelete(task.id)} aria-label={`Delete ${task.title}`}>Remove</button>
                    </div>
                  ))}
                  {tasks.length === 0 ? <p className="small">No tasks yet.</p> : null}
                </div>
              </section>

              <section className="prospectOpsPanel">
                <div className="prospectSectionHeader"><h2 className="cardTitle">Activity timeline</h2></div>
                <div className="prospectActivityForm">
                  <select className="input" value={activityType} onChange={(event) => setActivityType(event.target.value as ProspectActivityType)} aria-label="Activity type">
                    <option value="note">Note</option><option value="email">Email</option><option value="call">Call</option><option value="meeting">Meeting</option>
                  </select>
                  <input className="input" value={activitySummary} onChange={(event) => setActivitySummary(event.target.value)} placeholder="What happened?" />
                  <button className="button buttonPrimary" disabled={!activitySummary.trim()} onClick={() => void handleAddActivity()}>Log</button>
                </div>
                <div className="prospectTimeline">
                  {activities.map((activity) => (
                    <div key={activity.id} className="prospectTimelineItem">
                      <span className="miniBadge">{activity.activity_type}</span>
                      <div><strong>{activity.summary}</strong><p className="small">{activity.actor_email || "Teammate"} · {new Date(activity.created_at).toLocaleString()}</p></div>
                    </div>
                  ))}
                  {activities.length === 0 ? <p className="small">No activity logged yet.</p> : null}
                </div>
              </section>
            </div>

            {prospect?.workspace_id ? <section className="prospectOpsPanel prospectCommentsPanel">
              <div className="prospectSectionHeader"><h2 className="cardTitle">Team comments</h2></div>
              <p className="small">Mention a teammate using their full email, for example @{teamMembers[0]?.email || "teammate@company.com"}.</p>
              <textarea className="input" rows={3} value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder="Add context, ask a question, or mention a teammate..." />
              <button className="button buttonPrimary" disabled={!commentBody.trim()} onClick={() => void handleAddComment()}>Add comment</button>
              <div className="prospectTimeline">
                {comments.map((comment) => <div key={comment.id} className="prospectTimelineItem"><span className="miniBadge">Comment</span><div><strong>{comment.author_email || "Teammate"}</strong><p className="muted" style={{ whiteSpace: "pre-wrap", margin: "4px 0" }}>{comment.body}</p><p className="small">{new Date(comment.created_at).toLocaleString()}</p></div></div>)}
                {comments.length === 0 ? <p className="small">No comments yet.</p> : null}
              </div>
            </section> : null}

            <div className="toolbar">
              <button className="button buttonPrimary" disabled={isWorking} onClick={() => void save()} title="Save changes to this prospect without recording a new contact">{isWorking ? "Saving..." : "Save prospect"}</button>
              <button className="button buttonSecondary" disabled={isWorking} onClick={() => void save({ markContacted: true })} title="Save changes and record that you contacted this prospect now">Log contact now</button>
              <button className="button buttonUtility" disabled={isWorking} onClick={() => void handleDelete()}>Delete prospect</button>
            </div>
            <p className="prospectActionHelp">
              <strong>Save prospect</strong> stores your edits. <strong>Log contact now</strong> also records the current time as your latest contact and adds it to the activity timeline; it does not send a message.
            </p>
          </section>

          <aside className="prospectActionPanel">
            <h2 className="cardTitle">Next action</h2>
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
              Move from account context into a relevant message, then return here to log the contact and schedule follow-up.
            </p>
            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              <button className="button buttonPrimary" onClick={handleDraftOutreach}>Draft outreach</button>
              {email ? <a className="button buttonSecondary" href={`mailto:${encodeURIComponent(email)}`}>Email {fullName || "prospect"}</a> : null}
              {linkedinUrl ? <a className="button buttonSecondary" href={linkedinUrl} target="_blank" rel="noreferrer">Open LinkedIn</a> : null}
            </div>
            <div className="prospectContextBlock">
              <span>Current stage</span><strong>{PROSPECT_STAGE_LABELS[stage]}</strong>
              <span>Next follow-up</span><strong>{nextFollowUp || "Not scheduled"}</strong>
              <span>Assigned to</span><strong>{prospect?.assigned_email || "Unassigned"}</strong>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
