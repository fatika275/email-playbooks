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
            Choose the outreach and pipeline setup your agency needs
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
            It helps small agencies send better outreach, track prospects,
            chase proposals, and show what is working instead of being a
            general CRM for every business. Start in minutes, not after days of
            configuring fields, stages, and dashboards.
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
              : "Start lightweight, then upgrade when your agency needs the full outreach-to-pipeline workflow."}
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
              For agency owners and founders who want a focused way to start
              conversations, track prospects, chase proposals, and turn
              outreach into booked client work faster without a long setup.
            </p>

            <ul className="featureList">
              <li>Outreach sequences, follow-up templates, proposal reminders, and client win-back flows</li>
              <li>Start with one prospect and a ready-made agency workflow</li>
              <li>Agency pipeline stages for prospects, proposals, retainers, and client handoff</li>
              <li>Follow-up tools to stop warm leads slipping</li>
              <li>Basic reporting for replies, booked calls, and client handoffs</li>
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
              Shared access, notes, and pipeline visibility for small teams
              handling leads together.
            </p>

            <ul className="featureList">
              <li>Everything in Pro</li>
              <li>Team sharing to keep everyone aligned on leads</li>
              <li>Shared pipeline, notes, and activity history</li>
              <li>10 teammate seats included</li>
              <li>Full Pro access for every active member</li>
              <li>Shared lead-capture messages and follow-up plans</li>
              <li>Simple owner-managed access</li>
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
                  Best for trying the message playbooks before moving tracking
                  and follow-up into Thalovo.
                </p>
              </div>

              <div className="glassCard" style={{ padding: 20 }}>
                <h3 className="cardTitle">Pro</h3>
                <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                  Better if leads are coming in and you need the fastest route
                  from outreach to proposal, retainer, and booked client.
                </p>
              </div>

              <div className="glassCard" style={{ padding: 20 }}>
                <h3 className="cardTitle">Business Pro</h3>
                <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                  Best when more than one person handles leads and the team
                  needs shared visibility to avoid duplicate chasing and missed
                  follow-ups.
                </p>
              </div>

            </div>

          </div>
        </section>
      </section>
    </main>
  );
}
