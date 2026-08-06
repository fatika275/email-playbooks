"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";
import { trackEvent } from "@/lib/analytics";

const workflow = [
  {
    title: "Email templates",
    text: "Use outreach sequences, follow-up templates, proposal reminders, and client win-back flows.",
  },
  {
    title: "Pipeline",
    text: "Track inquiries, scoping calls, proposals, negotiation, client handoff, booked clients, and slipped leads.",
  },
  {
    title: "Team sharing",
    text: "Use a shared pipeline, shared notes, and simple ownership rules for leads, proposals, and handoff.",
  },
  {
    title: "Follow-up tools",
    text: "Use saved plans, reminders, and lead context so warm prospects do not slip after a delay.",
  },
  {
    title: "Outcome reporting",
    text: "Track replies, booked calls, signed client work, and lead leakage by source.",
  },
];

const agencyWorkflowDepth = [
  {
    title: "Research the prospect",
    text: "Capture the company, role, source, likely need, and potential client-work value before sending.",
  },
  {
    title: "Start the conversation",
    text: "Pick an outreach template by use case so the first email is faster and still sounds specific.",
  },
  {
    title: "Triage the reply",
    text: "Move warm replies into discovery, proposal, or retainer discussion without losing the next action.",
  },
  {
    title: "Chase the proposal",
    text: "Use proposal reminders and due dates so good-fit leads do not disappear after the quote goes out.",
  },
  {
    title: "Close the retainer",
    text: "Track value, objections, booked calls, and retainer conversations until the deal is ready to hand off.",
  },
  {
    title: "Hand off the client",
    text: "Keep notes, owner, outcome reason, and next steps visible when sales turns into active client work.",
  },
];

export default function HomePage() {
  return (
    <main className="main">
      <ScrollReveal as="section" className="container homeHero homeRevealHero">
        <div className="homeHeroInner">
          <div className="eyebrow">
            <span className="eyebrowDot" />
            Lightweight outreach and pipeline tool for small agencies
          </div>

          <h1 className="homeHeroTitle">
            Turn outreach into booked clients.
          </h1>

          <p className="homeHeroText">
            Thalovo is built for one job: turn outreach into booked clients.
            It gives small agencies the focused workflow for templates,
            pipeline, follow-ups, team visibility, and outcome reporting. Start
            in minutes with one prospect, one message, and one follow-up, then
            keep scoping calls, proposals, negotiation, handoff, and lead ownership moving in
            one readable place.
          </p>

          <div className="heroActions homeHeroActions">
            <Link
              href="/prospects"
              className="button buttonPrimary"
              onClick={() => trackEvent("homepage_explore_library")}
            >
              Open prospect pipeline
            </Link>
            <Link
              href="/account"
              className="button buttonSecondary"
              onClick={() => trackEvent("homepage_get_started")}
            >
              Get started
            </Link>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" className="container section" delay={80}>
        <div className="homeMetrics">
          <div>
            <strong>Fast setup</strong>
            <span>Start with one prospect, one message, and one follow-up</span>
          </div>
          <div>
            <strong>Email templates</strong>
            <span>Outreach, follow-up, proposal, and win-back messages</span>
          </div>
          <div>
            <strong>Pipeline</strong>
            <span>Track inquiries, scoping calls, proposals, negotiation, and next actions</span>
          </div>
          <div>
            <strong>Follow-up tools</strong>
            <span>Prevent warm leads slipping after the first touch</span>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" className="container section" delay={100}>
        <div className="sectionHeader homeSectionHeader">
          <div>
            <h2 className="pageTitle">A simple path from first email to booked work</h2>
            <p className="muted">
              Outreach sequences start the conversation. Follow-up templates,
              proposal reminders, and client win-back flows keep leads moving.
              The pipeline tracks inquiries, scoping calls, proposals,
              negotiation, and handoff. No days of setup, just the pieces small
              agencies need to turn outreach into booked clients in a
              lightweight, readable agency workflow.
            </p>
          </div>
        </div>

        <div className="grid homeWorkflowGrid">
          {workflow.map((item, index) => (
            <ScrollReveal
              key={item.title}
              className="glassCard homeWorkflowCard"
              delay={index * 90}
            >
              <span className="miniBadge">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="cardTitle">{item.title}</h3>
              <p className="muted">{item.text}</p>
            </ScrollReveal>
          ))}
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" className="container section" delay={120}>
        <div className="sectionHeader homeSectionHeader">
          <div>
            <h2 className="pageTitle">Built around how small agencies sell services</h2>
            <p className="muted">
              Thalovo follows the work your team actually does after outreach:
              qualify the lead, book the scoping call, chase the proposal,
              handle negotiation, and hand off the client with context still
              intact.
            </p>
          </div>
        </div>

        <div className="grid homeWorkflowGrid">
          {agencyWorkflowDepth.map((item) => (
            <ScrollReveal
              key={item.title}
              className="glassCard homeWorkflowCard"
              delay={80}
            >
              <span className="miniBadge">Agency workflow</span>
              <h3 className="cardTitle">{item.title}</h3>
              <p className="muted">{item.text}</p>
            </ScrollReveal>
          ))}
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" className="container section" delay={140}>
        <div className="homeProductBand">
          <div>
            <div className="badge">Pipeline</div>
            <h2 className="pageTitle" style={{ marginTop: 14 }}>
              Focused enough to move fast.
            </h2>
            <p className="muted" style={{ marginTop: 12, maxWidth: 680 }}>
              Thalovo stays intentionally narrow: start from a prospect, send
              the right follow-up, move scoping calls and proposals forward, and
              keep client handoff visible. Add the first lead and start using
              it the same day.
            </p>
          </div>

          <div className="homeProductActions">
            <Link href="/prospects" className="button buttonPrimary">
              Open pipeline
            </Link>
            <Link href="/pricing" className="button buttonSecondary">
              View pricing
            </Link>
          </div>
        </div>
      </ScrollReveal>

    </main>
  );
}
