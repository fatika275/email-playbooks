import { NextResponse } from "next/server";

export async function GET() {
  const checks = {
    stripeSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    stripeProPriceId: Boolean(process.env.STRIPE_PRO_PRICE_ID),
    stripeFounderPriceId: Boolean(process.env.STRIPE_FOUNDER_PRICE_ID),
    supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  };

  return NextResponse.json({
    ready: Object.values(checks).every(Boolean),
    checks,
  });
}
