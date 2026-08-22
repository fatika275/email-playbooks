import { NextRequest, NextResponse } from "next/server";
import { getUserFromAccessToken } from "@/lib/server-auth";

type BusinessMemberRow = {
  id: string;
  workspace_id: string;
  email: string;
  user_id: string | null;
  role: "admin" | "member";
  custom_role_id?: string | null;
  status: "invited" | "active";
  access_active: boolean;
  created_at: string;
};

type BusinessWorkspaceRow = {
  id: string;
  status: "active" | "inactive";
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

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");

    if (!accessToken) {
      return NextResponse.json({ error: "Sign in before accepting the invite." }, { status: 401 });
    }

    const { inviteId } = (await request.json()) as { inviteId?: string };

    if (!inviteId) {
      return NextResponse.json({ error: "Invite link is missing." }, { status: 400 });
    }

    const user = await getUserFromAccessToken(accessToken);
    const email = user.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Your account email could not be checked." }, { status: 400 });
    }

    const { url, serviceRoleKey } = getSupabaseServerConfig();
    const headers = {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    };

    const memberResponse = await fetch(
      `${url}/rest/v1/business_members?select=id,workspace_id,email,user_id,role,custom_role_id,status,access_active,created_at&id=eq.${encodeURIComponent(inviteId)}&limit=1`,
      { headers, cache: "no-store" }
    );

    if (!memberResponse.ok) {
      return NextResponse.json({ error: "Invite could not be checked." }, { status: 500 });
    }

    const members = (await memberResponse.json()) as BusinessMemberRow[];
    const invite = members[0];

    if (!invite || !invite.access_active) {
      return NextResponse.json({ error: "This invite is no longer active." }, { status: 404 });
    }

    if (invite.email.trim().toLowerCase() !== email) {
      return NextResponse.json(
        { error: `This invite was sent to ${invite.email}. Sign in with that email to accept it.` },
        { status: 403 }
      );
    }

    const workspaceResponse = await fetch(
      `${url}/rest/v1/business_workspaces?select=id,status&id=eq.${encodeURIComponent(invite.workspace_id)}&status=eq.active&limit=1`,
      { headers, cache: "no-store" }
    );

    if (!workspaceResponse.ok) {
      return NextResponse.json({ error: "Workspace could not be checked." }, { status: 500 });
    }

    const workspaces = (await workspaceResponse.json()) as BusinessWorkspaceRow[];

    if (!workspaces.length) {
      return NextResponse.json({ error: "This workspace is no longer active." }, { status: 404 });
    }

    const updateResponse = await fetch(
      `${url}/rest/v1/business_members?id=eq.${encodeURIComponent(invite.id)}`,
      {
        method: "PATCH",
        headers: {
          ...headers,
          prefer: "return=representation",
        },
        body: JSON.stringify({
          user_id: user.id,
          status: "active",
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      return NextResponse.json({ error: "Invite could not be accepted." }, { status: 500 });
    }

    const updated = (await updateResponse.json()) as BusinessMemberRow[];
    return NextResponse.json({ membership: updated[0] ?? null });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invite could not be accepted.",
      },
      { status: 500 }
    );
  }
}
