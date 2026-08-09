"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";
import { trackEvent } from "@/lib/analytics";

const workflow = [
  {
    title: "Start the conversation",
    text: "Use agency-ready outreach and follow-up messages without staring at a blank page.",
  },
  {
    title: "Track the deal",
    text: "Move leads through inquiry, scoping call, proposal, negotiation, and handoff.",
  },
  {
    title: "Chase on time",
    text: "See the next follow-up before a warm lead goes quiet or a proposal slips.",
  },
  {
    title: "See what is working",
    text: "Track replies, booked calls, proposals, signed work, stage speed, and leakage.",
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
            A lightweight outreach and pipeline tool for small agencies that
            need to start conversations, chase warm leads, and stop good deals
            slipping because the next move was unclear.
          </p>

          <div className="heroActions homeHeroActions">
            <Link
              href="/prospects"
              className="button buttonPrimary"
              onClick={() => trackEvent("homepage_explore_library")}
            >
              Start with your first lead
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
            <span>One prospect, one message, one follow-up</span>
          </div>
          <div>
            <strong>Built for agencies</strong>
            <span>Prospects, proposals, retainers, handoff</span>
          </div>
          <div>
            <strong>No CRM bloat</strong>
            <span>Clear stages, notes, reminders, actions</span>
          </div>
          <div>
            <strong>Fewer slipped leads</strong>
            <span>Know who needs chasing today</span>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" className="container section" delay={100}>
        <div className="sectionHeader homeSectionHeader">
          <div>
            <h2 className="pageTitle">Everything points to the next deal step</h2>
            <p className="muted">
              Templates help you start faster, but Thalovo is really about what
              happens after outreach: who replied, what stage they are in, what
              needs chasing, and how close the work is to being booked.
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
              Book more work without babysitting every lead.
            </h2>
            <p className="muted" style={{ marginTop: 12, maxWidth: 680 }}>
              Add a lead, send the right message, set the follow-up, and keep
              every scoping call, proposal, negotiation, and handoff visible in
              one place.
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
