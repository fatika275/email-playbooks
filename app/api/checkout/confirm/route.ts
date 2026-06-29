import { NextRequest, NextResponse } from "next/server";
import { PLAN_LABELS, normalizePlan } from "@/lib/plans";
import { getUserFromAccessToken, updateUserPlan } from "@/lib/server-auth";

type StripeCheckoutSession = {
  customer?: string;
  subscription?: string;
  customer_email?: string;
  payment_status?: string;
  metadata?: { user_id?: string; plan?: string };
};

export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Stripe is not configured yet." },
        { status: 500 }
      );
    }

    const accessToken = (request.headers.get("authorization") || "").replace(
      /^Bearer\s+/i,
      ""
    );
    if (!accessToken) {
      return NextResponse.json(
        { error: "Sign in to confirm this payment." },
        { status: 401 }
      );
    }

    const { sessionId } = (await request.json()) as { sessionId?: string };
    if (!sessionId || !sessionId.startsWith("cs_")) {
      return NextResponse.json(
        { error: "This checkout session is invalid." },
        { status: 400 }
      );
    }

    const user = await getUserFromAccessToken(accessToken);
    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      {
        headers: { authorization: `Bearer ${stripeSecretKey}` },
        cache: "no-store",
      }
    );
    const session = (await stripeResponse.json()) as StripeCheckoutSession & {
      error?: { message?: string };
    };

    if (!stripeResponse.ok) {
      return NextResponse.json(
        { error: session.error?.message || "Payment could not be confirmed." },
        { status: 400 }
      );
    }

    if (session.metadata?.user_id !== user.id) {
      return NextResponse.json(
        { error: "This payment belongs to a different account." },
        { status: 403 }
      );
    }

    const plan = normalizePlan(session.metadata?.plan);
    if (plan === "free" || session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Stripe has not confirmed this payment yet." },
        { status: 409 }
      );
    }

    await updateUserPlan({
      userId: user.id,
      email: session.customer_email || user.email,
      plan,
      stripeCustomerId: session.customer ?? null,
      stripeSubscriptionId: session.subscription ?? null,
    });

    return NextResponse.json({
      confirmed: true,
      plan,
      planLabel: PLAN_LABELS[plan],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Payment could not be confirmed.",
      },
      { status: 500 }
    );
  }
}
