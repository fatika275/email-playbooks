import { NextRequest, NextResponse } from "next/server";
import { normalizePlan, type PlanId } from "@/lib/plans";
import { getUserFromAccessToken, updateUserPlan } from "@/lib/server-auth";

const refundWindowDays = 7;

type BillingProfile = {
  email?: string | null;
  plan?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
};

type StripeSubscription = {
  id: string;
  customer?: string | null;
  latest_invoice?: string | { id?: string } | null;
  error?: {
    message?: string;
  };
};

type StripeInvoice = {
  id: string;
  amount_paid?: number | null;
  charge?: string | { id?: string } | null;
  created?: number | null;
  payment_intent?: string | { id?: string } | null;
  payments?: {
    data?: StripeInvoicePayment[];
  } | null;
  status?: string | null;
  error?: {
    message?: string;
  };
};

type StripeInvoicePayment = {
  payment?: {
    charge?: string | { id?: string } | null;
    payment_intent?: string | { id?: string } | null;
    type?: string | null;
  } | null;
  status?: string | null;
};

type StripeInvoicePaymentList = {
  data?: StripeInvoicePayment[];
  error?: {
    message?: string;
  };
};

type StripeRefund = {
  id: string;
  status?: string | null;
  error?: {
    message?: string;
  };
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

function getStripeObjectId(value: string | { id?: string } | null | undefined) {
  if (!value) return "";
  return typeof value === "string" ? value : value.id || "";
}

async function getBillingProfile(userId: string) {
  const { url, serviceRoleKey } = getSupabaseServerConfig();
  const response = await fetch(
    `${url}/rest/v1/user_profiles?select=email,plan,stripe_customer_id,stripe_subscription_id&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Your billing profile could not be checked.");
  }

  const profiles = (await response.json()) as BillingProfile[];
  return profiles[0] ?? null;
}

async function getStripeSubscription(subscriptionId: string, stripeSecretKey: string) {
  const response = await fetch(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      headers: {
        authorization: `Bearer ${stripeSecretKey}`,
      },
      cache: "no-store",
    }
  );
  const payload = (await response.json()) as StripeSubscription;

  if (!response.ok) {
    throw new Error(payload.error?.message || "Stripe subscription could not be loaded.");
  }

  return payload;
}

async function getStripeInvoice(invoiceId: string, stripeSecretKey: string) {
  const params = new URLSearchParams();
  params.append("expand[]", "payments.data.payment.payment_intent");
  params.append("expand[]", "payments.data.payment.charge");

  const response = await fetch(
    `https://api.stripe.com/v1/invoices/${encodeURIComponent(invoiceId)}?${params.toString()}`,
    {
      headers: {
        authorization: `Bearer ${stripeSecretKey}`,
      },
      cache: "no-store",
    }
  );
  const payload = (await response.json()) as StripeInvoice;

  if (!response.ok) {
    throw new Error(payload.error?.message || "Stripe invoice could not be loaded.");
  }

  return payload;
}

async function listStripeInvoicePayments(invoiceId: string, stripeSecretKey: string) {
  const params = new URLSearchParams({
    invoice: invoiceId,
    limit: "10",
  });

  const response = await fetch(
    `https://api.stripe.com/v1/invoice_payments?${params.toString()}`,
    {
      headers: {
        authorization: `Bearer ${stripeSecretKey}`,
      },
      cache: "no-store",
    }
  );
  const payload = (await response.json()) as StripeInvoicePaymentList;

  if (!response.ok) {
    throw new Error(
      payload.error?.message || "Stripe invoice payments could not be loaded."
    );
  }

  return payload.data ?? [];
}

function getRefundablePaymentFromInvoicePayments(payments: StripeInvoicePayment[]) {
  for (const invoicePayment of payments) {
    if (invoicePayment.status && invoicePayment.status !== "paid") continue;

    const paymentIntentId = getStripeObjectId(
      invoicePayment.payment?.payment_intent
    );
    const chargeId = getStripeObjectId(invoicePayment.payment?.charge);

    if (paymentIntentId || chargeId) {
      return { paymentIntentId, chargeId };
    }
  }

  return { paymentIntentId: "", chargeId: "" };
}

async function createStripeRefund(options: {
  chargeId: string;
  paymentIntentId: string;
  stripeSecretKey: string;
  userId: string;
}) {
  const form = new URLSearchParams();
  if (options.paymentIntentId) {
    form.set("payment_intent", options.paymentIntentId);
  } else {
    form.set("charge", options.chargeId);
  }
  form.set("reason", "requested_by_customer");
  form.set("metadata[source]", "thalovo_self_serve_refund");
  form.set("metadata[user_id]", options.userId);

  const response = await fetch("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: {
      authorization: `Bearer ${options.stripeSecretKey}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const payload = (await response.json()) as StripeRefund;

  if (!response.ok) {
    throw new Error(payload.error?.message || "Stripe refund could not be created.");
  }

  return payload;
}

async function cancelStripeSubscriptionImmediately(
  subscriptionId: string,
  stripeSecretKey: string
) {
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

export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Stripe is not configured yet." },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return NextResponse.json(
        { error: "Sign in before requesting a refund." },
        { status: 401 }
      );
    }

    const user = await getUserFromAccessToken(accessToken);
    const profile = await getBillingProfile(user.id);
    const currentPlan = normalizePlan(profile?.plan);

    if (currentPlan === "free") {
      return NextResponse.json(
        { error: "This account does not have an active paid plan to refund." },
        { status: 409 }
      );
    }

    const subscriptionId = profile?.stripe_subscription_id;
    if (!subscriptionId) {
      return NextResponse.json(
        { error: "No Stripe subscription was found for this account." },
        { status: 404 }
      );
    }

    const subscription = await getStripeSubscription(subscriptionId, stripeSecretKey);
    const invoiceId = getStripeObjectId(subscription.latest_invoice);
    if (!invoiceId) {
      return NextResponse.json(
        { error: "No paid invoice was found for this subscription." },
        { status: 404 }
      );
    }

    const invoice = await getStripeInvoice(invoiceId, stripeSecretKey);
    const paidAt = invoice.created ?? 0;
    const paidAmount = invoice.amount_paid ?? 0;
    const ageInSeconds = Math.floor(Date.now() / 1000) - paidAt;
    const isInsideRefundWindow = ageInSeconds <= refundWindowDays * 24 * 60 * 60;

    if (invoice.status !== "paid" || paidAmount <= 0) {
      return NextResponse.json(
        { error: "The latest invoice is not a refundable paid subscription charge." },
        { status: 409 }
      );
    }

    if (!isInsideRefundWindow) {
      return NextResponse.json(
        {
          error: `Refund not submitted. Automatic refunds are only available within ${refundWindowDays} days of payment. Please contact support if you still need help with this charge.`,
        },
        { status: 409 }
      );
    }

    const invoicePayment = getRefundablePaymentFromInvoicePayments(
      invoice.payments?.data ?? []
    );
    let paymentIntentId =
      getStripeObjectId(invoice.payment_intent) || invoicePayment.paymentIntentId;
    let chargeId = getStripeObjectId(invoice.charge) || invoicePayment.chargeId;

    if (!paymentIntentId && !chargeId) {
      const invoicePayments = await listStripeInvoicePayments(
        invoice.id,
        stripeSecretKey
      );
      const listedPayment =
        getRefundablePaymentFromInvoicePayments(invoicePayments);
      paymentIntentId = listedPayment.paymentIntentId;
      chargeId = listedPayment.chargeId;
    }

    if (!paymentIntentId && !chargeId) {
      return NextResponse.json(
        {
          error:
            "Refund not submitted. Stripe could not find the card payment attached to this invoice.",
        },
        { status: 409 }
      );
    }

    const refund = await createStripeRefund({
      chargeId,
      paymentIntentId,
      stripeSecretKey,
      userId: user.id,
    });

    await cancelStripeSubscriptionImmediately(subscriptionId, stripeSecretKey);
    await updateUserPlan({
      userId: user.id,
      email: profile?.email || user.email,
      plan: "free" as PlanId,
      stripeCustomerId: profile?.stripe_customer_id ?? subscription.customer ?? null,
      stripeSubscriptionId: null,
    });

    return NextResponse.json({
      refunded: true,
      refundId: refund.id,
      status: refund.status,
      message:
        "Refund submitted. Your paid access has been removed and Stripe will send the money back to the original payment method.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Refund could not be requested.",
      },
      { status: 500 }
    );
  }
}
