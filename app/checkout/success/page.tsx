"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/account-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type ConfirmationState = "checking" | "confirmed" | "error";

export default function CheckoutSuccessPage() {
  const { user, isLoading, syncNow } = useAccount();
  const hasStarted = useRef(false);
  const [state, setState] = useState<ConfirmationState>("checking");
  const [planLabel, setPlanLabel] = useState("your plan");
  const [message, setMessage] = useState(
    "Confirming your payment with Stripe..."
  );

  useEffect(() => {
    if (isLoading || hasStarted.current) return;
    hasStarted.current = true;

    async function confirmPayment() {
      if (!user) {
        throw new Error("Sign in again to finish activating your plan.");
      }

      const sessionId = new URLSearchParams(window.location.search).get(
        "session_id"
      );
      if (!sessionId) {
        throw new Error("The Stripe checkout reference is missing.");
      }

      const client = getSupabaseBrowserClient();
      const refreshed = await client?.auth.refreshSession();
      const accessToken = refreshed?.data.session?.access_token;
      if (refreshed?.error || !accessToken) {
        throw new Error("Sign in again to finish activating your plan.");
      }

      const response = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ sessionId }),
      });
      const payload = (await response.json()) as {
        confirmed?: boolean;
        planLabel?: string;
        error?: string;
      };

      if (!response.ok || !payload.confirmed) {
        throw new Error(payload.error || "Payment could not be confirmed.");
      }

      await syncNow();
      setPlanLabel(payload.planLabel || "your plan");
      setMessage("Your payment is confirmed and your account is ready.");
      setState("confirmed");
    }

    void confirmPayment().catch((error) => {
      setMessage(
        error instanceof Error
          ? error.message
          : "Payment could not be confirmed."
      );
      setState("error");
    });
  }, [isLoading, syncNow, user]);

  return (
    <main className="main">
      <section className="container">
        <div className="glassCard emptyState">
          <span
            className={
              state === "confirmed"
                ? "statusPill statusPillSuccess"
                : state === "error"
                  ? "statusPill statusPillWarning"
                  : "statusPill statusPillNeutral"
            }
          >
            {state === "confirmed"
              ? "Payment confirmed"
              : state === "error"
                ? "Activation needs attention"
                : "Checking payment"}
          </span>

          <h1 className="pageTitle" style={{ marginTop: 18 }}>
            {state === "confirmed"
              ? `Welcome to ${planLabel}`
              : "Finishing your account setup"}
          </h1>
          <p className="muted" style={{ maxWidth: 620, lineHeight: 1.75 }}>
            {message}
          </p>

          <div className="toolbar" style={{ marginTop: 22 }}>
            {state === "confirmed" ? (
              <Link href="/workspace" className="button buttonPrimary">
                Open saved work
              </Link>
            ) : null}
            <Link href="/account" className="button buttonSecondary">
              View account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
