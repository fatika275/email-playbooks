import { NextRequest, NextResponse } from "next/server";
import { syncEmailReplies } from "@/lib/emailIntegrations";

export async function GET(request: NextRequest) {
  const secret = process.env.EMAIL_SYNC_SECRET || process.env.CRON_SECRET;
  const provided =
    request.headers.get("x-email-sync-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.nextUrl.searchParams.get("secret");

  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Email sync is not authorized." }, { status: 401 });
  }

  try {
    const result = await syncEmailReplies();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Email sync failed." },
      { status: 500 }
    );
  }
}
