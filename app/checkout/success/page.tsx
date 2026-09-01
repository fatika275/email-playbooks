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
        <div className="checkoutSuccessShell">
          <div className="checkoutSuccessPanel">
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

            <div className="checkoutSuccessHeader">
              <h1 className="pageTitle">
                {state === "confirmed"
                  ? `${planLabel} is ready`
                  : "Finishing your plan setup"}
              </h1>
              <p className="muted">{message}</p>
            </div>

            <div className="checkoutSuccessStatus" role="status">
              <strong>
                {state === "confirmed"
                  ? "Your account has been updated."
                  : state === "error"
                    ? "We could not finish activation automatically."
                    : "This usually takes a few seconds."}
              </strong>
              <span>
                {state === "confirmed"
                  ? "You can now use the paid workflow across your saved work, pipeline, and follow-ups."
                  : state === "error"
                    ? "Open your account page and try syncing again, or check the payment in Stripe."
                    : "Keep this page open while Thalovo confirms the checkout session."}
              </span>
            </div>

            <div className="checkoutSuccessActions">
              {state === "confirmed" ? (
                <>
                  <Link href="/prospects" className="button buttonPrimary">
                    Open pipeline
                  </Link>
                  <Link href="/workspace" className="button buttonSecondary">
                    Open saved work
                  </Link>
                </>
              ) : null}
              <Link href="/account" className="button buttonUtility">
                View account
              </Link>
            </div>
          </div>

          {state === "confirmed" ? (
            <div className="checkoutSuccessNext">
              <span className="miniBadge">Next</span>
              <h2>Put the plan to work</h2>
              <div>
                <Link href="/library">Write or reuse an outreach message</Link>
                <Link href="/prospects">Move a lead through the pipeline</Link>
                <Link href="/sequence-builder">Build a follow-up plan</Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
