"use client";

import { useState } from "react";
import { useAccount } from "@/components/account-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { PlanId } from "@/lib/plans";

type CheckoutButtonProps = {
  plan: Exclude<PlanId, "free">;
  children: string;
  className?: string;
};

const planLabels: Record<Exclude<PlanId, "free">, string> = {
  pro: "Pro",
  founder: "Founder Pro",
  business: "Business Pro",
};

type PlanChangePreview = {
  amountDue: number;
  total: number;
  currency: string;
  amountDueLabel: string;
  totalLabel: string;
  prorationDate: number;
};

export function CheckoutButton({
  plan,
  children,
  className = "button buttonPrimary",
}: CheckoutButtonProps) {
  const { user, plan: currentPlan, syncNow } = useAccount();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmingPlanChange, setIsConfirmingPlanChange] = useState(false);
  const [planChangePreview, setPlanChangePreview] =
    useState<PlanChangePreview | null>(null);

  const hasPaidPlan = currentPlan !== "free";
  const canChangePlanInApp =
    hasPaidPlan &&
    currentPlan !== plan &&
    (plan === "pro" || plan === "business");

  async function handleCheckout() {
    setMessage("");

    if (!user) {
      setMessage("Create or sign into your account first, then choose a plan.");
      return;
    }

    const client = getSupabaseBrowserClient();
    const refreshed = await client?.auth.refreshSession();
    const accessToken = refreshed?.data.session?.access_token;

    if (refreshed?.error || !accessToken) {
      setMessage("Please sign in again before checkout.");
      return;
    }

    try {
      setIsLoading(true);
      const endpoint = canChangePlanInApp
        ? "/api/billing/change-plan"
        : hasPaidPlan
          ? "/api/billing/portal"
          : "/api/checkout";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body:
          canChangePlanInApp
            ? JSON.stringify({
                plan,
                previewOnly: !isConfirmingPlanChange,
                prorationDate: planChangePreview?.prorationDate,
              })
            : !hasPaidPlan
            ? JSON.stringify({ plan })
            : undefined,
      });

      const payload = (await response.json()) as {
        url?: string;
        error?: string;
        planLabel?: string;
        preview?: PlanChangePreview;
      };

      if (canChangePlanInApp) {
        if (!response.ok) {
          throw new Error(payload.error || "Plan could not be changed.");
        }

        if (!isConfirmingPlanChange) {
          const preview = payload.preview;
          if (!preview) {
            throw new Error("Stripe could not calculate this plan change.");
          }

          setPlanChangePreview(preview);
          setIsConfirmingPlanChange(true);
          setMessage(
            preview.amountDue > 0
              ? `Stripe will charge ${preview.amountDueLabel} now to switch from ${planLabels[currentPlan as Exclude<PlanId, "free">] || "your current plan"} to ${planLabels[plan]}.`
              : preview.total < 0
                ? `Stripe shows ${preview.totalLabel} as credit from this switch. No extra payment is due now.`
                : `Stripe shows no extra payment due now for this switch.`
          );
          return;
        }

        await syncNow().catch(() => undefined);
        setIsConfirmingPlanChange(false);
        setPlanChangePreview(null);
        setMessage(
          `${payload.planLabel || "Your new plan"} is active on this account.`
        );
        return;
      }

      if (!response.ok || !payload.url) {
        throw new Error(
          payload.error ||
            (hasPaidPlan
              ? "Subscription management could not be opened."
              : "Checkout could not be started.")
        );
      }

      window.location.href = payload.url;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : hasPaidPlan
            ? "Subscription management could not be opened."
            : "Checkout could not be started."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button className={className} disabled={isLoading} onClick={handleCheckout}>
        {isLoading
          ? canChangePlanInApp
            ? "Switching plan..."
            : hasPaidPlan
            ? "Opening subscription..."
            : "Opening checkout..."
          : canChangePlanInApp && isConfirmingPlanChange
            ? `Confirm switch to ${planLabels[plan]}`
          : children}
      </button>
      {canChangePlanInApp && isConfirmingPlanChange ? (
        <button
          type="button"
          className="button buttonUtility"
          style={{ marginTop: 10 }}
          onClick={() => {
            setIsConfirmingPlanChange(false);
            setPlanChangePreview(null);
            setMessage("");
          }}
        >
          Cancel
        </button>
      ) : null}
      {hasPaidPlan && !canChangePlanInApp ? (
        <p className="notice">
          You already have a paid plan. Manage your subscription to change,
          cancel, or update billing.
        </p>
      ) : null}
      {message ? <p className="notice">{message}</p> : null}
    </div>
  );
}
