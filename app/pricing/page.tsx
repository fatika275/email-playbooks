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
            Simple pricing for agencies turning outreach into booked work
          </h1>

          <p
            className="muted"
            style={{
              maxWidth: 700,
              margin: "10px auto",
              lineHeight: 1.75,
            }}
          >
            Thalovo is built for one job: turn outreach into booked clients.
            It helps small agencies send better outreach, track inquiries,
            manage scoping calls, chase proposals, handle negotiation, and see
            replies, booked calls, signed client work, and lead leakage. Start
            in minutes with the service-sales workflow your agency already uses.
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
              : "Start free, upgrade to Pro when you are ready to track real leads, or choose Business Pro when the team needs shared pipeline access."}
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
              Founder Pro is the early supporter price for selected users: full
              Pro access for one individual account, locked while your account
              stays active. It is invite-only and does not include Business Pro
              team seats.
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
              <li>Three core use-case outreach playbooks</li>
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
              For solo agency owners who want to turn outreach into booked
              client work with one clear path from first touch to handoff.
            </p>

            <ul className="featureList">
              <li>Outreach sequences, follow-up templates, proposal reminders, and client win-back flows</li>
              <li>Start with one prospect and a ready-made agency workflow</li>
              <li>Agency pipeline stages for inquiries, scoping calls, proposals, negotiation, and handoff</li>
              <li>Follow-up reminders to stop warm leads slipping because the chase was late</li>
              <li>Outcome reporting for replies, booked calls, signed work, and lead leakage</li>
              <li>Reusable saved messages and follow-up plans</li>
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
              <li>Shared pipeline for inquiries, scoping calls, proposals, negotiation, and handoff</li>
              <li>Shared notes and handoff context for lead owner changes</li>
              <li>Simple ownership rules for who is chasing each lead</li>
              <li>10 teammate seats included</li>
              <li>Full Pro access for every active member</li>
              <li>Shared agency templates and follow-up plans</li>
              <li>Owner-managed access without extra sales admin</li>
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
              One job: turn outreach into booked clients
            </h2>

            <div className="grid" style={{ marginTop: 20 }}>
              <div className="glassCard" style={{ padding: 20 }}>
                <h3 className="cardTitle">Free</h3>
                <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                  Best for trying agency templates before moving follow-up and
                  pipeline tracking into Thalovo.
                </p>
              </div>

              <div className="glassCard" style={{ padding: 20 }}>
                <h3 className="cardTitle">Pro</h3>
                <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                  Best for solo agency owners turning outreach into booked
                  client work.
                </p>
              </div>

              <div className="glassCard" style={{ padding: 20 }}>
                <h3 className="cardTitle">Business Pro</h3>
                <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                  Best for small teams sharing pipeline, notes, templates, and
                  lead ownership without extra menus or sales admin overhead.
                </p>
              </div>

            </div>

          </div>
        </section>
      </section>
    </main>
  );
}
