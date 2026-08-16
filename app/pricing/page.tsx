"use client";

import Link from "next/link";
import { useAccount } from "@/components/account-provider";

const plans = [
  {
    name: "Free",
    badge: "Start here",
    price: "GBP 0",
    cadence: "/month",
    description: "Build better outreach messages before you start tracking live client work.",
    bestFor: "Testing message quality",
    href: "/library",
    cta: "Start free",
    featured: false,
    features: [
      "Core outreach message templates",
      "Draft, copy, and download messages",
      "Basic saved-message history",
      "No card required",
    ],
  },
  {
    name: "Pro",
    badge: "Most solo agencies",
    price: "GBP 19",
    cadence: "/month",
    description: "Run the full outreach-to-deal workflow without a messy spreadsheet.",
    bestFor: "One person chasing client work",
    href: "/pro",
    cta: "View Pro",
    featured: true,
    features: [
      "Agency pipeline for prospects, calls, proposals, and handoff",
      "Follow-up reminders so warm leads do not go quiet",
      "Reusable outreach, proposal, and win-back templates",
      "Reporting on replies, booked calls, won work, and leakage",
    ],
  },
  {
    name: "Business Pro",
    badge: "Small teams",
    price: "GBP 29",
    cadence: "/month",
    description: "Keep everyone aligned when more than one person handles leads.",
    bestFor: "Teams sharing leads",
    href: "/business",
    cta: "View Business Pro",
    featured: false,
    features: [
      "Everything in Pro",
      "Shared pipeline, notes, and client handoff context",
      "Simple ownership rules for who chases each lead",
      "10 teammate seats and shared follow-up plans",
    ],
  },
];

export default function PricingPage() {
  const { founderEligible, founderPriceGbp } = useAccount();
  const founderPriceLabel =
    founderPriceGbp !== null ? `GBP ${founderPriceGbp}` : "GBP 12";

  return (
    <main className="main">
      <section className="container">
        <div className="pricingHero">
          <div>
            <div className="badge">Pricing</div>
            <h1 className="pageTitle">
              Turn outreach into booked client work without losing leads
            </h1>
            <p className="muted">
              Thalovo is built for small agencies that need one clear place to
              start conversations, chase replies, track proposals, and hand work
              over when a lead becomes real.
            </p>
            <div className="pricingHeroSignals" aria-label="What Thalovo helps with">
              <span>More booked calls</span>
              <span>Fewer missed follow-ups</span>
              <span>Cleaner handoff</span>
            </div>
          </div>

          <div className="pricingHeroNote">
            <span className="miniBadge">
              {founderEligible ? "Founder access" : "Recommended"}
            </span>
            <strong>
              {founderEligible
                ? "Founder Pro is unlocked for this account."
                : "Start with Pro if you are working leads yourself."}
            </strong>
            <p>
              {founderEligible
                ? `You can lock in ${founderPriceLabel}/month for full Pro access.`
                : "Move to Business Pro when teammates need shared ownership and handoff notes."}
            </p>
          </div>
        </div>

        <div className="founderPriceBand pricingFounderBand">
          <div>
            <div className="badge">Founder Pro</div>
            <h2 className="pageTitle">
              {founderPriceLabel}
              <span className="muted">/month locked</span>
            </h2>
            <p className="muted">
              Invite-only early supporter pricing for one individual account,
              with full Pro access while your account is active.
            </p>
          </div>

          <div className="founderPriceActions">
            <span
              className={
                founderEligible
                  ? "statusPill statusPillSuccess"
                  : "statusPill statusPillWarning"
              }
            >
              {founderEligible ? "Unlocked on this account" : "Invite-only"}
            </span>

            <Link
              href="/founder"
              className={founderEligible ? "button buttonPrimary" : "button buttonSecondary"}
            >
              {founderEligible ? "Start Founder" : "Register interest"}
            </Link>
          </div>
        </div>

        <div className="pricingValueRow">
          <div>
            <strong>Start fast</strong>
            <span>No heavy CRM setup before you can chase work.</span>
          </div>
          <div>
            <strong>Stay focused</strong>
            <span>Built around prospects, proposals, retainers, and handoff.</span>
          </div>
          <div>
            <strong>Prove value</strong>
            <span>Track replies, booked calls, won work, and lead leakage.</span>
          </div>
        </div>

        <div className="pricingGrid">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={plan.featured ? "pricingCard pricingCardFeatured" : "pricingCard"}
            >
              <div className="pricingCardTop">
                <span className="miniBadge">{plan.badge}</span>
                <h2>{plan.name}</h2>
                <p>{plan.description}</p>
              </div>

              <div className="pricingAmount">
                <strong>{plan.price}</strong>
                <span>{plan.cadence}</span>
              </div>

              <div className="pricingBestFor">
                <span>Best for</span>
                <strong>{plan.bestFor}</strong>
              </div>

              <ul className="pricingFeatureList">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={plan.featured ? "button buttonPrimary" : "button buttonSecondary"}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
