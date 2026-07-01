import { normalizePlan, type PlanId } from "@/lib/plans";

function getSupabaseServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are missing.");
  }

  return {
    url: url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, ""),
    anonKey,
    serviceRoleKey,
  };
}

export async function getUserFromAccessToken(accessToken: string) {
  const { url, anonKey } = getSupabaseServerConfig();

  const userResponse = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  }).catch(() => null);

  if (userResponse?.ok) {
    const user = (await userResponse.json()) as { id: string; email?: string };
    return user;
  }

  const tokenParts = accessToken.split(".");

  if (tokenParts.length !== 3) {
    throw new Error("Your sign-in session has expired. Please sign in again.");
  }

  let tokenUserId = "";
  let tokenEmail: string | undefined;

  try {
    const payload = JSON.parse(
      Buffer.from(tokenParts[1], "base64url").toString("utf8")
    ) as { sub?: string; email?: string };
    tokenUserId = payload.sub || "";
    tokenEmail = payload.email;
  } catch {
    throw new Error("Your sign-in session has expired. Please sign in again.");
  }

  if (!tokenUserId) {
    throw new Error("Your sign-in session has expired. Please sign in again.");
  }

  const profileResponse = await fetch(
    `${url}/rest/v1/user_profiles?select=user_id,email&user_id=eq.${encodeURIComponent(tokenUserId)}&limit=1`,
    {
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!profileResponse.ok) {
    throw new Error("Your sign-in session has expired. Please sign in again.");
  }

  const profiles = (await profileResponse.json()) as Array<{
    user_id: string;
    email?: string;
  }>;
  const profile = profiles[0];

  if (!profile || profile.user_id !== tokenUserId) {
    throw new Error("Your account profile could not be verified.");
  }

  return {
    id: profile.user_id,
    email: profile.email || tokenEmail,
  };
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

  if (options.plan === "business") {
    await setBusinessWorkspaceAccess({
      ownerId: options.userId,
      active: true,
      stripeCustomerId: options.stripeCustomerId ?? null,
      stripeSubscriptionId: options.stripeSubscriptionId ?? null,
    });
  } else {
    await setBusinessWorkspaceAccess({
      ownerId: options.userId,
      active: false,
      stripeCustomerId: options.stripeCustomerId ?? null,
      stripeSubscriptionId: options.stripeSubscriptionId ?? null,
    });
  }
}

async function setBusinessWorkspaceAccess(options: {
  ownerId: string;
  active: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}) {
  const { url, serviceRoleKey } = getSupabaseServerConfig();
  const headers = {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
  };

  if (options.active) {
    const upsertResponse = await fetch(
      `${url}/rest/v1/business_workspaces?on_conflict=owner_id`,
      {
        method: "POST",
        headers: {
          ...headers,
          prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          owner_id: options.ownerId,
          status: "active",
          seat_limit: 10,
          stripe_customer_id: options.stripeCustomerId,
          stripe_subscription_id: options.stripeSubscriptionId,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!upsertResponse.ok) {
      throw new Error(await upsertResponse.text());
    }
  }

  const workspaceResponse = await fetch(
    `${url}/rest/v1/business_workspaces?select=id&owner_id=eq.${encodeURIComponent(options.ownerId)}&limit=1`,
    { headers, cache: "no-store" }
  );

  if (!workspaceResponse.ok) {
    if (!options.active && workspaceResponse.status === 404) return;
    throw new Error(await workspaceResponse.text());
  }

  const workspaces = (await workspaceResponse.json()) as Array<{ id: string }>;
  const workspace = workspaces[0];
  if (!workspace) return;

  if (!options.active) {
    const workspaceUpdate = await fetch(
      `${url}/rest/v1/business_workspaces?id=eq.${encodeURIComponent(workspace.id)}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: "inactive",
          updated_at: new Date().toISOString(),
        }),
      }
    );
    if (!workspaceUpdate.ok) throw new Error(await workspaceUpdate.text());
  }

  const memberUpdate = await fetch(
    `${url}/rest/v1/business_members?workspace_id=eq.${encodeURIComponent(workspace.id)}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        access_active: options.active,
        updated_at: new Date().toISOString(),
      }),
    }
  );
  if (!memberUpdate.ok) throw new Error(await memberUpdate.text());
}
