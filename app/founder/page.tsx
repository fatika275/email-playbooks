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
  const founderBenefits = [
    {
      label: "Full Pro workflow",
      copy: "Pipeline, follow-ups, saved work, and agency templates for moving outreach into booked calls.",
    },
    {
      label: "Locked early price",
      copy: "Keep your approved Founder monthly rate while your subscription stays active.",
    },
    {
      label: "Built for agencies",
      copy: "Prospects, proposals, retainers, win-backs, and deal chasing without broad CRM baggage.",
    },
  ];

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
        <section className="founderHero">
          <div className="founderHeroCopy">
            <span
              className={
                founderEligible
                  ? "founderStatus founderStatusLive"
                  : "founderStatus"
              }
            >
              {founderEligible ? "Founder checkout unlocked" : "Invite-only Founder Pro"}
            </span>
            <h1>Lock in the early agency rate for the full Pro workflow.</h1>
            <p>
              Founder Pro is for selected early users who want Thalovo to help
              turn outreach into booked client work without paying the standard
              Pro price.
            </p>

            <div className="founderHeroActions">
              {founderEligible ? (
                <CheckoutButton
                  plan="founder"
                  className="button buttonPrimary founderHeroButton"
                >
                  Start Founder Pro
                </CheckoutButton>
              ) : user ? (
                <a href="#founder-request" className="button buttonPrimary founderHeroButton">
                  Continue with this account
                </a>
              ) : (
                <Link href="/account" className="button buttonPrimary founderHeroButton">
                  Sign in to request Founder
                </Link>
              )}
              <Link href="/pricing" className="button buttonSecondary founderHeroSecondary">
                Compare plans
              </Link>
            </div>
          </div>

          <aside className="founderPricePanel" aria-label="Founder Pro price">
            <span>{founderEligible ? "Approved price" : "Early rate"}</span>
            <strong>{founderPriceLabel}</strong>
            <small>/month locked while active</small>
            <div className="founderPriceLine" />
            <p>One individual account. Choose Business Pro when teammates need shared access.</p>
          </aside>
        </section>

        <section className="founderBenefitGrid" aria-label="Founder Pro benefits">
          {founderBenefits.map((benefit) => (
            <article key={benefit.label}>
              <span>{benefit.label}</span>
              <p>{benefit.copy}</p>
            </article>
          ))}
        </section>

        {!founderEligible ? (
          <section className="founderRequestPanel" id="founder-request">
            <h2>Confirm your email</h2>
            <p>
              {user
                ? "Send the request from your signed-in account. If approved, the Founder checkout unlocks for this email."
                : "Create or sign into your account first so the request is linked to the right email."}
            </p>

            {!user ? (
              <div className="founderSignupActions">
                <Link href="/account" className="button buttonPrimary">
                  Sign in first
                </Link>
                <Link href="/pricing" className="button buttonSecondary">
                  Back to pricing
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="founderRequestForm">
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
                <p className="small">
                  Requests are tied to your account so approval unlocks the
                  right checkout.
                </p>

                <div className="founderSignupActions">
                  <button className="button buttonPrimary" type="submit">
                    Register interest
                  </button>
                  <Link href="/pricing" className="button buttonSecondary">
                    Back to pricing
                  </Link>
                </div>
              </form>
            )}

            {notice ? <p className="notice">{notice}</p> : null}
          </section>
        ) : null}
      </section>
    </main>
  );
}
