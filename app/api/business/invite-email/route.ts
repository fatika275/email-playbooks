import { NextRequest, NextResponse } from "next/server";
import { getUserFromAccessToken } from "@/lib/server-auth";

type BusinessWorkspaceRow = {
  id: string;
  name: string | null;
  owner_id: string;
  status: string;
};

type BusinessMemberRow = {
  role: "admin" | "member";
  status: "invited" | "active";
  access_active: boolean;
};

function getSiteUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin || "";
}

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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getInviteHtml(options: {
  workspaceName: string;
  inviteUrl: string;
  recipientEmail: string;
  roleLabel: string;
}) {
  const workspaceName = escapeHtml(options.workspaceName);
  const recipientEmail = escapeHtml(options.recipientEmail);
  const roleLabel = escapeHtml(options.roleLabel);

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#111111;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5;width:100%;">
      <tr>
        <td style="background:#050505;padding:32px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;">
            <tr>
              <td>
                <div style="color:#ffffff;font-size:24px;font-weight:800;">Thalovo</div>
                <div style="margin-top:8px;color:#a1a1aa;font-size:13px;">Outreach into booked client work</div>
              </td>
              <td align="right" style="color:#d4d4d8;font-size:13px;">Team invite</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:42px 24px 18px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:42px 42px 26px;">
                <div style="color:#71717a;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Business Pro workspace</div>
                <h1 style="margin:16px 0 0;color:#09090b;font-size:34px;line-height:1.12;font-weight:800;">You have been invited to ${workspaceName}</h1>
                <p style="margin:18px 0 0;color:#52525b;font-size:16px;line-height:1.75;max-width:560px;">Join the shared Thalovo workspace to see team leads, handoff notes, follow-ups, and saved agency messages in one place.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 42px 30px;">
                <a href="${options.inviteUrl}" style="display:inline-block;background:#050505;color:#ffffff;text-decoration:none;font-weight:700;border-radius:10px;padding:14px 20px;">Join workspace</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 42px 42px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e4e4e7;border-bottom:1px solid #e4e4e7;">
                  <tr>
                    <td style="padding:20px 0;border-bottom:1px solid #e4e4e7;">
                      <div style="font-size:15px;font-weight:800;color:#09090b;">Use this email</div>
                      <div style="margin-top:6px;font-size:14px;line-height:1.7;color:#52525b;">Sign up or sign in with ${recipientEmail}. The invite is matched to that address.</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 0;">
                      <div style="font-size:15px;font-weight:800;color:#09090b;">Access level</div>
                      <div style="margin-top:6px;font-size:14px;line-height:1.7;color:#52525b;">${roleLabel}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 24px 42px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;">
            <tr><td style="color:#71717a;font-size:12px;line-height:1.7;">You are receiving this because someone invited this email address to a Thalovo Business Pro workspace.</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");

    if (!accessToken) {
      return NextResponse.json({ error: "Sign in before sending invites." }, { status: 401 });
    }

    const { workspaceId, inviteId, recipientEmail, role } = (await request.json()) as {
      workspaceId?: string;
      inviteId?: string;
      recipientEmail?: string;
      role?: "admin" | "member";
    };
    const normalizedEmail = recipientEmail?.trim().toLowerCase();

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace is missing." }, { status: 400 });
    }

    if (!inviteId) {
      return NextResponse.json({ error: "Invite is missing." }, { status: 400 });
    }

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return NextResponse.json({ error: "Recipient email is missing." }, { status: 400 });
    }

    const user = await getUserFromAccessToken(accessToken);
    const { url, serviceRoleKey } = getSupabaseServerConfig();
    const headers = {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    };

    const workspaceResponse = await fetch(
      `${url}/rest/v1/business_workspaces?select=id,name,owner_id,status&id=eq.${encodeURIComponent(workspaceId)}&limit=1`,
      { headers, cache: "no-store" }
    );

    if (!workspaceResponse.ok) {
      return NextResponse.json({ error: "Workspace could not be checked." }, { status: 500 });
    }

    const workspaces = (await workspaceResponse.json()) as BusinessWorkspaceRow[];
    const workspace = workspaces[0];

    if (!workspace || workspace.status !== "active") {
      return NextResponse.json({ error: "Active workspace was not found." }, { status: 404 });
    }

    let canInvite = workspace.owner_id === user.id;

    if (!canInvite) {
      const memberResponse = await fetch(
        `${url}/rest/v1/business_members?select=role,status,access_active&workspace_id=eq.${encodeURIComponent(workspaceId)}&user_id=eq.${encodeURIComponent(user.id)}`,
        { headers, cache: "no-store" }
      );

      if (!memberResponse.ok) {
        return NextResponse.json({ error: "Invite permissions could not be checked." }, { status: 500 });
      }

      const memberships = (await memberResponse.json()) as BusinessMemberRow[];
      canInvite = memberships.some(
        (membership) =>
          membership.role === "admin" &&
          membership.status === "active" &&
          membership.access_active
      );
    }

    if (!canInvite) {
      return NextResponse.json({ error: "Only the owner or a team lead can invite teammates." }, { status: 403 });
    }

    const resendApiKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY;
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "Thalovo <accounts@thalovo.com>";

    if (!resendApiKey) {
      return NextResponse.json(
        { error: "Resend is not configured. Add RESEND_API_KEY in Vercel." },
        { status: 500 }
      );
    }

    const siteUrl = getSiteUrl(request);
    const inviteUrl = `${siteUrl}/account?teamInvite=${encodeURIComponent(inviteId)}`;
    const roleLabel =
      role === "admin"
        ? "Team lead - can invite teammates and help manage shared lead access."
        : "Teammate - can work leads, notes, follow-ups, and shared agency messages.";
    const workspaceName = workspace.name || "your agency workspace";
    const html = getInviteHtml({
      workspaceName,
      inviteUrl,
      recipientEmail: normalizedEmail,
      roleLabel,
    });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${resendApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: normalizedEmail,
        subject: `You have been invited to ${workspaceName} on Thalovo`,
        html,
      }),
    });

    const payload = (await resendResponse.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      error?: string;
    };

    if (!resendResponse.ok) {
      return NextResponse.json(
        {
          error:
            payload.message ||
            payload.error ||
            "Team invite email could not be sent.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: payload.id ?? null });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Team invite email could not be sent.",
      },
      { status: 500 }
    );
  }
}
