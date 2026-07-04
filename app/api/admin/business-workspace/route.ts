import { NextResponse } from "next/server";
import {
  getIsUserAdminServer,
  getUserFromAccessToken,
  updateUserPlan,
} from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";
    if (!accessToken) {
      return NextResponse.json({ error: "Sign in again before granting access." }, { status: 401 });
    }

    const user = await getUserFromAccessToken(accessToken);
    if (!(await getIsUserAdminServer(user.id))) {
      return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
    }

    await updateUserPlan({
      userId: user.id,
      email: user.email ?? null,
      plan: "business",
    });

    return NextResponse.json({ ready: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Business Pro access could not be granted." },
      { status: 500 }
    );
  }
}
