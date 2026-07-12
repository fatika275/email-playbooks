import { NextRequest, NextResponse } from "next/server";
import {
  buildEmailConnectUrl,
  getEmailUserFromRequest,
  listEmailIntegrations,
  syncEmailReplies,
  type EmailProvider,
} from "@/lib/emailIntegrations";

function isProvider(value: unknown): value is EmailProvider {
  return value === "gmail" || value === "outlook";
}

export async function GET(request: NextRequest) {
  try {
    const user = await getEmailUserFromRequest(request);
    const integrations = await listEmailIntegrations(user.id);
    return NextResponse.json({ integrations });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Email integrations could not be loaded." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getEmailUserFromRequest(request);
    const { provider } = (await request.json()) as { provider?: unknown };
    if (!isProvider(provider)) {
      return NextResponse.json({ error: "Choose Gmail or Outlook." }, { status: 400 });
    }
    return NextResponse.json({
      url: buildEmailConnectUrl({ userId: user.id, provider }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Email connection could not be started." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getEmailUserFromRequest(request);
    const result = await syncEmailReplies(user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Email replies could not be synced." },
      { status: 500 }
    );
  }
}
