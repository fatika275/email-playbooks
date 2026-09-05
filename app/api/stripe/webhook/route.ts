import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { normalizePlan } from "@/lib/plans";
import {
  getUserBillingProfileByStripeCustomerId,
  updateUserPlan,
} from "@/lib/server-auth";

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

type StripeCharge = {
  id: string;
  customer?: string;
  amount?: number;
  amount_refunded?: number;
  refunded?: boolean;
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

async function cancelStripeSubscriptionImmediately(subscriptionId: string) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("Stripe is not configured yet.");
  }

  const response = await fetch(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${stripeSecretKey}`,
      },
    }
  );

  if (response.ok || response.status === 404) return;

  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  throw new Error(payload.error?.message || "Stripe subscription could not be cancelled.");
}

async function removeAccessForRefundedCharge(charge: StripeCharge) {
  const customerId = charge.customer;
  const amount = charge.amount ?? 0;
  const refundedAmount = charge.amount_refunded ?? 0;
  const isFullRefund = Boolean(charge.refunded) && amount > 0 && refundedAmount >= amount;

  if (!customerId || !isFullRefund) return;

  const profile = await getUserBillingProfileByStripeCustomerId(customerId);
  if (!profile) return;

  if (profile.stripe_subscription_id) {
    await cancelStripeSubscriptionImmediately(profile.stripe_subscription_id);
  }

  await updateUserPlan({
    userId: profile.user_id,
    email: profile.email,
    plan: "free",
    stripeCustomerId: profile.stripe_customer_id ?? customerId,
    stripeSubscriptionId: profile.stripe_subscription_id ?? null,
  });
}

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  try {
    verifyStripeSignature(payload, signature);
    const event = JSON.parse(payload) as {
      type: string;
      data: { object: StripeCheckoutSession | StripeSubscription | StripeCharge };
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

    if (event.type === "charge.refunded") {
      await removeAccessForRefundedCharge(event.data.object as StripeCharge);
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
