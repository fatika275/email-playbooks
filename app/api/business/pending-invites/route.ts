import { NextRequest, NextResponse } from "next/server";
import { getUserFromAccessToken } from "@/lib/server-auth";

type BusinessMemberRow = {
  id: string;
  workspace_id: string;
  email: string;
  role: "admin" | "member";
  status: "invited" | "active";
  access_active: boolean;
  created_at: string;
};

type BusinessWorkspaceRow = {
  id: string;
  name: string;
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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");

    if (!accessToken) {
      return NextResponse.json({ invites: [] });
    }

    const user = await getUserFromAccessToken(accessToken);
    const email = user.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ invites: [] });
    }

    const { url, serviceRoleKey } = getSupabaseServerConfig();
    const headers = {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    };

    const memberResponse = await fetch(
      `${url}/rest/v1/business_members?select=id,workspace_id,email,role,status,access_active,created_at&email=ilike.${encodeURIComponent(email)}&status=eq.invited&access_active=eq.true&order=created_at.desc`,
      { headers, cache: "no-store" }
    );

    if (!memberResponse.ok) {
      return NextResponse.json({ error: "Pending team invites could not be checked." }, { status: 500 });
    }

    const invites = (await memberResponse.json()) as BusinessMemberRow[];
    const workspaceIds = Array.from(new Set(invites.map((invite) => invite.workspace_id)));
    let workspaces: BusinessWorkspaceRow[] = [];

    if (workspaceIds.length) {
      const workspaceResponse = await fetch(
        `${url}/rest/v1/business_workspaces?select=id,name,status&id=in.(${workspaceIds.join(",")})&status=eq.active`,
        { headers, cache: "no-store" }
      );

      if (!workspaceResponse.ok) {
        return NextResponse.json({ error: "Pending team invites could not be checked." }, { status: 500 });
      }

      workspaces = (await workspaceResponse.json()) as BusinessWorkspaceRow[];
    }

    const workspaceNameById = new Map(
      workspaces.map((workspace) => [workspace.id, workspace.name])
    );

    return NextResponse.json({
      invites: invites
        .filter((invite) => workspaceNameById.has(invite.workspace_id))
        .map((invite) => ({
          ...invite,
          workspace_name: workspaceNameById.get(invite.workspace_id) ?? "Business workspace",
        })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Pending team invites could not be checked.",
      },
      { status: 500 }
    );
  }
}
