"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";
import { trackEvent } from "@/lib/analytics";

const workflow = [
  {
    title: "Email templates",
    text: "Start the conversation faster with use-case messages for outreach, replies, proposals, and re-engagement.",
  },
  {
    title: "Pipeline",
    text: "Track each lead from first message to replied, booked call, active deal, won, or lost.",
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
    text: "See simple proof of what is working: replies, booked calls, won deals, and deal stages.",
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
            Thalovo is built for one job: helping small agencies turn outreach
            into booked clients. It keeps templates, pipeline, follow-ups, team
            visibility, and simple reporting focused on that workflow instead
            of acting like a general CRM for every business.
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
            <strong>Email templates</strong>
            <span>Start conversations without rewriting from scratch</span>
          </div>
          <div>
            <strong>Pipeline</strong>
            <span>Track replies, booked calls, deal stages, and next actions</span>
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
              Email templates start the conversation, the pipeline tracks the
              deal, team sharing keeps everyone aligned, follow-up tools prevent
              leaks, and reporting shows what is working. No heavy sales suite,
              just the pieces small agencies need to turn outreach into booked
              clients.
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
              Built for one job, not CRM sprawl.
            </h2>
            <p className="muted" style={{ marginTop: 12, maxWidth: 680 }}>
              Start from a prospect, see the context, send the right follow-up,
              schedule the next reminder, and keep moving until there is a
              booked call, active client, win, or clean close.
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
