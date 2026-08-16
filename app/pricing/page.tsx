"use client";

import Link from "next/link";
import { useAccount } from "@/components/account-provider";

const plans = [
  {
    name: "Free",
    eyebrow: "Try the workflow",
    price: "GBP 0",
    cadence: "/month",
    description: "Use the message library before you are ready to track live client work.",
    bestFor: "Writing better outreach",
    href: "/library",
    cta: "Start free",
  },
  {
    name: "Pro",
    eyebrow: "Most small agencies",
    price: "GBP 19",
    cadence: "/month",
    description: "Run outreach, follow-ups, proposals, and lead tracking in one focused workspace.",
    bestFor: "Turning replies into booked work",
    href: "/pro",
    cta: "Start Pro",
  },
  {
    name: "Business Pro",
    eyebrow: "When a team is involved",
    price: "GBP 29",
    cadence: "/month",
    description: "Add shared ownership and handoff context when more than one person handles leads.",
    bestFor: "Keeping a small team aligned",
    href: "/business",
    cta: "Start Business Pro",
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
              Simple pricing for agencies that need booked work, not CRM admin
            </h1>
            <p className="muted">
              Choose the stage you are at now. Thalovo keeps the workflow tight:
              start better conversations, chase the right leads, track proposals,
              and hand over client work without losing context.
            </p>
            <div className="pricingHeroSignals" aria-label="What Thalovo helps with">
              <span>Outreach</span>
              <span>Pipeline</span>
              <span>Follow-up</span>
              <span>Handoff</span>
            </div>
          </div>

          <div className="pricingHeroNote">
            <span className="miniBadge">
              {founderEligible ? "Founder access unlocked" : "Best place to start"}
            </span>
            <strong>
              {founderEligible
                ? `${founderPriceLabel}/month for full Pro.`
                : "Most agencies should start with Pro."}
            </strong>
            <p>
              {founderEligible
                ? "Founder pricing is locked while your account stays active."
                : "It gives you the full outreach-to-deal workflow without paying for team seats too early."}
            </p>
            <Link
              href={founderEligible ? "/founder" : "/pro"}
              className="button buttonPrimary"
            >
              {founderEligible ? "Start Founder Pro" : "Start with Pro"}
            </Link>
          </div>
        </div>

        <section className="pricingDecision" aria-label="Choose a Thalovo plan">
          <div className="pricingPlanStrip">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={
                  plan.name === "Pro"
                    ? "pricingPlanRow pricingPlanRowFeatured"
                    : "pricingPlanRow"
                }
              >
                <div className="pricingPlanIntro">
                  <span>{plan.eyebrow}</span>
                  <h2>{plan.name}</h2>
                  <p>{plan.description}</p>
                </div>

                <div className="pricingPlanPrice">
                  <strong>{plan.price}</strong>
                  <span>{plan.cadence}</span>
                </div>

                <div className="pricingPlanUse">
                  <span>Best for</span>
                  <strong>{plan.bestFor}</strong>
                </div>

                <Link
                  href={plan.href}
                  className={
                    plan.name === "Pro" ? "button buttonPrimary" : "button buttonSecondary"
                  }
                >
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>

          <aside className="pricingIncludedPanel">
            <div>
              <span className="miniBadge">What you are paying for</span>
              <h2>One workflow from first email to booked client</h2>
              <p>
                Thalovo is priced around the agency sales job itself, not a long
                menu of generic CRM features.
              </p>
            </div>

            <div className="pricingIncludedList">
              <div>
                <strong>Start conversations</strong>
                <span>
                  Agency-specific templates for outreach, follow-up, proposals,
                  and win-back.
                </span>
              </div>
              <div>
                <strong>Protect warm leads</strong>
                <span>
                  Next actions and reminders keep prospects from sitting forgotten.
                </span>
              </div>
              <div>
                <strong>Track real client work</strong>
                <span>
                  See replies, calls, proposals, won deals, and where leads leak.
                </span>
              </div>
            </div>

            <div className="pricingFounderInline">
              <span
                className={
                  founderEligible
                    ? "statusPill statusPillSuccess"
                    : "statusPill statusPillWarning"
                }
              >
                {founderEligible ? "Founder unlocked" : "Founder invite-only"}
              </span>
              <p>
                {founderEligible
                  ? `${founderPriceLabel}/month is available for your account.`
                  : "Founder Pro stays separate so normal pricing remains clear."}
              </p>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
