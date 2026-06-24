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
  const { user } = useAccount();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan }),
      });

      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Checkout could not be started.");
      }

      window.location.href = payload.url;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Checkout could not be started."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button className={className} disabled={isLoading} onClick={handleCheckout}>
        {isLoading ? "Opening checkout..." : children}
      </button>
      {message ? <p className="notice">{message}</p> : null}
    </div>
  );
}
