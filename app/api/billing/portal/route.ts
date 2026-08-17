import { NextRequest, NextResponse } from "next/server";
import { getUserFromAccessToken } from "@/lib/server-auth";

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
        { error: "Sign in before managing billing." },
        { status: 401 }
      );
    }

    const user = await getUserFromAccessToken(accessToken);
    const { url, serviceRoleKey } = getSupabaseServerConfig();
    const profileResponse = await fetch(
      `${url}/rest/v1/user_profiles?select=stripe_customer_id&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
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
        { error: "Billing profile could not be checked." },
        { status: 500 }
      );
    }

    const profiles = (await profileResponse.json()) as Array<{
      stripe_customer_id?: string | null;
    }>;
    const stripeCustomerId = profiles[0]?.stripe_customer_id;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No paid subscription was found for this account." },
        { status: 404 }
      );
    }

    const form = new URLSearchParams();
    form.set("customer", stripeCustomerId);
    form.set("return_url", `${siteUrl}/account`);

    const stripeResponse = await fetch(
      "https://api.stripe.com/v1/billing_portal/sessions",
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
        { error: payload.error?.message || "Billing portal could not be opened." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: payload.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Billing portal could not be opened.",
      },
      { status: 500 }
    );
  }
}
