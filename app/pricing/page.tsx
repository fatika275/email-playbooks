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
            Choose the level of structure you need
          </h1>

          <p
            className="muted"
            style={{
              maxWidth: 700,
              margin: "10px auto",
              lineHeight: 1.75,
            }}
          >
            Start free, choose Pro for one agency owner, or Business Pro when
            your small team needs one shared pipeline.
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
              : "Start with the essentials, then upgrade when outreach becomes a regular workflow."}
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
              Test the core Thalovo writing experience before deciding whether
              the full outbound workspace fits your workflow.
            </p>

            <ul className="featureList">
              <li>Three core outreach playbooks</li>
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
              For agencies and founders who want a stronger system they can
              reuse, refine, and learn from.
            </p>

            <ul className="featureList">
              <li>Prospect pipeline and follow-up tracking</li>
              <li>Full playbook library</li>
              <li>Full sequence builder</li>
              <li>Unlimited saved emails and folders</li>
              <li>Reusable sequence library</li>
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
              One payment for a business owner and up to 10 teammates with full
              Pro access.
            </p>

            <ul className="featureList">
              <li>Everything in Pro</li>
              <li>One shared prospect pipeline</li>
              <li>10 teammate seats included</li>
              <li>Full Pro access for every active member</li>
              <li>Secure team templates and sequences</li>
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
              More structure, more reuse, more refinement
            </h2>

            <div className="grid" style={{ marginTop: 20 }}>
              <div className="glassCard" style={{ padding: 20 }}>
                <h3 className="cardTitle">Free</h3>
                <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                  Best for previewing the core playbooks and checking whether
                  the structure feels useful before paying.
                </p>
              </div>

              <div className="glassCard" style={{ padding: 20 }}>
                <h3 className="cardTitle">Pro</h3>
                <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                  Better if outreach is a regular part of your workflow and you
                  want stronger systems plus better reuse.
                </p>
              </div>

              <div className="glassCard" style={{ padding: 20 }}>
                <h3 className="cardTitle">Business Pro</h3>
                <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                  Best for one business paying centrally while up to 10 teammates
                  receive full Pro access.
                </p>
              </div>

            </div>

          </div>
        </section>
      </section>
    </main>
  );
}
