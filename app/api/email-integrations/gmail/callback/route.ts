import { NextRequest, NextResponse } from "next/server";
import { completeEmailOAuthCallback } from "@/lib/emailIntegrations";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const redirect = new URL("/prospects?emailIntegration=connected", request.url);

  try {
    if (error) throw new Error(error);
    if (!code || !state) throw new Error("Gmail did not finish connecting.");
    await completeEmailOAuthCallback("gmail", code, state);
  } catch (callbackError) {
    redirect.searchParams.set(
      "emailIntegration",
      callbackError instanceof Error ? callbackError.message : "Gmail could not be connected."
    );
  }

  return NextResponse.redirect(redirect);
}
