import { NextRequest, NextResponse } from "next/server";
import {
  getIsUserAdminServer,
  getUserFromAccessToken,
} from "@/lib/server-auth";

function getSiteUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin || "";
}

function getFounderApprovedHtml(options: {
  checkoutUrl: string;
  founderPriceLabel: string;
}) {
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
              <td align="right" style="color:#d4d4d8;font-size:13px;">Founder access</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:42px 24px 18px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:42px 42px 26px;">
                <div style="color:#71717a;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Founder rate unlocked</div>
                <h1 style="margin:16px 0 0;color:#09090b;font-size:34px;line-height:1.12;font-weight:800;">Your Founder Pro access is approved</h1>
                <p style="margin:18px 0 0;color:#52525b;font-size:16px;line-height:1.75;max-width:560px;">You can now activate Founder Pro and lock in your early Thalovo rate for the full outreach-to-booked-work workflow.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 42px 30px;">
                <a href="${options.checkoutUrl}" style="display:inline-block;background:#050505;color:#ffffff;text-decoration:none;font-weight:700;border-radius:10px;padding:14px 20px;">Activate Founder Pro</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 42px 42px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e4e4e7;border-bottom:1px solid #e4e4e7;">
                  <tr>
                    <td style="padding:20px 0;border-bottom:1px solid #e4e4e7;">
                      <div style="font-size:15px;font-weight:800;color:#09090b;">Locked Founder price</div>
                      <div style="margin-top:6px;font-size:14px;line-height:1.7;color:#52525b;">${options.founderPriceLabel} while your subscription stays active.</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 0;">
                      <div style="font-size:15px;font-weight:800;color:#09090b;">What unlocks</div>
                      <div style="margin-top:6px;font-size:14px;line-height:1.7;color:#52525b;">Pipeline, follow-ups, saved client work, agency templates, and simple reporting.</div>
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
            <tr><td style="color:#71717a;font-size:12px;line-height:1.7;">Sent by Thalovo. If you were not expecting this, you can ignore it.</td></tr>
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
      return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
    }

    const adminUser = await getUserFromAccessToken(accessToken);
    const isAdmin = await getIsUserAdminServer(adminUser.id);

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
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

    const { email, founderPriceGbp } = (await request.json()) as {
      email?: string;
      founderPriceGbp?: number | null;
    };
    const recipient = email?.trim().toLowerCase();

    if (!recipient || !recipient.includes("@")) {
      return NextResponse.json({ error: "Recipient email is missing." }, { status: 400 });
    }

    const siteUrl = getSiteUrl(request);
    const checkoutUrl = `${siteUrl}/pricing`;
    const founderPriceLabel = `GBP ${founderPriceGbp ?? 12}/month`;
    const html = getFounderApprovedHtml({ checkoutUrl, founderPriceLabel });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${resendApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipient,
        subject: "Your Thalovo Founder Pro access is approved",
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
            "Founder approval email could not be sent.",
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
            : "Founder approval email could not be sent.",
      },
      { status: 500 }
    );
  }
}
