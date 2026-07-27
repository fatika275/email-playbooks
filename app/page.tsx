"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";
import { playbooks } from "@/lib/data";
import { trackEvent } from "@/lib/analytics";

const workflow = [
  {
    title: "Add every lead",
    text: "Keep every new lead, reply, and handoff in one place before it gets lost.",
  },
  {
    title: "Follow up at the right time",
    text: "Use practical messages and reminders to move prospects toward a booked call.",
  },
  {
    title: "Turn interest into booked work",
    text: "Track who replied, who needs chasing, and which deals are close to slipping.",
  },
];

export default function HomePage() {
  return (
    <main className="main">
      <ScrollReveal as="section" className="container homeHero homeRevealHero">
        <div className="homeHeroInner">
          <div className="eyebrow">
            <span className="eyebrowDot" />
            Outreach-to-booked-work system for small agencies
          </div>

          <h1 className="homeHeroTitle">
            Turn outreach into booked work without losing deals in the cracks.
          </h1>

          <p className="homeHeroText">
            Thalovo helps agency owners, founders, and small sales teams move
            prospects from first email to booked call to active deal, without
            messy tracking or manual chasing.
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
            <strong>One client-work pipeline</strong>
            <span>First emails, replies, booked calls, and active deals</span>
          </div>
          <div>
            <strong>{playbooks.length}+ agency playbooks</strong>
            <span>Reusable wording for outreach and follow-up moments</span>
          </div>
          <div>
            <strong>Fewer slipped leads</strong>
            <span>Daily actions for follow-ups, replies, proposals, and cold leads</span>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" className="container section" delay={100}>
        <div className="sectionHeader homeSectionHeader">
          <div>
            <h2 className="pageTitle">A simple path from first email to booked work</h2>
            <p className="muted">
              Keep messages, follow-ups, stages, and next actions beside each
              lead so promising client work does not disappear in inboxes,
              spreadsheets, or handoffs.
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
              Every lead needs a clear next action.
            </h2>
            <p className="muted" style={{ marginTop: 12, maxWidth: 680 }}>
              Start from a prospect, send the right message, schedule the next
              follow-up, and keep moving until there is a booked call, active
              deal, win, or clean close.
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
