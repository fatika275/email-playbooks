"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/account-provider";
import { CheckoutButton } from "@/components/checkout-button";
import { trackEvent } from "@/lib/analytics";
import { registerFounderInterest } from "@/lib/cloud";

export default function FounderPage() {
  const {
    user,
    founderEligible,
    founderPriceGbp,
    isConfigured,
  } = useAccount();
  const founderPriceLabel =
    founderPriceGbp !== null ? `GBP ${founderPriceGbp}` : "GBP 12";
  const [email, setEmail] = useState(user?.email ?? "");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setNotice("Sign in first, then you can join the Founder waitlist.");
      return;
    }

    const normalizedEmail = (user.email || email).trim().toLowerCase();

    if (!normalizedEmail) {
      setNotice("Your signed-in account needs an email address first.");
      return;
    }

    if (isConfigured) {
      try {
        await registerFounderInterest(normalizedEmail, user.id);
      } catch {
        setNotice(
          "Founder interest could not be saved in Supabase. Please try again later."
        );
        return;
      }
    }

    trackEvent("founder_interest_registered");
    setNotice(
      "Founder interest registered. If your account is selected, Founder Pro will unlock on pricing."
    );
  }

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Founder Pro</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Lock in the early supporter price.
          </h1>
          <p className="muted" style={{ maxWidth: 760, lineHeight: 1.75 }}>
            Founder Pro is for selected early users who want full Pro at a
            lower monthly price while Thalovo keeps improving. It is one
            individual account, not a team plan; choose Business Pro when
            teammates need shared pipeline access.
          </p>
        </div>

        <div className="founderPageLayout">
          <section className="glassCard founderFeatureCard">
            <span
              className={
                founderEligible
                  ? "statusPill statusPillSuccess"
                  : "statusPill statusPillWarning"
              }
            >
              {founderEligible ? "Unlocked on this account" : "Invite-only"}
            </span>

            <h2 className="pageTitle" style={{ marginTop: 16 }}>
              {founderPriceLabel}
              <span className="muted">/month locked</span>
            </h2>

            <p className="muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
              If your account is approved, Founder checkout unlocks on this
              account. Payment activates the locked early supporter price.
            </p>

            <ul className="featureList">
              <li>Everything in Pro</li>
              <li>Prospect pipeline and follow-up tracking</li>
              <li>Access for one individual account</li>
              <li>Locked Founder Pro monthly price</li>
              <li>Full agency use-case library for outreach, follow-up, proposal chase, and win-back</li>
              <li>Full follow-up builder</li>
              <li>Follow-up plans, folders, and saved agency messages</li>
              <li>Team seats are not included</li>
            </ul>

            {founderEligible ? (
              <CheckoutButton plan="founder">Start Founder</CheckoutButton>
            ) : null}
          </section>

          <section className="glassCard founderFeatureCard">
            <h2 className="cardTitle">
              {founderEligible ? "Founder checkout unlocked" : "Register interest"}
            </h2>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
              {founderEligible
                ? "Your account is approved for the early supporter price. Complete checkout to activate Founder Pro."
                : user
                  ? "Join the Founder waitlist with your signed-in account. If selected, the Founder checkout unlocks on pricing."
                  : "Sign in or create an account first so your Founder request can be linked to a real profile for approval."}
            </p>

            {!founderEligible && !user ? (
              <div className="toolbar" style={{ marginTop: 20 }}>
                <Link href="/account" className="button buttonPrimary">
                  Sign in to join waitlist
                </Link>
                <Link href="/pricing" className="button buttonSecondary">
                  Back to pricing
                </Link>
              </div>
            ) : !founderEligible ? (
              <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
                <div className="formGroup">
                  <label className="label" htmlFor="founder-email">
                    Signed-in email
                  </label>
                  <input
                    id="founder-email"
                    className="input"
                    type="email"
                    value={user?.email ?? email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    disabled={Boolean(user?.email)}
                    required
                  />
                  <p className="small" style={{ marginTop: 8 }}>
                    Founder requests must be linked to a signed-in account before
                    they can be approved.
                  </p>
                </div>

                <div className="toolbar">
                  <button className="button buttonPrimary" type="submit">
                    Register interest
                  </button>
                  <Link href="/pricing" className="button buttonSecondary">
                    Back to pricing
                  </Link>
                </div>
              </form>
            ) : (
              <div className="toolbar" style={{ marginTop: 20 }}>
                <Link href="/pricing" className="button buttonPrimary">
                  View pricing
                </Link>
                <Link href="/workspace" className="button buttonSecondary">
                  Open saved work
                </Link>
              </div>
            )}

            {notice ? <p className="notice">{notice}</p> : null}
          </section>
        </div>
      </section>
    </main>
  );
}
