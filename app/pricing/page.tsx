"use client";

import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";
import { useAccount } from "@/components/account-provider";

const plans = [
  {
    name: "Free",
    description: "For testing the message library before tracking live client work.",
    price: "GBP 0",
    cadence: "/month",
    cta: "Start free",
    href: "/library",
    features: [
      "Core outreach templates",
      "Draft, copy, and download messages",
      "Basic saved-message history",
      "No card required",
    ],
  },
  {
    name: "Pro",
    description: "For small agencies turning replies into booked calls and proposals.",
    price: "GBP 19",
    cadence: "/month",
    cta: "Start Pro",
    popular: true,
    note: "Best place to start",
    features: [
      "Agency pipeline for prospects and proposals",
      "Follow-up reminders for warm leads",
      "Outreach, proposal, and win-back templates",
      "Simple reporting on replies, calls, and won work",
    ],
  },
  {
    name: "Business Pro",
    description: "For small teams sharing leads, notes, ownership, and handoff context.",
    price: "GBP 29",
    cadence: "/month",
    cta: "Start Business Pro",
    features: [
      "Everything in Pro",
      "Shared pipeline and client handoff notes",
      "Simple ownership rules",
      "10 teammate seats",
    ],
  },
];

const comparisons = [
  ["Outreach templates", "Core", "Full agency library", "Shared team library"],
  ["Pipeline tracking", "-", "Prospects, calls, proposals", "Shared pipeline"],
  ["Follow-up reminders", "-", "Included", "Shared follow-up plans"],
  ["Team collaboration", "-", "-", "10 teammate seats"],
  ["Reporting", "-", "Replies, calls, won work", "Team visibility"],
];

export default function PricingPage() {
  const { founderEligible, founderPriceGbp } = useAccount();
  const founderPriceLabel =
    founderPriceGbp !== null ? `GBP ${founderPriceGbp}` : "GBP 12";

  return (
    <main className="main">
      <section className="container">
        <div className="pricingSupabaseHero">
          <div className="badge">Pricing</div>
          <h1 className="pageTitle">
            Predictable pricing for turning outreach into booked work
          </h1>
          <p className="muted">
            Start free, move into the full agency workflow when leads are live,
            then add team sharing when more people help chase and close work.
          </p>

          <div className="pricingBillingPill" aria-label="Billing">
            <span>Monthly</span>
            <strong>No setup fees</strong>
          </div>
        </div>

        <div className="pricingFounderSpotlight">
          <div className="pricingFounderSpotlightCopy">
            <span className="miniBadge">Founder Pro</span>
            <h2>
              {founderPriceLabel}
              <span>/month for full Pro access</span>
            </h2>
            <p>
              {founderEligible
                ? "Your early supporter price is unlocked. Use it to run the full outreach-to-booked-work workflow for less."
                : "Invite-only early supporter pricing for agencies that want the full Pro workflow at a lower monthly price."}
            </p>
          </div>

          <div className="pricingFounderSpotlightActions">
            <span
              className={
                founderEligible
                  ? "statusPill statusPillSuccess"
                  : "statusPill statusPillWarning"
              }
            >
              {founderEligible ? "Unlocked on this account" : "Invite-only"}
            </span>
            {founderEligible ? (
              <CheckoutButton
                plan="founder"
                className="button buttonPrimary"
              >
                Start Founder Pro
              </CheckoutButton>
            ) : (
              <Link href="/founder" className="button buttonSecondary">
                Register interest
              </Link>
            )}
          </div>
        </div>

        <div className="pricingSupabaseGrid">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={
                plan.popular
                  ? "pricingSupabaseCard pricingSupabaseCardPopular"
                  : "pricingSupabaseCard"
              }
            >
              <div className="pricingSupabaseCardHead">
                <div>
                  <h2>{plan.name}</h2>
                  <p>{plan.description}</p>
                </div>
                {plan.popular ? <span>Most popular</span> : null}
              </div>

              <div className="pricingSupabasePrice">
                <strong>{plan.price}</strong>
                <span>{plan.cadence}</span>
              </div>

              {plan.note ? <p className="pricingSupabaseNote">{plan.note}</p> : null}

              {plan.name === "Pro" ? (
                <CheckoutButton
                  plan="pro"
                  className="button buttonPrimary"
                >
                  Start Pro
                </CheckoutButton>
              ) : plan.name === "Business Pro" ? (
                <CheckoutButton
                  plan="business"
                  className="button buttonSecondary"
                >
                  Start Business Pro
                </CheckoutButton>
              ) : (
                <Link href="/library" className="button buttonSecondary">
                  {plan.cta}
                </Link>
              )}

              <div className="pricingSupabaseDivider" />

              <p className="pricingSupabaseFeatureIntro">Get started with:</p>
              <ul className="pricingSupabaseFeatures">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <section className="pricingCompare" aria-label="Plan comparison">
          <div className="pricingCompareHeader">
            <div>
              <h2>Compare plans</h2>
              <p>Keep the choice simple: write better outreach, track live deals, or share the workflow with a team.</p>
            </div>
          </div>

          <div className="pricingCompareTable" role="table">
            <div className="pricingCompareRow pricingCompareHead" role="row">
              <span role="columnheader">Feature</span>
              <span role="columnheader">Free</span>
              <span role="columnheader">Pro</span>
              <span role="columnheader">Business Pro</span>
            </div>
            {comparisons.map(([feature, free, pro, business]) => (
              <div className="pricingCompareRow" role="row" key={feature}>
                <span role="cell">{feature}</span>
                <span role="cell">{free}</span>
                <span role="cell">{pro}</span>
                <span role="cell">{business}</span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
