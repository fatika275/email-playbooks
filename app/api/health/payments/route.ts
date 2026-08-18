import { NextResponse } from "next/server";

export async function GET() {
  const resendApiKey = Boolean(process.env.RESEND_API_KEY);
  const resendKey = Boolean(process.env.RESEND_KEY);
  const checks = {
    stripeSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    stripeProPriceId: Boolean(process.env.STRIPE_PRO_PRICE_ID),
    stripeFounderPriceId: Boolean(process.env.STRIPE_FOUNDER_PRICE_ID),
    stripeBusinessPriceId: Boolean(process.env.STRIPE_BUSINESS_PRICE_ID),
    resendApiKey: resendApiKey || resendKey,
    supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  };

  return NextResponse.json({
    ready: Object.values(checks).every(Boolean),
    checks,
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
