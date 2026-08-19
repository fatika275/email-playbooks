"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "@/components/account-provider";
import { trackEvent } from "@/lib/analytics";
import { siteConfig } from "@/lib/site-config";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function AccountSettingsPage() {
  const {
    user,
    founderEligible,
    founderPriceGbp,
    planLabel,
    requestPasswordReset,
  } = useAccount();
  const [billingMessage, setBillingMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isOpeningBilling, setIsOpeningBilling] = useState(false);

  const supportEmailHref = `mailto:${encodeURIComponent(
    siteConfig.supportEmail
  )}?subject=${encodeURIComponent("Thalovo account help")}`;
  const refundEmailHref = `mailto:${encodeURIComponent(
    siteConfig.supportEmail
  )}?subject=${encodeURIComponent("Thalovo refund request")}`;

  async function handlePasswordResetRequest() {
    setPasswordMessage("");

    if (!user?.email) {
      setPasswordMessage("We could not find an email address for this account.");
      return;
    }

    try {
      await requestPasswordReset(user.email);
      trackEvent("account_password_reset_requested");
      setPasswordMessage("Password reset email sent to your account email.");
    } catch (error) {
      setPasswordMessage(
        error instanceof Error
          ? error.message
          : "Password reset could not be requested right now."
      );
    }
  }

  async function handleOpenBillingPortal() {
    setBillingMessage("");

    const client = getSupabaseBrowserClient();
    const refreshed = await client?.auth.refreshSession();
    const accessToken = refreshed?.data.session?.access_token;

    if (refreshed?.error || !accessToken) {
      setBillingMessage("Please sign in again before managing your subscription.");
      return;
    }

    setIsOpeningBilling(true);

    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Billing portal could not be opened.");
      }

      window.location.href = payload.url;
    } catch (error) {
      setBillingMessage(
        error instanceof Error
          ? error.message
          : "Billing portal could not be opened."
      );
    } finally {
      setIsOpeningBilling(false);
    }
  }

  return (
    <main className="main">
      <section className="container">
        <div className="accountSettingsHero">
          <Link href="/account" className="button buttonUtility">
            Back to account
          </Link>
          <div className="badge">Settings</div>
          <h1 className="pageTitle">Account settings</h1>
          <p className="muted">
            Manage billing, subscription cancellation, password, refunds, and
            account help in one focused place.
          </p>
        </div>

        {!user ? (
          <section className="accountSettingsPagePanel">
            <h2 className="cardTitle">Sign in to manage settings</h2>
            <p className="muted">
              Account settings are only available after you sign in.
            </p>
            <Link href="/account" className="button buttonPrimary">
              Go to sign in
            </Link>
          </section>
        ) : (
          <section className="accountSettingsPagePanel">
            <div className="accountSettingsList accountSettingsListStandalone" aria-label="Account settings">
              <div className="accountSettingsItem">
                <div>
                  <strong>Email</strong>
                  <span>{user.email ?? "No email connected"}</span>
                </div>
                <a className="button buttonUtility" href={supportEmailHref}>
                  Change
                </a>
              </div>

              <div className="accountSettingsItem">
                <div>
                  <strong>Plan</strong>
                  <span>
                    {founderEligible && founderPriceGbp
                      ? `${planLabel} - Founder GBP ${founderPriceGbp}/month`
                      : planLabel}
                  </span>
                </div>
                <Link className="button buttonSecondary" href="/pricing">
                  Manage
                </Link>
              </div>

              <div className="accountSettingsItem accountSettingsItemImportant">
                <div>
                  <strong>Manage subscription</strong>
                  <span>
                    Open Stripe billing to manage your payment method, invoices,
                    or future renewals.
                  </span>
                  {billingMessage ? (
                    <p className="accountSettingsInlineNotice">{billingMessage}</p>
                  ) : null}
                </div>
                <button
                  className="button buttonSecondary"
                  type="button"
                  disabled={isOpeningBilling}
                  onClick={() => void handleOpenBillingPortal()}
                >
                  {isOpeningBilling ? "Opening..." : "Manage"}
                </button>
              </div>

              <div className="accountSettingsItem">
                <div>
                  <strong>Password</strong>
                  <span>Send a secure reset email to your account address.</span>
                  {passwordMessage ? (
                    <p className="accountSettingsInlineNotice">{passwordMessage}</p>
                  ) : null}
                </div>
                <button
                  className="button buttonUtility"
                  type="button"
                  onClick={() => void handlePasswordResetRequest()}
                >
                  Reset
                </button>
              </div>

              <div className="accountSettingsItem">
                <div>
                  <strong>Refunds</strong>
                  <span>Read the policy or contact support about a charge.</span>
                </div>
                <Link className="button buttonUtility" href="/refunds">
                  Policy
                </Link>
              </div>

              <div className="accountSettingsItem">
                <div>
                  <strong>Support</strong>
                  <span>Ask about billing, refunds, or account changes.</span>
                </div>
                <a className="button buttonUtility" href={refundEmailHref}>
                  Email
                </a>
              </div>

            </div>
          </section>
        )}
      </section>
    </main>
  );
}
