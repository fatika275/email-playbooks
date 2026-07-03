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

export type Prospect = {
  id: string;
  owner_id: string;
  workspace_id: string | null;
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

export type ProspectActivityType = "note" | "email" | "call" | "meeting" | "status";

export type ProspectActivity = {
  id: string;
  prospect_id: string;
  created_by: string;
  activity_type: ProspectActivityType;
  summary: string;
  created_at: string;
};

export type ProspectTask = {
  id: string;
  prospect_id: string;
  created_by: string;
  title: string;
  due_date: string | null;
  assigned_email: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
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

export async function createProspectTask(options: {
  prospectId: string;
  userId: string;
  title: string;
  dueDate?: string;
  assignedEmail?: string;
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
      assigned_email: optional(options.assignedEmail),
    })
    .select("*")
    .single();
  if (error) throw prospectError(error);
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
