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

export function CheckoutButton({
  plan,
  children,
  className = "button buttonPrimary",
}: CheckoutButtonProps) {
  const { user, plan: currentPlan } = useAccount();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const hasPaidPlan = currentPlan !== "free";

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
      const endpoint = hasPaidPlan ? "/api/billing/portal" : "/api/checkout";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: hasPaidPlan ? undefined : JSON.stringify({ plan }),
      });

      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };

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
          ? hasPaidPlan
            ? "Opening subscription..."
            : "Opening checkout..."
          : children}
      </button>
      {hasPaidPlan ? (
        <p className="notice">
          You already have a paid plan. Manage your subscription to change,
          cancel, or update billing.
        </p>
      ) : null}
      {message ? <p className="notice">{message}</p> : null}
    </div>
  );
}
