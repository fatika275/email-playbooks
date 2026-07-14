import type { User } from "@supabase/supabase-js";
import {
  getCustomTemplates,
  getEmails,
  replaceCustomTemplates,
  replaceEmails,
  saveCustomTemplate,
  saveEmail,
  type CustomTemplate,
  type SavedEmail,
} from "@/lib/storage";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { normalizePlan, type PlanId } from "@/lib/plans";

type CloudSavedEmailRow = {
  id: string;
  user_id: string;
  playbook_id: string;
  template_id: string;
  template_label: string;
  subject: string;
  body: string;
  tags: string[];
  folder: string | null;
  is_favorite: boolean;
  created_at: string;
};

type CloudCustomTemplateRow = {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  body: string;
  source_playbook_id: string;
  source_template_id: string;
  sequence_steps?: CustomTemplate["sequenceSteps"] | null;
  tags: string[];
  folder: string | null;
  is_favorite: boolean;
  created_at: string;
};

export type CloudProfile = {
  user_id: string;
  email: string | null;
  plan?: PlanId | null;
  founder_eligible: boolean;
  founder_price_gbp: number | null;
};

export type CloudAdminProfile = CloudProfile & {
  created_at: string;
};

export type FounderWaitlistEntry = {
  id: string;
  email: string;
  user_id: string | null;
  source: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type TeamShareAssetType = "email" | "sequence";

export type TeamShare = {
  id: string;
  owner_id: string;
  owner_email: string;
  recipient_email: string;
  asset_type: TeamShareAssetType;
  source_id: string;
  title: string;
  subject: string;
  body: string;
  created_at: string;
};

export type BusinessWorkspace = {
  id: string;
  owner_id: string;
  name: string;
  status: "active" | "inactive";
  seat_limit: number;
  created_at: string;
};

export type BusinessMember = {
  id: string;
  workspace_id: string;
  email: string;
  user_id: string | null;
  role: "admin" | "member";
  custom_role_id?: string | null;
  status: "invited" | "active";
  access_active: boolean;
  created_at: string;
};

export type WorkspaceRole = {
  id: string;
  workspace_id: string;
  name: string;
  can_manage_members: boolean;
  can_manage_pipeline: boolean;
  can_export_data: boolean;
  created_at: string;
};

export type WorkspaceNotification = {
  id: string;
  workspace_id: string;
  recipient_user_id: string;
  actor_id: string | null;
  kind: "mention" | "assignment" | "task" | "overdue";
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export type BusinessWorkspaceAccess = BusinessWorkspace & {
  access_role: "owner" | "admin" | "member";
};

function normalizeCloudError(error: unknown) {
  if (!(error instanceof Error)) {
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
    ) {
      const message = ((error as { message: string }).message || "").toLowerCase();

      if (
        message.includes("token") ||
        message.includes("otp") ||
        message.includes("verification")
      ) {
        return new Error(
          "That verification code is wrong or has expired. Check the code and try again."
        );
      }

      if (message.includes("relation") && message.includes("does not exist")) {
        return new Error(
          "Cloud sync is temporarily unavailable. Your work is still saved on this device."
        );
      }

      if (message.includes("row-level security")) {
        return new Error(
          "Cloud sync is temporarily unavailable. Please try again later."
        );
      }

      if (message.includes("duplicate key")) {
        return new Error(
          "Some saved items are colliding during sync. Refresh and try again."
        );
      }

      return new Error((error as { message: string }).message);
    }

    return new Error("Something went wrong while contacting cloud sync.");
  }

  const message = error.message.toLowerCase();

  if (
    message.includes("token") ||
    message.includes("otp") ||
    message.includes("verification")
  ) {
    return new Error(
      "That verification code is wrong or has expired. Check the code and try again."
    );
  }

  if (message.includes("relation") && message.includes("does not exist")) {
    return new Error(
      "Cloud sync is temporarily unavailable. Your work is still saved on this device."
    );
  }

  if (message.includes("row-level security")) {
    return new Error(
      "Cloud sync is temporarily unavailable. Please try again later."
    );
  }

  if (message.includes("duplicate key")) {
    return new Error(
      "Some saved items are colliding during sync. Refresh and try again."
    );
  }

  return error;
}

function isMissingSequenceStepsColumn(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "PGRST204" ||
        error.message?.toLowerCase().includes("sequence_steps"))
  );
}

function getPasswordValidationMessage(password: string) {
  if (password.length < 8) {
    return "Use at least 8 characters for your password.";
  }
  if (!/[A-Za-z]/.test(password)) {
    return "Add at least one letter to your password.";
  }
  if (!/[0-9]/.test(password)) {
    return "Add at least one number to your password.";
  }
  return "";
}

export async function signUpWithPassword(email: string, password: string) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Sign-in is temporarily unavailable. Please try again later.");
  }

  const passwordMessage = getPasswordValidationMessage(password);
  if (passwordMessage) {
    throw new Error(passwordMessage);
  }

  const { data, error } = await client.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/account`
          : undefined,
    },
  });

  if (error) throw normalizeCloudError(error);

  if (data.user && data.user.identities?.length === 0) {
    throw new Error(
      "An account already exists for this email. Use Log in instead."
    );
  }

  return { needsVerification: !data.session };
}

export async function signInWithPassword(email: string, password: string) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Sign-in is temporarily unavailable. Please try again later.");
  }

  const { error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw normalizeCloudError(error);
}

export async function verifySignupCode(email: string, token: string) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Sign-in is temporarily unavailable. Please try again later.");
  }

  const { error } = await client.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: "signup",
  });

  if (error) throw normalizeCloudError(error);
}

export async function resendSignupVerification(email: string) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Email verification is temporarily unavailable.");
  }

  const { error } = await client.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/account`
          : undefined,
    },
  });

  if (error) throw normalizeCloudError(error);
}

export async function requestPasswordReset(email: string) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Password recovery is temporarily unavailable.");
  }

  const { error } = await client.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined,
    }
  );

  if (error) throw normalizeCloudError(error);
}

export async function updatePassword(password: string) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Password recovery is temporarily unavailable.");
  }

  const passwordMessage = getPasswordValidationMessage(password);
  if (passwordMessage) {
    throw new Error(passwordMessage);
  }

  const { error } = await client.auth.updateUser({ password });
  if (error) throw normalizeCloudError(error);
}

export async function signOutFromCloud() {
  const client = getSupabaseBrowserClient();
  if (!client) return;

  const { error } = await client.auth.signOut();
  if (error) throw normalizeCloudError(error);
}

export async function getSignedInUser() {
  const client = getSupabaseBrowserClient();
  if (!client) return null;

  const {
    data: { user },
  } = await client.auth.getUser();

  return user;
}

export async function getCloudProfile(userId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return null;

  const { data, error } = await client
    .from("user_profiles")
    .select("user_id, email, plan, founder_eligible, founder_price_gbp")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw normalizeCloudError(error);
  return data
    ? ({ ...data, plan: normalizePlan(data.plan) } as CloudProfile)
    : null;
}

async function ensureCloudProfile(user: User) {
  const client = getSupabaseBrowserClient();
  if (!client) return null;

  const existing = await getCloudProfile(user.id);
  if (existing) {
    if (existing.email !== user.email) {
      const { data, error } = await client
        .from("user_profiles")
        .update({ email: user.email })
        .eq("user_id", user.id)
        .select("user_id, email, plan, founder_eligible, founder_price_gbp")
        .single();

      if (error) throw normalizeCloudError(error);
      return data as CloudProfile;
    }

    return existing;
  }

  const { data, error } = await client
    .from("user_profiles")
    .insert({
      user_id: user.id,
      email: user.email,
      plan: "free",
      founder_eligible: false,
    })
    .select("user_id, email, plan, founder_eligible, founder_price_gbp")
    .single();

  if (error) throw normalizeCloudError(error);
  return data as CloudProfile;
}

export async function getIsCurrentUserAdmin() {
  const client = getSupabaseBrowserClient();
  const user = await getSignedInUser();
  if (!client || !user) return false;

  const { data, error } = await client
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw normalizeCloudError(error);
  return Boolean(data);
}

export async function registerFounderInterest(email: string, userId?: string | null) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Founder interest is temporarily unavailable.");
  }

  const { error } = await client.from("founder_waitlist").insert({
    email: email.trim().toLowerCase(),
    user_id: userId ?? null,
    source: "founder_page",
    status: "interested",
  });

  if (error) throw normalizeCloudError(error);
}

export async function listUserProfilesForAdmin() {
  const client = getSupabaseBrowserClient();
  if (!client) return [];

  const { data, error } = await client
    .from("user_profiles")
    .select("user_id, email, plan, founder_eligible, founder_price_gbp, created_at")
    .order("created_at", { ascending: false });

  if (error) throw normalizeCloudError(error);
  return (data ?? []) as CloudAdminProfile[];
}

export async function listFounderWaitlistForAdmin() {
  const client = getSupabaseBrowserClient();
  if (!client) return [];

  const { data, error } = await client
    .from("founder_waitlist")
    .select("id, email, user_id, source, status, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) throw normalizeCloudError(error);
  return (data ?? []) as FounderWaitlistEntry[];
}

export async function updateFounderWaitlistStatusForAdmin(
  id: string,
  status: string
) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Founder waitlist updates are temporarily unavailable.");
  }

  const { error } = await client
    .from("founder_waitlist")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw normalizeCloudError(error);
}

export async function updateFounderAccessForAdmin(
  userId: string,
  founderEligible: boolean,
  founderPriceGbp: number | null
) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Account updates are temporarily unavailable.");
  }

  const { error } = await client
    .from("user_profiles")
    .update({
      founder_eligible: founderEligible,
      founder_price_gbp: founderPriceGbp,
    })
    .eq("user_id", userId);

  if (error) throw normalizeCloudError(error);
}

async function fetchCloudEmails(userId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return [];

  const { data, error } = await client
    .from("saved_emails")
    .select(
      "id, playbookId:playbook_id, templateId:template_id, templateLabel:template_label, subject, body, tags, folder, isFavorite:is_favorite, createdAt:created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw normalizeCloudError(error);
  return (data ?? []) as SavedEmail[];
}

async function fetchCloudTemplates(userId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return [];

  const { data, error } = await client
    .from("custom_templates")
    .select(
      "id, title, subject, body, sourcePlaybookId:source_playbook_id, sourceTemplateId:source_template_id, sequenceSteps:sequence_steps, tags, folder, isFavorite:is_favorite, createdAt:created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (isMissingSequenceStepsColumn(error)) {
    const { data: fallbackData, error: fallbackError } = await client
      .from("custom_templates")
      .select(
        "id, title, subject, body, sourcePlaybookId:source_playbook_id, sourceTemplateId:source_template_id, tags, folder, isFavorite:is_favorite, createdAt:created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (fallbackError) throw normalizeCloudError(fallbackError);
    return (fallbackData ?? []) as CustomTemplate[];
  }

  if (error) throw normalizeCloudError(error);
  return (data ?? []) as CustomTemplate[];
}

async function upsertEmails(userId: string, emails: SavedEmail[]) {
  const client = getSupabaseBrowserClient();
  if (!client || emails.length === 0) return;

  const payload: CloudSavedEmailRow[] = emails.map((email) => ({
    id: email.id,
    user_id: userId,
    playbook_id: email.playbookId,
    template_id: email.templateId,
    template_label: email.templateLabel,
    subject: email.subject,
    body: email.body,
    tags: email.tags ?? [],
    folder: email.folder ?? null,
    is_favorite: email.isFavorite ?? false,
    created_at: email.createdAt,
  }));

  const { error } = await client.from("saved_emails").upsert(payload);
  if (error) throw normalizeCloudError(error);
}

async function upsertTemplates(userId: string, templates: CustomTemplate[]) {
  const client = getSupabaseBrowserClient();
  if (!client || templates.length === 0) return;

  const payload: CloudCustomTemplateRow[] = templates.map((template) => ({
    id: template.id,
    user_id: userId,
    title: template.title,
    subject: template.subject,
    body: template.body,
    source_playbook_id: template.sourcePlaybookId,
    source_template_id: template.sourceTemplateId,
    sequence_steps: template.sequenceSteps ?? null,
    tags: template.tags ?? [],
    folder: template.folder ?? null,
    is_favorite: template.isFavorite ?? false,
    created_at: template.createdAt,
  }));

  const { error } = await client.from("custom_templates").upsert(payload);
  if (isMissingSequenceStepsColumn(error)) {
    const fallbackPayload = payload.map((template) => ({
      id: template.id,
      user_id: template.user_id,
      title: template.title,
      subject: template.subject,
      body: template.body,
      source_playbook_id: template.source_playbook_id,
      source_template_id: template.source_template_id,
      tags: template.tags,
      folder: template.folder,
      is_favorite: template.is_favorite,
      created_at: template.created_at,
    }));
    const { error: fallbackError } = await client
      .from("custom_templates")
      .upsert(fallbackPayload);

    if (fallbackError) throw normalizeCloudError(fallbackError);
    return;
  }

  if (error) throw normalizeCloudError(error);
}

export async function hydrateLocalDataFromCloud(user: User) {
  await ensureCloudProfile(user);

  const [cloudEmails, cloudTemplates] = await Promise.all([
    fetchCloudEmails(user.id),
    fetchCloudTemplates(user.id),
  ]);

  const localEmails = getEmails();
  const localTemplates = getCustomTemplates();

  if (cloudEmails.length === 0 && localEmails.length > 0) {
    await upsertEmails(user.id, localEmails);
  } else {
    replaceEmails(cloudEmails);
  }

  if (cloudTemplates.length === 0 && localTemplates.length > 0) {
    await upsertTemplates(user.id, localTemplates);
  } else {
    replaceCustomTemplates(cloudTemplates);
  }

  return {
    emails:
      cloudEmails.length === 0 && localEmails.length > 0
        ? localEmails
        : cloudEmails,
    templates:
      cloudTemplates.length === 0 && localTemplates.length > 0
        ? localTemplates
        : cloudTemplates,
  };
}

export async function syncLocalDataToCloud(user: User) {
  await ensureCloudProfile(user);

  const localEmails = getEmails();
  const localTemplates = getCustomTemplates();

  await Promise.all([
    upsertEmails(user.id, localEmails),
    upsertTemplates(user.id, localTemplates),
  ]);

  const [cloudEmails, cloudTemplates] = await Promise.all([
    fetchCloudEmails(user.id),
    fetchCloudTemplates(user.id),
  ]);

  replaceEmails(cloudEmails);
  replaceCustomTemplates(cloudTemplates);
}

export async function saveEmailRecord(email: SavedEmail) {
  saveEmail(email);

  const user = await getSignedInUser();
  if (!user) return;

  await upsertEmails(user.id, [email]);
}

export async function saveCustomTemplateRecord(template: CustomTemplate) {
  saveCustomTemplate(template);

  const user = await getSignedInUser();
  if (!user) return;

  await upsertTemplates(user.id, [template]);
}

export async function shareAssetWithTeammate(options: {
  recipientEmail: string;
  assetType: TeamShareAssetType;
  sourceId: string;
  title: string;
  subject: string;
  body: string;
}) {
  const client = getSupabaseBrowserClient();
  const user = await getSignedInUser();
  if (!client || !user?.email) {
    throw new Error("Sign in before sharing with a teammate.");
  }

  const recipientEmail = options.recipientEmail.trim().toLowerCase();
  if (!recipientEmail || recipientEmail === user.email.toLowerCase()) {
    throw new Error("Enter a teammate's email address, not your own.");
  }

  const { error } = await client.from("team_shares").insert({
    owner_id: user.id,
    owner_email: user.email.toLowerCase(),
    recipient_email: recipientEmail,
    asset_type: options.assetType,
    source_id: options.sourceId,
    title: options.title,
    subject: options.subject,
    body: options.body,
  });

  if (error) throw normalizeCloudError(error);
}

export async function listTeamShares() {
  const client = getSupabaseBrowserClient();
  if (!client) return [];

  const { data, error } = await client
    .from("team_shares")
    .select(
      "id, owner_id, owner_email, recipient_email, asset_type, source_id, title, subject, body, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) throw normalizeCloudError(error);
  return (data ?? []) as TeamShare[];
}

export async function removeTeamShare(id: string) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Team sharing is temporarily unavailable.");

  const { error } = await client.from("team_shares").delete().eq("id", id);
  if (error) throw normalizeCloudError(error);
}

function isMissingBusinessSchema(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        error.code === "PGRST202" ||
        error.message?.toLowerCase().includes("claim_business_membership") ||
        error.message?.toLowerCase().includes("business_members"))
  );
}

export async function getBusinessMembership() {
  const client = getSupabaseBrowserClient();
  const user = await getSignedInUser();
  if (!client || !user?.email) return null;

  const { data, error } = await client.rpc("claim_business_membership");

  if (isMissingBusinessSchema(error)) return null;
  if (error) throw normalizeCloudError(error);
  const membership = Array.isArray(data) ? data[0] : data;
  return (membership as BusinessMember | undefined) ?? null;
}

export async function getOwnedBusinessWorkspace() {
  const client = getSupabaseBrowserClient();
  const user = await getSignedInUser();
  if (!client || !user) return null;

  const { data, error } = await client
    .from("business_workspaces")
    .select("id, owner_id, name, status, seat_limit, created_at")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (isMissingBusinessSchema(error)) return null;
  if (error) throw normalizeCloudError(error);
  return data as BusinessWorkspace | null;
}

export async function createAdminBusinessWorkspace() {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Supabase is not configured.");
  const { data } = await client.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Sign in again before granting access.");

  const response = await fetch("/api/admin/business-workspace", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const result = (await response.json()) as { ready?: boolean; error?: string };
  if (!response.ok || !result.ready) {
    throw new Error(result.error || "Business Pro access could not be granted.");
  }
}

export async function listAccessibleBusinessWorkspaces() {
  const client = getSupabaseBrowserClient();
  const user = await getSignedInUser();
  if (!client || !user) return [];

  const [{ data: workspaces, error: workspaceError }, { data: memberships, error: memberError }] =
    await Promise.all([
      client
        .from("business_workspaces")
        .select("id, owner_id, name, status, seat_limit, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: true }),
      client
        .from("business_members")
        .select("workspace_id, role")
        .eq("user_id", user.id)
        .eq("status", "active")
        .eq("access_active", true),
    ]);

  if (isMissingBusinessSchema(workspaceError) || isMissingBusinessSchema(memberError)) return [];
  if (workspaceError) throw normalizeCloudError(workspaceError);
  if (memberError) throw normalizeCloudError(memberError);

  const roleByWorkspace = new Map(
    (memberships ?? []).map((membership) => [membership.workspace_id, membership.role])
  );
  return (workspaces ?? []).map((workspace) => ({
    ...(workspace as BusinessWorkspace),
    access_role:
      workspace.owner_id === user.id
        ? "owner"
        : (roleByWorkspace.get(workspace.id) as "admin" | "member") ?? "member",
  })) as BusinessWorkspaceAccess[];
}

export async function listBusinessMembers(workspaceId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return [];

  const { data, error } = await client
    .from("business_members")
    .select(
      "id, workspace_id, email, user_id, role, custom_role_id, status, access_active, created_at"
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) throw normalizeCloudError(error);
  return (data ?? []) as BusinessMember[];
}

export async function listWorkspaceRoles(workspaceId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return [];
  const { data, error } = await client.from("workspace_roles").select("*").eq("workspace_id", workspaceId).order("name");
  if (error) throw normalizeCloudError(error);
  return (data ?? []) as WorkspaceRole[];
}

export async function createWorkspaceRole(options: Omit<WorkspaceRole, "id" | "created_at">) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Workspace roles are unavailable.");
  const { error } = await client.from("workspace_roles").insert(options);
  if (error) throw normalizeCloudError(error);
}

export async function assignWorkspaceCustomRole(memberId: string, customRoleId: string | null) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Workspace roles are unavailable.");
  const { error } = await client.from("business_members").update({ custom_role_id: customRoleId, updated_at: new Date().toISOString() }).eq("id", memberId);
  if (error) throw normalizeCloudError(error);
}

export async function listWorkspaceNotifications() {
  const client = getSupabaseBrowserClient();
  if (!client) return [];
  const { data, error } = await client.from("workspace_notifications").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) throw normalizeCloudError(error);
  return (data ?? []) as WorkspaceNotification[];
}

export async function markWorkspaceNotificationRead(id: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  const { error } = await client.from("workspace_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  if (error) throw normalizeCloudError(error);
}

export async function transferBusinessWorkspace(workspaceId: string, newOwnerId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Workspace transfer is unavailable.");
  const { error } = await client.rpc("transfer_business_workspace", { target_workspace_id: workspaceId, new_owner_id: newOwnerId });
  if (error) throw normalizeCloudError(error);
}

export async function deleteBusinessWorkspace(workspaceId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Workspace deletion is unavailable.");
  const { error } = await client.rpc("delete_business_workspace", { target_workspace_id: workspaceId });
  if (error) throw normalizeCloudError(error);
}

export async function inviteBusinessMember(workspaceId: string, email: string) {
  const client = getSupabaseBrowserClient();
  const user = await getSignedInUser();
  if (!client || !user?.email) {
    throw new Error("Sign in as the Business Pro owner first.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail === user.email.toLowerCase()) {
    throw new Error("Enter a teammate's email address, not your own.");
  }

  const { error } = await client.from("business_members").insert({
    workspace_id: workspaceId,
    email: normalizedEmail,
    status: "invited",
    access_active: true,
  });

  if (error) throw normalizeCloudError(error);
}

export async function updateBusinessMember(
  id: string,
  updates: Partial<Pick<BusinessMember, "role" | "access_active" | "status">>
) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Business member access is unavailable.");
  const { error } = await client
    .from("business_members")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw normalizeCloudError(error);
}

export async function removeBusinessMember(id: string) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Business member access is unavailable.");

  const { error } = await client.from("business_members").delete().eq("id", id);
  if (error) throw normalizeCloudError(error);
}
