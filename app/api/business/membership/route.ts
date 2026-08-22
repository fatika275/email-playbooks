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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");

    if (!accessToken) {
      return NextResponse.json({ membership: null });
    }

    const user = await getUserFromAccessToken(accessToken);
    const email = user.email?.trim().toLowerCase();
    const { url, serviceRoleKey } = getSupabaseServerConfig();
    const headers = {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    };

    let memberResponse = await fetch(
      `${url}/rest/v1/business_members?select=id,workspace_id,email,user_id,role,custom_role_id,status,access_active,created_at&user_id=eq.${encodeURIComponent(user.id)}&status=eq.active&access_active=eq.true`,
      { headers, cache: "no-store" }
    );

    if (!memberResponse.ok) {
      return NextResponse.json({ error: "Workspace membership could not be checked." }, { status: 500 });
    }

    let members = (await memberResponse.json()) as BusinessMemberRow[];

    if (!members.length && email) {
      memberResponse = await fetch(
        `${url}/rest/v1/business_members?select=id,workspace_id,email,user_id,role,custom_role_id,status,access_active,created_at&email=ilike.${encodeURIComponent(email)}&status=eq.active&access_active=eq.true`,
        { headers, cache: "no-store" }
      );

      if (!memberResponse.ok) {
        return NextResponse.json({ error: "Workspace membership could not be checked." }, { status: 500 });
      }

      const emailMatches = (await memberResponse.json()) as BusinessMemberRow[];
      const matchingMember = emailMatches[0];

      if (matchingMember) {
        const updateResponse = await fetch(
          `${url}/rest/v1/business_members?id=eq.${encodeURIComponent(matchingMember.id)}`,
          {
            method: "PATCH",
            headers: {
              ...headers,
              prefer: "return=representation",
            },
            body: JSON.stringify({
              user_id: user.id,
              updated_at: new Date().toISOString(),
            }),
          }
        );

        if (!updateResponse.ok) {
          return NextResponse.json({ error: "Workspace membership could not be linked." }, { status: 500 });
        }

        members = (await updateResponse.json()) as BusinessMemberRow[];
      }
    }

    for (const member of members) {
      const workspaceResponse = await fetch(
        `${url}/rest/v1/business_workspaces?select=id,status&id=eq.${encodeURIComponent(member.workspace_id)}&status=eq.active&limit=1`,
        { headers, cache: "no-store" }
      );

      if (!workspaceResponse.ok) {
        return NextResponse.json({ error: "Workspace membership could not be checked." }, { status: 500 });
      }

      const workspaces = (await workspaceResponse.json()) as BusinessWorkspaceRow[];
      if (workspaces.length) {
        return NextResponse.json({ membership: member });
      }
    }

    return NextResponse.json({ membership: null });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Workspace membership could not be checked.",
      },
      { status: 500 }
    );
  }
}
