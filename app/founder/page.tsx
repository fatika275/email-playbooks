"use client";

import { useState } from "react";
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
  const [notice, setNotice] = useState("");
  const founderBenefits = [
    {
      label: "Full Pro workflow",
      copy: "Pipeline, follow-ups, saved work, and agency templates for moving outreach into booked calls.",
    },
    {
      label: "Locked early price",
      copy: "Keep your approved Founder monthly rate while the subscription stays active. If you cancel or switch away, the Founder rate may not be available again.",
    },
    {
      label: "Built for agencies",
      copy: "Prospects, proposals, retainers, win-backs, and deal chasing without broad CRM baggage.",
    },
  ];

  async function handleRegisterInterest() {
    if (!user) {
      setNotice("Sign in first, then you can join the Founder waitlist.");
      return;
    }

    const normalizedEmail = (user.email || "").trim().toLowerCase();

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
      "Founder interest registered. If approved, you will get an email from Thalovo; check spam or promotions if it does not show up."
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
              Pro price. Founder is approval-only, so users can switch away from
              it later but cannot switch into it from the billing portal.
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
                <button
                  className="button buttonPrimary founderHeroButton"
                  onClick={() => void handleRegisterInterest()}
                >
                  Register your interest
                </button>
              ) : (
                <Link href="/account" className="button buttonPrimary founderHeroButton">
                  Sign in to request Founder
                </Link>
              )}
              <Link href="/pricing#compare-plans" className="button buttonSecondary founderHeroSecondary">
                Compare plans
              </Link>
            </div>
            {notice ? <p className="notice">{notice}</p> : null}
          </div>

          <aside className="founderPricePanel" aria-label="Founder Pro price">
            <span>{founderEligible ? "Approved price" : "Early rate"}</span>
            <strong>{founderPriceLabel}</strong>
            <small>/month locked while active</small>
            <div className="founderPriceLine" />
            <p>
              Limited early-user rate. Keep it active to keep the price; choose
              Business Pro when teammates need shared access.
            </p>
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

      </section>
    </main>
  );
}
