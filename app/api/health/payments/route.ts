import { NextResponse } from "next/server";

type StripePriceCheck = {
  configured: boolean;
  idSuffix: string | null;
  exists: boolean;
  active: boolean | null;
  currency: string | null;
  unitAmount: number | null;
  interval: string | null;
  error: string | null;
};

function getMaskedPriceId(priceId?: string) {
  const trimmed = priceId?.trim() || "";
  if (!trimmed) return null;
  return `...${trimmed.slice(-8)}`;
}

async function checkStripePrice(
  stripeSecretKey: string,
  priceId?: string
): Promise<StripePriceCheck> {
  const trimmed = priceId?.trim() || "";

  if (!trimmed) {
    return {
      configured: false,
      idSuffix: null,
      exists: false,
      active: null,
      currency: null,
      unitAmount: null,
      interval: null,
      error: "Missing price ID.",
    };
  }

  if (!trimmed.startsWith("price_")) {
    return {
      configured: true,
      idSuffix: getMaskedPriceId(trimmed),
      exists: false,
      active: null,
      currency: null,
      unitAmount: null,
      interval: null,
      error: "This is not a Stripe Price ID. It must start with price_.",
    };
  }

  const response = await fetch(
    `https://api.stripe.com/v1/prices/${encodeURIComponent(trimmed)}`,
    {
      headers: {
        authorization: `Bearer ${stripeSecretKey.trim()}`,
      },
      cache: "no-store",
    }
  );
  const payload = (await response.json().catch(() => ({}))) as {
    active?: boolean;
    currency?: string;
    unit_amount?: number | null;
    recurring?: { interval?: string } | null;
    error?: { message?: string };
  };

  if (!response.ok) {
    return {
      configured: true,
      idSuffix: getMaskedPriceId(trimmed),
      exists: false,
      active: null,
      currency: null,
      unitAmount: null,
      interval: null,
      error: payload.error?.message || "Stripe could not find this price.",
    };
  }

  return {
    configured: true,
    idSuffix: getMaskedPriceId(trimmed),
    exists: true,
    active: Boolean(payload.active),
    currency: payload.currency ?? null,
    unitAmount: payload.unit_amount ?? null,
    interval: payload.recurring?.interval ?? null,
    error: null,
  };
}

export async function GET() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim() || "";
  const resendApiKey = Boolean(process.env.RESEND_API_KEY);
  const resendKey = Boolean(process.env.RESEND_KEY);
  const checks = {
    stripeSecretKey: Boolean(stripeSecretKey),
    stripeWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    stripeProPriceId: Boolean(process.env.STRIPE_PRO_PRICE_ID),
    stripeFounderPriceId: Boolean(process.env.STRIPE_FOUNDER_PRICE_ID),
    stripeBusinessPriceId: Boolean(process.env.STRIPE_BUSINESS_PRICE_ID),
    resendApiKey: resendApiKey || resendKey,
    supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  };
  const stripePrices = stripeSecretKey
    ? {
        pro: await checkStripePrice(stripeSecretKey, process.env.STRIPE_PRO_PRICE_ID),
        founder: await checkStripePrice(
          stripeSecretKey,
          process.env.STRIPE_FOUNDER_PRICE_ID
        ),
        business: await checkStripePrice(
          stripeSecretKey,
          process.env.STRIPE_BUSINESS_PRICE_ID
        ),
      }
    : null;

  return NextResponse.json({
    ready:
      Object.values(checks).every(Boolean) &&
      (!stripePrices || Object.values(stripePrices).every((price) => price.exists)),
    checks,
    stripeRuntime: {
      secretKeyMode: stripeSecretKey.startsWith("sk_live_")
        ? "live"
        : stripeSecretKey.startsWith("sk_test_")
          ? "test"
          : stripeSecretKey
            ? "unknown"
            : "missing",
      prices: stripePrices,
    },
    emailRuntime: {
      RESEND_API_KEY: resendApiKey,
      RESEND_KEY: resendKey,
      availableResendKeys: Object.keys(process.env)
        .filter((key) => key.toUpperCase().includes("RESEND"))
        .sort(),
    },
    vercelRuntime: {
      VERCEL: process.env.VERCEL || null,
      VERCEL_ENV: process.env.VERCEL_ENV || null,
      VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || null,
      VERCEL_GIT_REPO_SLUG: process.env.VERCEL_GIT_REPO_SLUG || null,
      VERCEL_PROJECT_PRODUCTION_URL:
        process.env.VERCEL_PROJECT_PRODUCTION_URL || null,
      VERCEL_URL: process.env.VERCEL_URL || null,
    },
  });
}
