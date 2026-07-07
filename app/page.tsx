"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";
import { playbooks } from "@/lib/data";
import { trackEvent } from "@/lib/analytics";

const workflow = [
  {
    title: "Add every lead",
    text: "Keep each prospect, conversation, and next follow-up in one simple agency pipeline.",
  },
  {
    title: "Send better outreach",
    text: "Use practical emails and follow-up sequences without starting from a blank page.",
  },
  {
    title: "Never lose the follow-up",
    text: "See what is due today and keep each opportunity moving until the work is booked.",
  },
];

export default function HomePage() {
  return (
    <main className="main">
      <ScrollReveal as="section" className="container homeHero homeRevealHero">
        <div className="homeHeroInner">
          <div className="eyebrow">
            <span className="eyebrowDot" />
            Outreach and pipeline for small agencies
          </div>

          <h1 className="homeHeroTitle">
            Book more agency work. Stop losing good leads.
          </h1>

          <p className="homeHeroText">
            Thalovo gives small agencies one simple place to write outreach,
            remember every follow-up, and move leads toward booked work.
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
            <strong>One pipeline</strong>
            <span>Prospects, stages, tasks, and follow-ups</span>
          </div>
          <div>
            <strong>{playbooks.length}+ message playbooks</strong>
            <span>Reusable wording for real sales conversations</span>
          </div>
          <div>
            <strong>Nothing forgotten</strong>
            <span>Tasks, reminders, and a clear Today list</span>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" className="container section" delay={100}>
        <div className="sectionHeader homeSectionHeader">
          <div>
            <h2 className="pageTitle">A simple path from lead to booked work</h2>
            <p className="muted">
              Keep outreach and follow-ups beside the lead so opportunities do
              not disappear in inboxes and spreadsheets.
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
            <div className="badge">Workspace</div>
            <h2 className="pageTitle" style={{ marginTop: 14 }}>
              Outreach belongs beside the lead.
            </h2>
            <p className="muted" style={{ marginTop: 12, maxWidth: 680 }}>
              Start from a prospect, prepare the right message, then record the
              contact and schedule the next follow-up.
            </p>
          </div>

          <div className="homeProductActions">
            <Link href="/workspace" className="button buttonPrimary">
              Open workspace
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
