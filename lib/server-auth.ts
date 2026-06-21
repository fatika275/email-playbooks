import { normalizePlan, type PlanId } from "@/lib/plans";

type SupabaseUserResponse = {
  user?: {
    id: string;
    email?: string;
  };
};

function getSupabaseServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are missing.");
  }

  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

export async function getUserFromAccessToken(accessToken: string) {
  const { url, serviceRoleKey } = getSupabaseServerConfig();

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not verify signed-in user.");
  }

  const payload = (await response.json()) as SupabaseUserResponse;

  if (!payload.user?.id) {
    throw new Error("Signed-in user was not found.");
  }

  return payload.user;
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
