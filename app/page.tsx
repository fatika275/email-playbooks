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
    text: "Track prospects, proposals, retainers, client handoff, booked clients, and slipped leads.",
  },
  {
    title: "Team sharing",
    text: "Keep notes, ownership, and lead visibility clear when more than one person handles follow-up.",
  },
  {
    title: "Follow-up tools",
    text: "Use saved plans, reminders, and lead context so warm prospects do not slip after a delay.",
  },
  {
    title: "Reporting",
    text: "See simple proof of what is working: replies, booked calls, client handoffs, and agency stages.",
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
            pipeline, follow-ups, team visibility, and reporting instead of
            being a general CRM for every business. Start in minutes with one
            prospect, one message, and one follow-up.
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
            <span>Start with one prospect instead of configuring a system for days</span>
          </div>
          <div>
            <strong>Email templates</strong>
            <span>Outreach, follow-up, proposal, and win-back messages</span>
          </div>
          <div>
            <strong>Pipeline</strong>
            <span>Track prospects, proposals, retainers, handoffs, and next actions</span>
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
              The pipeline tracks prospects, proposals, retainers, and
              handoffs. No days of setup, no heavy sales suite, just the pieces
              small agencies need to turn outreach into booked clients.
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
        <div className="homeProductBand">
          <div>
            <div className="badge">Pipeline</div>
            <h2 className="pageTitle" style={{ marginTop: 14 }}>
              Focused enough to move fast.
            </h2>
            <p className="muted" style={{ marginTop: 12, maxWidth: 680 }}>
              Thalovo stays intentionally narrow: start from a prospect, send
              the right follow-up, move proposals and retainers forward, and
              keep client handoff visible without the clutter of a platform
              built for every sales team. Add the first lead and start using it
              the same day.
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
