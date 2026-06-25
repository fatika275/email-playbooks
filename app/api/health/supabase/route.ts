import { NextResponse } from "next/server";

function normalizeSupabaseUrl(url: string) {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export async function GET() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const url = rawUrl ? normalizeSupabaseUrl(rawUrl) : "";

  const checks = {
    supabaseUrl: Boolean(url),
    supabaseAnonKey: Boolean(anonKey),
    supabaseServiceRoleKey: Boolean(serviceRoleKey),
    supabaseUrlLooksCorrect: /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url),
    authSettingsReachable: false,
    restReachable: false,
  };

  if (url && anonKey) {
    const authResponse = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey },
      cache: "no-store",
    }).catch(() => null);
    checks.authSettingsReachable = Boolean(authResponse?.ok);
  }

  if (url && serviceRoleKey) {
    const restResponse = await fetch(
      `${url}/rest/v1/user_profiles?select=user_id&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
        },
        cache: "no-store",
      }
    ).catch(() => null);
    checks.restReachable = Boolean(restResponse?.ok);
  }

  return NextResponse.json({
    ready: Object.values(checks).every(Boolean),
    projectUrl: url || null,
    checks,
  });
}
