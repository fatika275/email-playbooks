import { NextRequest, NextResponse } from "next/server";
import { getUserFromAccessToken } from "@/lib/server-auth";

type BusinessMemberRow = {
  workspace_id: string;
  role: "admin" | "member";
};

type BusinessWorkspaceRow = {
  id: string;
  owner_id: string;
  name: string;
  status: "active" | "inactive";
  seat_limit: number;
  created_at: string;
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
      return NextResponse.json({ workspaces: [] });
    }

    const user = await getUserFromAccessToken(accessToken);
    const { url, serviceRoleKey } = getSupabaseServerConfig();
    const headers = {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    };

    const memberResponse = await fetch(
      `${url}/rest/v1/business_members?select=workspace_id,role&user_id=eq.${encodeURIComponent(user.id)}&status=eq.active&access_active=eq.true`,
      { headers, cache: "no-store" }
    );

    if (!memberResponse.ok) {
      return NextResponse.json({ error: "Team workspaces could not be checked." }, { status: 500 });
    }

    const memberships = (await memberResponse.json()) as BusinessMemberRow[];
    const roleByWorkspace = new Map(
      memberships.map((membership) => [membership.workspace_id, membership.role])
    );
    const workspaceIds = Array.from(roleByWorkspace.keys());
    const ownedWorkspaceResponse = await fetch(
      `${url}/rest/v1/business_workspaces?select=id,owner_id,name,status,seat_limit,created_at&owner_id=eq.${encodeURIComponent(user.id)}&status=eq.active&order=created_at.asc`,
      { headers, cache: "no-store" }
    );

    if (!ownedWorkspaceResponse.ok) {
      return NextResponse.json({ error: "Team workspaces could not be loaded." }, { status: 500 });
    }

    const ownedWorkspaces = (await ownedWorkspaceResponse.json()) as BusinessWorkspaceRow[];
    let memberWorkspaces: BusinessWorkspaceRow[] = [];

    if (workspaceIds.length) {
      const memberWorkspaceResponse = await fetch(
        `${url}/rest/v1/business_workspaces?select=id,owner_id,name,status,seat_limit,created_at&id=in.(${workspaceIds.join(",")})&status=eq.active&order=created_at.asc`,
        { headers, cache: "no-store" }
      );

      if (!memberWorkspaceResponse.ok) {
        return NextResponse.json({ error: "Team workspaces could not be loaded." }, { status: 500 });
      }

      memberWorkspaces = (await memberWorkspaceResponse.json()) as BusinessWorkspaceRow[];
    }

    const workspaces = Array.from(
      new Map(
        [...ownedWorkspaces, ...memberWorkspaces].map((workspace) => [
          workspace.id,
          workspace,
        ])
      ).values()
    );

    return NextResponse.json({
      workspaces: workspaces.map((workspace) => ({
        ...workspace,
        access_role:
          workspace.owner_id === user.id
            ? "owner"
            : roleByWorkspace.get(workspace.id) ?? "member",
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Team workspaces could not be loaded.",
      },
      { status: 500 }
    );
  }
}
