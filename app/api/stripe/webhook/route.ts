import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { normalizePlan } from "@/lib/plans";
import { updateUserPlan } from "@/lib/server-auth";

type StripeCheckoutSession = {
  id: string;
  customer?: string;
  subscription?: string;
  customer_email?: string;
  payment_status?: string;
  metadata?: {
    user_id?: string;
    plan?: string;
  };
};

type StripeSubscription = {
  id: string;
  customer?: string;
  status?: string;
  metadata?: {
    user_id?: string;
    plan?: string;
  };
};

const activeSubscriptionStatuses = new Set(["active", "trialing"]);
const endedSubscriptionStatuses = new Set([
  "canceled",
  "incomplete_expired",
  "paused",
  "unpaid",
]);

function verifyStripeSignature(payload: string, signatureHeader: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("Stripe webhook secret is missing.");
  }

  const parts = signatureHeader.split(",");
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signature = parts.find((part) => part.startsWith("v1="))?.slice(3);

  if (!timestamp || !signature) {
    throw new Error("Stripe signature is malformed.");
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    throw new Error("Stripe signature could not be verified.");
  }
}

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  try {
    verifyStripeSignature(payload, signature);
    const event = JSON.parse(payload) as {
      type: string;
      data: { object: StripeCheckoutSession | StripeSubscription };
    };

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as StripeCheckoutSession;
      const userId = session.metadata?.user_id;
      const plan = normalizePlan(session.metadata?.plan);

      if (userId && plan !== "free" && session.payment_status === "paid") {
        await updateUserPlan({
          userId,
          email: session.customer_email,
          plan,
          stripeCustomerId: session.customer ?? null,
          stripeSubscriptionId: session.subscription ?? null,
        });
      }
    }

    if (
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.paused"
    ) {
      const subscription = event.data.object as StripeSubscription;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        await updateUserPlan({
          userId,
          plan: "free",
          stripeCustomerId: subscription.customer ?? null,
          stripeSubscriptionId: subscription.id,
        });
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as StripeSubscription;
      const userId = subscription.metadata?.user_id;
      const plan = normalizePlan(subscription.metadata?.plan);
      const status = subscription.status || "";

      if (userId && plan !== "free" && activeSubscriptionStatuses.has(status)) {
        await updateUserPlan({
          userId,
          plan,
          stripeCustomerId: subscription.customer ?? null,
          stripeSubscriptionId: subscription.id,
        });
      }

      if (userId && endedSubscriptionStatuses.has(status)) {
        await updateUserPlan({
          userId,
          plan: "free",
          stripeCustomerId: subscription.customer ?? null,
          stripeSubscriptionId: subscription.id,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook could not be handled.",
      },
      { status: 400 }
    );
  }
}
