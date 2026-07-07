import { getSupabaseBrowserClient } from "@/lib/supabase";

export const PROSPECT_STAGES = [
  "new",
  "researching",
  "contacted",
  "replied",
  "qualified",
  "meeting",
  "won",
  "lost",
] as const;

export type ProspectStage = (typeof PROSPECT_STAGES)[number];

export const PROSPECT_STAGE_LABELS: Record<ProspectStage, string> = {
  new: "New",
  researching: "Researching",
  contacted: "Contacted",
  replied: "Replied",
  qualified: "Qualified",
  meeting: "Meeting",
  won: "Won",
  lost: "Lost",
};

export type ForecastValueBasis = "fixed" | "monthly" | "annual";
export type StageProbabilities = Record<ProspectStage, number>;

export const DEFAULT_STAGE_PROBABILITIES: StageProbabilities = {
  new: 5,
  researching: 10,
  contacted: 20,
  replied: 35,
  qualified: 55,
  meeting: 75,
  won: 100,
  lost: 0,
};

export type ForecastSettings = {
  id?: string;
  owner_id: string;
  workspace_id: string | null;
  value_basis: ForecastValueBasis;
  default_months: number;
  stage_probabilities: StageProbabilities;
};

export type Prospect = {
  id: string;
  owner_id: string;
  workspace_id: string | null;
  assigned_user_id: string | null;
  assigned_email: string | null;
  full_name: string;
  company: string;
  email: string | null;
  role: string | null;
  linkedin_url: string | null;
  source: string | null;
  stage: ProspectStage;
  estimated_value_gbp: number;
  notes: string | null;
  next_follow_up: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProspectInput = {
  full_name: string;
  company: string;
  email?: string;
  role?: string;
  linkedin_url?: string;
  source?: string;
  stage?: ProspectStage;
  estimated_value_gbp?: number;
  notes?: string;
  next_follow_up?: string;
  last_contacted_at?: string | null;
};

export type ProspectActivityType = "note" | "email" | "call" | "meeting" | "status" | "update";

const TASK_MESSAGE_REF_PATTERN = /\s*\[\[thalovo:([^/\]]+)\/([^\]]+)\]\]$/;

export function getProspectTaskDisplayTitle(title: string) {
  return title.replace(TASK_MESSAGE_REF_PATTERN, "");
}

export function getProspectTaskMessageRef(title: string) {
  const match = title.match(TASK_MESSAGE_REF_PATTERN);
  return match ? { playbookId: match[1], templateId: match[2] } : null;
}

export type ProspectActivity = {
  id: string;
  prospect_id: string;
  created_by: string;
  activity_type: ProspectActivityType;
  summary: string;
  actor_email: string | null;
  created_at: string;
};

export type WorkspaceProspectActivity = ProspectActivity & {
  prospects: {
    id: string;
    full_name: string;
    company: string;
  };
};

export type ProspectComment = {
  id: string;
  prospect_id: string;
  author_id: string;
  author_email: string | null;
  body: string;
  created_at: string;
};

export type ProspectTask = {
  id: string;
  prospect_id: string;
  created_by: string;
  title: string;
  due_date: string | null;
  assigned_user_id: string | null;
  assigned_email: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OverdueWorkspaceTask = ProspectTask & {
  prospects: { id: string; full_name: string; company: string };
};

function prospectError(error: { code?: string; message?: string } | null) {
  if (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    error?.message?.toLowerCase().includes("prospects")
  ) {
    return new Error(
      "Prospect Pipeline needs its one-time Supabase setup before it can save leads."
    );
  }
  return new Error(error?.message || "Prospect management is temporarily unavailable.");
}

function optional(value?: string) {
  return value?.trim() || null;
}

function normalizeProbabilities(value: unknown): StageProbabilities {
  const record =
    typeof value === "object" && value !== null
      ? (value as Partial<Record<ProspectStage, unknown>>)
      : {};
  return Object.fromEntries(
    PROSPECT_STAGES.map((stage) => {
      const probability = Number(record[stage]);
      return [
        stage,
        Number.isFinite(probability)
          ? Math.min(100, Math.max(0, probability))
          : DEFAULT_STAGE_PROBABILITIES[stage],
      ];
    })
  ) as StageProbabilities;
}

export async function getForecastSettings(options: {
  userId: string;
  workspaceId?: string | null;
}) {
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  let query = client.from("forecast_settings").select("*");
  query = options.workspaceId
    ? query.eq("workspace_id", options.workspaceId)
    : query.eq("owner_id", options.userId).is("workspace_id", null);
  const { data, error } = await query.maybeSingle();
  if (error) {
    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      error.message?.toLowerCase().includes("forecast_settings")
    ) {
      return null;
    }
    throw prospectError(error);
  }
  if (!data) return null;
  return {
    ...data,
    stage_probabilities: normalizeProbabilities(data.stage_probabilities),
  } as ForecastSettings;
}

export async function saveForecastSettings(settings: ForecastSettings) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Sign in before changing forecast settings.");
  const payload = {
    owner_id: settings.owner_id,
    workspace_id: settings.workspace_id,
    value_basis: settings.value_basis,
    default_months: Math.min(60, Math.max(1, settings.default_months)),
    stage_probabilities: normalizeProbabilities(settings.stage_probabilities),
    updated_at: new Date().toISOString(),
  };
  const existing = await getForecastSettings({
    userId: settings.owner_id,
    workspaceId: settings.workspace_id,
  });
  const request = existing?.id
    ? client.from("forecast_settings").update(payload).eq("id", existing.id)
    : client.from("forecast_settings").insert(payload);
  const { data, error } = await request.select("*").single();
  if (error) throw prospectError(error);
  return {
    ...data,
    stage_probabilities: normalizeProbabilities(data.stage_probabilities),
  } as ForecastSettings;
}

export async function listProspects(options: {
  userId: string;
  workspaceId?: string | null;
}) {
  const client = getSupabaseBrowserClient();
  if (!client) return [];

  let query = client.from("prospects").select("*");
  query = options.workspaceId
    ? query.eq("workspace_id", options.workspaceId)
    : query.eq("owner_id", options.userId).is("workspace_id", null);

  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) throw prospectError(error);
  return (data ?? []) as Prospect[];
}

export async function getProspect(id: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { data, error } = await client
    .from("prospects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw prospectError(error);
  return data as Prospect | null;
}

export async function createProspect(options: {
  userId: string;
  workspaceId?: string | null;
  input: ProspectInput;
}) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Sign in before adding a prospect.");
  const input = options.input;
  const { data, error } = await client
    .from("prospects")
    .insert({
      owner_id: options.userId,
      workspace_id: options.workspaceId ?? null,
      full_name: input.full_name.trim(),
      company: input.company.trim(),
      email: optional(input.email),
      role: optional(input.role),
      linkedin_url: optional(input.linkedin_url),
      source: optional(input.source),
      stage: input.stage ?? "new",
      estimated_value_gbp: Math.max(0, input.estimated_value_gbp ?? 0),
      notes: optional(input.notes),
      next_follow_up: optional(input.next_follow_up),
      last_contacted_at: input.last_contacted_at ?? null,
    })
    .select("*")
    .single();
  if (error) throw prospectError(error);
  return data as Prospect;
}

export async function createProspectsBatch(options: {
  userId: string;
  workspaceId?: string | null;
  inputs: ProspectInput[];
}) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Sign in before importing prospects.");
  const rows = options.inputs.map((input) => ({
    owner_id: options.userId,
    workspace_id: options.workspaceId ?? null,
    full_name: input.full_name.trim(),
    company: input.company.trim(),
    email: optional(input.email),
    role: optional(input.role),
    linkedin_url: optional(input.linkedin_url),
    source: optional(input.source),
    stage: input.stage ?? "new",
    estimated_value_gbp: Math.max(0, input.estimated_value_gbp ?? 0),
    notes: optional(input.notes),
    next_follow_up: optional(input.next_follow_up),
  }));
  const { data, error } = await client.from("prospects").insert(rows).select("*");
  if (error) throw prospectError(error);
  return (data ?? []) as Prospect[];
}

export async function updateProspect(id: string, input: ProspectInput) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Sign in before updating a prospect.");
  const { data, error } = await client
    .from("prospects")
    .update({
      full_name: input.full_name.trim(),
      company: input.company.trim(),
      email: optional(input.email),
      role: optional(input.role),
      linkedin_url: optional(input.linkedin_url),
      source: optional(input.source),
      stage: input.stage ?? "new",
      estimated_value_gbp: Math.max(0, input.estimated_value_gbp ?? 0),
      notes: optional(input.notes),
      next_follow_up: optional(input.next_follow_up),
      last_contacted_at: input.last_contacted_at ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw prospectError(error);
  return data as Prospect;
}

export async function updateProspectStage(id: string, stage: ProspectStage) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Sign in before updating a prospect.");
  const updates: Record<string, string> = {
    stage,
    updated_at: new Date().toISOString(),
  };
  if (stage === "contacted") updates.last_contacted_at = new Date().toISOString();
  const { error } = await client.from("prospects").update(updates).eq("id", id);
  if (error) throw prospectError(error);
}

export async function updateProspectAssignment(options: {
  id: string;
  userId?: string | null;
  email?: string | null;
  actorId?: string;
}) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Sign in before assigning a prospect.");
  const { data, error } = await client
    .from("prospects")
    .update({
      assigned_user_id: options.userId ?? null,
      assigned_email: options.email?.trim().toLowerCase() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", options.id)
    .select("*")
    .single();
  if (error) throw prospectError(error);
  if (data.workspace_id && options.userId && options.actorId && options.userId !== options.actorId) {
    const { error: notificationError } = await client.from("workspace_notifications").insert({ workspace_id: data.workspace_id, recipient_user_id: options.userId, actor_id: options.actorId, kind: "assignment", title: `Prospect assigned: ${data.full_name}`, body: data.company, href: `/prospects/${data.id}` });
    if (notificationError) throw prospectError(notificationError);
  }
  return data as Prospect;
}

export async function deleteProspect(id: string) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Sign in before deleting a prospect.");
  const { error } = await client.from("prospects").delete().eq("id", id);
  if (error) throw prospectError(error);
}

export async function listProspectActivities(prospectId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return [];
  const { data, error } = await client
    .from("prospect_activities")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false });
  if (error) throw prospectError(error);
  return (data ?? []) as ProspectActivity[];
}

export async function listProspectActivitiesForProspects(prospectIds: string[]) {
  const client = getSupabaseBrowserClient();
  if (!client || prospectIds.length === 0) return [];
  const { data, error } = await client
    .from("prospect_activities")
    .select("*")
    .in("prospect_id", prospectIds)
    .order("created_at", { ascending: false });
  if (error) throw prospectError(error);
  return (data ?? []) as ProspectActivity[];
}

export async function listProspectComments(prospectId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return [];
  const { data, error } = await client.from("prospect_comments").select("*").eq("prospect_id", prospectId).order("created_at", { ascending: false });
  if (error) throw prospectError(error);
  return (data ?? []) as ProspectComment[];
}

export async function createProspectComment(options: {
  prospectId: string;
  workspaceId: string;
  userId: string;
  userEmail?: string | null;
  body: string;
  members: Array<{ user_id: string | null; email: string }>;
}) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Sign in before commenting.");
  const { error } = await client.from("prospect_comments").insert({ prospect_id: options.prospectId, author_id: options.userId, author_email: options.userEmail ?? null, body: options.body.trim() });
  if (error) throw prospectError(error);
  const normalized = options.body.toLowerCase();
  const mentioned = options.members.filter((member) => member.user_id && normalized.includes(`@${member.email.toLowerCase()}`));
  if (mentioned.length) {
    const { error: notificationError } = await client.from("workspace_notifications").insert(mentioned.map((member) => ({ workspace_id: options.workspaceId, recipient_user_id: member.user_id, actor_id: options.userId, kind: "mention", title: "You were mentioned on a prospect", body: options.body.trim().slice(0, 240), href: `/prospects/${options.prospectId}` })));
    if (notificationError) throw prospectError(notificationError);
  }
}

export async function listWorkspaceProspectActivities(workspaceId: string, limit = 25) {
  const client = getSupabaseBrowserClient();
  if (!client) return [];
  const { data, error } = await client
    .from("prospect_activities")
    .select("*, prospects!inner(id, full_name, company, workspace_id)")
    .eq("prospects.workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw prospectError(error);
  return (data ?? []) as WorkspaceProspectActivity[];
}

export async function createProspectActivity(options: {
  prospectId: string;
  userId: string;
  activityType: ProspectActivityType;
  summary: string;
}) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Sign in before logging activity.");
  const { data, error } = await client
    .from("prospect_activities")
    .insert({
      prospect_id: options.prospectId,
      created_by: options.userId,
      activity_type: options.activityType,
      summary: options.summary.trim(),
    })
    .select("*")
    .single();
  if (error) throw prospectError(error);
  return data as ProspectActivity;
}

export async function listProspectTasks(prospectIds: string[]) {
  const client = getSupabaseBrowserClient();
  if (!client || prospectIds.length === 0) return [];
  const { data, error } = await client
    .from("prospect_tasks")
    .select("*")
    .in("prospect_id", prospectIds)
    .order("completed_at", { ascending: true, nullsFirst: true })
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw prospectError(error);
  return (data ?? []) as ProspectTask[];
}

export async function listMyOverdueWorkspaceTasks(workspaceId: string, userId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await client.from("prospect_tasks").select("*, prospects!inner(id, full_name, company, workspace_id)").eq("prospects.workspace_id", workspaceId).eq("assigned_user_id", userId).is("completed_at", null).lte("due_date", today).order("due_date");
  if (error) throw prospectError(error);
  return (data ?? []) as OverdueWorkspaceTask[];
}

export async function createProspectTask(options: {
  prospectId: string;
  userId: string;
  title: string;
  dueDate?: string;
  assignedEmail?: string;
  assignedUserId?: string | null;
  workspaceId?: string | null;
}) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Sign in before adding a task.");
  const { data, error } = await client
    .from("prospect_tasks")
    .insert({
      prospect_id: options.prospectId,
      created_by: options.userId,
      title: options.title.trim(),
      due_date: optional(options.dueDate),
      assigned_user_id: options.assignedUserId ?? null,
      assigned_email: optional(options.assignedEmail),
    })
    .select("*")
    .single();
  if (error) throw prospectError(error);
  if (options.workspaceId && options.assignedUserId && options.assignedUserId !== options.userId) {
    const { error: notificationError } = await client.from("workspace_notifications").insert({ workspace_id: options.workspaceId, recipient_user_id: options.assignedUserId, actor_id: options.userId, kind: "task", title: `Task assigned: ${getProspectTaskDisplayTitle(options.title.trim())}`, body: options.dueDate ? `Due ${options.dueDate}` : "No due date", href: `/prospects/${options.prospectId}` });
    if (notificationError) throw prospectError(notificationError);
  }
  return data as ProspectTask;
}

export async function setProspectTaskCompleted(id: string, completed: boolean) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Sign in before updating a task.");
  const { error } = await client
    .from("prospect_tasks")
    .update({
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw prospectError(error);
}

export async function deleteProspectTask(id: string) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Sign in before deleting a task.");
  const { error } = await client.from("prospect_tasks").delete().eq("id", id);
  if (error) throw prospectError(error);
}
