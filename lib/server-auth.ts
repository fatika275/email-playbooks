import { createClient } from "@supabase/supabase-js";
import { normalizePlan, type PlanId } from "@/lib/plans";

function getSupabaseServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are missing.");
  }

  return { url: url.replace(/\/$/, ""), anonKey, serviceRoleKey };
}

export async function getUserFromAccessToken(accessToken: string) {
  const { url, anonKey } = getSupabaseServerConfig();
  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  if (error || !user) {
    throw new Error("Your sign-in session has expired. Please sign in again.");
  }

  return user;
}

export async function updateUserPlan(options: {
  userId: string;
  email?: string | null;
  plan: PlanId;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const { url, serviceRoleKey } = getSupabaseServerConfig();
  const body = {
    user_id: options.userId,
    email: options.email ?? null,
    plan: normalizePlan(options.plan),
    stripe_customer_id: options.stripeCustomerId ?? null,
    stripe_subscription_id: options.stripeSubscriptionId ?? null,
    updated_at: new Date().toISOString(),
  };

  const response = await fetch(
    `${url}/rest/v1/user_profiles?on_conflict=user_id`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }
}
