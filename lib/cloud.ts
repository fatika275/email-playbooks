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

function normalizeCloudError(error: unknown) {
  if (!(error instanceof Error)) {
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
    ) {
      const message = ((error as { message: string }).message || "").toLowerCase();

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

export async function signUpWithPassword(email: string, password: string) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Sign-in is temporarily unavailable. Please try again later.");
  }

  if (
    password.length < 8 ||
    !/[A-Za-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    throw new Error(
      "Use at least 8 characters with at least one letter and one number."
    );
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
      "id, title, subject, body, sourcePlaybookId:source_playbook_id, sourceTemplateId:source_template_id, tags, folder, isFavorite:is_favorite, createdAt:created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

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
    tags: template.tags ?? [],
    folder: template.folder ?? null,
    is_favorite: template.isFavorite ?? false,
    created_at: template.createdAt,
  }));

  const { error } = await client.from("custom_templates").upsert(payload);
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
