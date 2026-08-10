"use client";

import Link from "next/link";
import { useAccount } from "@/components/account-provider";

export default function PricingPage() {
  const { founderEligible, founderPriceGbp } = useAccount();
  const founderPriceLabel =
    founderPriceGbp !== null ? `GBP ${founderPriceGbp}` : "GBP 12";

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader" style={{ textAlign: "center" }}>
          <div className="badge">Pricing</div>

          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Pick the plan that keeps agency leads moving
          </h1>

          <p
            className="muted"
            style={{
              maxWidth: 620,
              margin: "10px auto",
              lineHeight: 1.65,
            }}
          >
            Start free with outreach messages. Upgrade when you want the
            pipeline, follow-up reminders, and team handoff tools that stop
            client work slipping through the cracks.
          </p>

          <p
            className="notice"
            style={{
              textAlign: "center",
              marginTop: 14,
              maxWidth: 720,
              marginInline: "auto",
            }}
          >
            {founderEligible
              ? "Founder checkout is unlocked on this account. Complete payment to lock in your early supporter price."
              : "Most solo agencies start with Pro. Teams that share leads should choose Business Pro."}
          </p>
        </div>

        <div className="founderPriceBand glassCard">
          <div>
            <div className="badge">Founder Pro</div>
            <h2 className="pageTitle" style={{ marginTop: 14 }}>
              {founderPriceLabel}
              <span className="muted">/month locked</span>
            </h2>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
              Invite-only early supporter pricing for one individual account.
              It includes full Pro access and stays locked while your account is
              active.
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

        <div className="grid" style={{ marginTop: 28 }}>
          <div
            className="glassCard"
            style={{
              padding: 28,
              display: "flex",
              flexDirection: "column",
              minHeight: "100%",
            }}
          >
            <div className="badge">Free</div>

            <h2 className="pageTitle" style={{ marginTop: 14 }}>
              GBP 0<span className="muted">/month</span>
            </h2>

            <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
              Try the message workflow before moving live leads into Thalovo.
            </p>

            <ul className="featureList">
              <li>Core outreach message templates</li>
              <li>Draft, copy, and download messages</li>
              <li>Basic saved-message history</li>
              <li>No card required</li>
            </ul>

            <div style={{ marginTop: 24 }}>
              <Link href="/library" className="button buttonSecondary">
                Start free
              </Link>
            </div>
          </div>

          <div
            className="glassCard"
            style={{
              padding: 28,
              display: "flex",
              flexDirection: "column",
              minHeight: "100%",
              borderColor: "rgba(201, 166, 72, 0.22)",
            }}
          >
            <div className="badge">Pro</div>

            <h2 className="pageTitle" style={{ marginTop: 14 }}>
              GBP 19<span className="muted">/month</span>
            </h2>

            <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
              For solo agency owners who need a clear path from outreach to
              booked calls and active deals.
            </p>

            <ul className="featureList">
              <li>Agency pipeline for prospects, calls, proposals, and handoff</li>
              <li>Follow-up reminders so warm leads do not go quiet</li>
              <li>Reusable outreach, proposal, and win-back templates</li>
              <li>Simple reporting on replies, booked calls, won work, and leakage</li>
            </ul>

            <div style={{ marginTop: 24 }}>
              <Link href="/pro" className="button buttonPrimary">
                View Pro
              </Link>
            </div>
          </div>

          <div
            className="glassCard"
            style={{
              padding: 28,
              display: "flex",
              flexDirection: "column",
              minHeight: "100%",
            }}
          >
            <div className="badge">Business Pro</div>

            <h2 className="pageTitle" style={{ marginTop: 14 }}>
              GBP 29<span className="muted">/month</span>
            </h2>

            <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
              For small agency teams that need a shared pipeline, handoff notes,
              and simple lead ownership.
            </p>

            <ul className="featureList">
              <li>Everything in Pro</li>
              <li>Shared pipeline, notes, and client handoff context</li>
              <li>Simple ownership rules for who chases each lead</li>
              <li>10 teammate seats included</li>
              <li>Shared outreach messages and follow-up plans</li>
            </ul>

            <div style={{ marginTop: 24 }}>
              <Link href="/business" className="button buttonPrimary">
                View Business Pro
              </Link>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
