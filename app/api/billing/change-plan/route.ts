import { NextRequest, NextResponse } from "next/server";
import {
  getStripePriceIdForPlan,
  normalizePlan,
  PLAN_LABELS,
  type PlanId,
} from "@/lib/plans";
import { getUserFromAccessToken, updateUserPlan } from "@/lib/server-auth";

const changeablePlans = new Set<PlanId>(["pro", "business"]);
const activeSubscriptionStatuses = new Set(["active", "trialing"]);

type BillingProfile = {
  plan?: string | null;
  email?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
};

type StripeSubscription = {
  id: string;
  customer?: string | null;
  status?: string | null;
  items?: {
    data?: Array<{
      id: string;
      price?: {
        id?: string;
      };
    }>;
  };
  error?: {
    message?: string;
  };
};

function getSupabaseServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are missing.");
  }

  return {
    url: url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, ""),
    serviceRoleKey,
  };
}

async function getBillingProfile(userId: string) {
  const { url, serviceRoleKey } = getSupabaseServerConfig();
  const response = await fetch(
    `${url}/rest/v1/user_profiles?select=email,plan,stripe_customer_id,stripe_subscription_id&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Your billing profile could not be checked.");
  }

  const profiles = (await response.json()) as BillingProfile[];
  return profiles[0] ?? null;
}

async function getStripeSubscription(subscriptionId: string, stripeSecretKey: string) {
  const response = await fetch(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      headers: {
        authorization: `Bearer ${stripeSecretKey}`,
      },
      cache: "no-store",
    }
  );
  const payload = (await response.json()) as StripeSubscription;

  if (!response.ok) {
    throw new Error(payload.error?.message || "Stripe subscription could not be loaded.");
  }

  return payload;
}

async function updateStripeSubscriptionPlan(options: {
  subscriptionId: string;
  subscriptionItemId: string;
  priceId: string;
  plan: Exclude<PlanId, "free" | "founder">;
  userId: string;
  stripeSecretKey: string;
}) {
  const form = new URLSearchParams();
  form.set("items[0][id]", options.subscriptionItemId);
  form.set("items[0][price]", options.priceId);
  form.set("metadata[user_id]", options.userId);
  form.set("metadata[plan]", options.plan);
  form.set("proration_behavior", "create_prorations");
  form.set("payment_behavior", "error_if_incomplete");

  const response = await fetch(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(options.subscriptionId)}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${options.stripeSecretKey}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form,
    }
  );
  const payload = (await response.json()) as StripeSubscription;

  if (!response.ok) {
    throw new Error(payload.error?.message || "Stripe subscription could not be changed.");
  }

  return payload;
}

export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Stripe is not configured yet." },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return NextResponse.json(
        { error: "Sign in before changing your subscription." },
        { status: 401 }
      );
    }

    const { plan } = (await request.json()) as { plan?: PlanId };
    const targetPlan = normalizePlan(plan);

    if (!changeablePlans.has(targetPlan)) {
      return NextResponse.json(
        { error: "Choose Pro or Business Pro to change plans." },
        { status: 400 }
      );
    }

    const user = await getUserFromAccessToken(accessToken);
    const profile = await getBillingProfile(user.id);
    const currentPlan = normalizePlan(profile?.plan);

    if (currentPlan === "free") {
      return NextResponse.json(
        { error: "Start a paid plan before changing subscriptions." },
        { status: 409 }
      );
    }

    if (currentPlan === targetPlan) {
      return NextResponse.json({
        changed: false,
        plan: currentPlan,
        planLabel: PLAN_LABELS[currentPlan],
      });
    }

    const subscriptionId = profile?.stripe_subscription_id;
    if (!subscriptionId) {
      return NextResponse.json(
        { error: "No active Stripe subscription was found for this account." },
        { status: 404 }
      );
    }

    const priceId = getStripePriceIdForPlan(
      targetPlan as Exclude<PlanId, "free">
    );
    if (!priceId) {
      return NextResponse.json(
        { error: "This plan does not have a Stripe price yet." },
        { status: 500 }
      );
    }

    const subscription = await getStripeSubscription(subscriptionId, stripeSecretKey);
    const subscriptionItem = subscription.items?.data?.[0];
    if (!subscriptionItem?.id) {
      return NextResponse.json(
        { error: "This subscription could not be changed automatically." },
        { status: 409 }
      );
    }

    const updatedSubscription = await updateStripeSubscriptionPlan({
      subscriptionId,
      subscriptionItemId: subscriptionItem.id,
      priceId,
      plan: targetPlan as Exclude<PlanId, "free" | "founder">,
      userId: user.id,
      stripeSecretKey,
    });

    if (!activeSubscriptionStatuses.has(updatedSubscription.status || "")) {
      return NextResponse.json(
        { error: "Stripe has not confirmed the plan change yet." },
        { status: 409 }
      );
    }

    await updateUserPlan({
      userId: user.id,
      email: profile?.email || user.email,
      plan: targetPlan,
      stripeCustomerId:
        updatedSubscription.customer ?? profile?.stripe_customer_id ?? null,
      stripeSubscriptionId: updatedSubscription.id,
    });

    return NextResponse.json({
      changed: true,
      plan: targetPlan,
      planLabel: PLAN_LABELS[targetPlan],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Plan could not be changed.",
      },
      { status: 500 }
    );
  }
}
