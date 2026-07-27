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
            Choose how much follow-up structure you need
          </h1>

          <p
            className="muted"
            style={{
              maxWidth: 700,
              margin: "10px auto",
              lineHeight: 1.75,
            }}
          >
            Start free, choose Pro when outreach becomes daily work, or Business
            Pro when a small team needs one shared pipeline from lead to booked deal.
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
              ? "Founder checkout is unlocked on this account. Complete payment to activate Founder Pro."
              : "Start with the essentials, then upgrade when follow-up and tracking need to stop living in your head."}
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
              Founder Pro gives selected early users the full Pro feature set
              at a lower locked monthly price. It is invite-only, and you can
              register interest without booking a call. Founder Pro covers one
              individual account and does not include Business Pro team seats.
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
              Test the core writing experience before you build a full system
              for chasing replies and booking client work.
            </p>

            <ul className="featureList">
              <li>Three core lead capture and outreach playbooks</li>
              <li>Email drafting and variable replacement</li>
              <li>Copy and TXT download</li>
              <li>Basic saved-email history</li>
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
              For agency owners and founders who need one place to manage
              outreach, follow-up, replies, and booked-work opportunities.
            </p>

            <ul className="featureList">
              <li>Prospect pipeline from first email to booked work</li>
              <li>Full lead capture and outreach library</li>
              <li>Full follow-up builder</li>
              <li>Unlimited saved emails and folders</li>
              <li>Saved follow-up plan library</li>
              <li>Branded HTML export</li>
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
              One shared pipeline for small teams handling outreach, replies,
              handoffs, and active deals together.
            </p>

            <ul className="featureList">
              <li>Everything in Pro</li>
              <li>One shared pipeline from lead to booked work</li>
              <li>10 teammate seats included</li>
              <li>Full Pro access for every active member</li>
              <li>Secure team templates and follow-up plans</li>
              <li>Owner-managed access</li>
            </ul>

            <div style={{ marginTop: 24 }}>
              <Link href="/business" className="button buttonPrimary">
                View Business Pro
              </Link>
            </div>
          </div>

        </div>

        <section className="section">
          <div className="glassCard" style={{ padding: 28 }}>
            <div className="badge">What changes across plans</div>

            <h2 className="pageTitle" style={{ marginTop: 14 }}>
              More structure, fewer slipped leads
            </h2>

            <div className="grid" style={{ marginTop: 20 }}>
              <div className="glassCard" style={{ padding: 20 }}>
                <h3 className="cardTitle">Free</h3>
                <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                  Best for trying the message playbooks before moving tracking
                  and follow-up into Thalovo.
                </p>
              </div>

              <div className="glassCard" style={{ padding: 20 }}>
                <h3 className="cardTitle">Pro</h3>
                <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                  Better if leads are coming in, follow-up is messy, and you
                  need a daily view of what to chase next.
                </p>
              </div>

              <div className="glassCard" style={{ padding: 20 }}>
                <h3 className="cardTitle">Business Pro</h3>
                <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                  Best when more than one person touches leads and handoffs
                  need to stay visible.
                </p>
              </div>

            </div>

          </div>
        </section>
      </section>
    </main>
  );
}
