import { NextRequest, NextResponse } from "next/server";
import { getStripePriceIdForPlan, normalizePlan, type PlanId } from "@/lib/plans";
import { getUserFromAccessToken } from "@/lib/server-auth";

const checkoutPlans = new Set<PlanId>(["pro", "founder", "business"]);

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

export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin || "";

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
        { error: "Sign in before checkout." },
        { status: 401 }
      );
    }

    const { plan } = (await request.json()) as { plan?: PlanId };

    if (!plan || !checkoutPlans.has(plan)) {
      return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
    }

    const priceId = getStripePriceIdForPlan(plan as Exclude<PlanId, "free">);

    if (!priceId) {
      return NextResponse.json(
        { error: "This plan does not have a Stripe price yet." },
        { status: 500 }
      );
    }

    const user = await getUserFromAccessToken(accessToken);
    const { url, serviceRoleKey } = getSupabaseServerConfig();
    const profileResponse = await fetch(
      `${url}/rest/v1/user_profiles?select=plan&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
        },
        cache: "no-store",
      }
    );

    if (!profileResponse.ok) {
      return NextResponse.json(
        { error: "Your billing profile could not be checked." },
        { status: 500 }
      );
    }

    const profiles = (await profileResponse.json()) as Array<{
      plan?: string | null;
    }>;
    const currentPlan = normalizePlan(profiles[0]?.plan);

    if (currentPlan !== "free") {
      return NextResponse.json(
        {
          error:
            "You already have a paid plan. Manage your subscription to change plans.",
        },
        { status: 409 }
      );
    }

    const form = new URLSearchParams();
    form.set("mode", "subscription");
    form.set("line_items[0][price]", priceId);
    form.set("line_items[0][quantity]", "1");
    form.set(
      "success_url",
      `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    );
    form.set("cancel_url", `${siteUrl}/pricing?checkout=cancelled`);
    form.set("client_reference_id", user.id);
    if (user.email) {
      form.set("customer_email", user.email);
    }
    form.set("metadata[user_id]", user.id);
    form.set("metadata[plan]", plan);
    form.set("subscription_data[metadata][user_id]", user.id);
    form.set("subscription_data[metadata][plan]", plan);

    const stripeResponse = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${stripeSecretKey}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: form,
      }
    );

    const payload = (await stripeResponse.json()) as {
      url?: string;
      error?: { message?: string };
    };

    if (!stripeResponse.ok || !payload.url) {
      return NextResponse.json(
        { error: payload.error?.message || "Stripe checkout failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: payload.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Checkout could not start.",
      },
      { status: 500 }
    );
  }
}
