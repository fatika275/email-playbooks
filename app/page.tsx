"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";
import { playbooks } from "@/lib/data";
import { getBillingLinks, getPlanHref } from "@/lib/billing";
import { trackEvent } from "@/lib/analytics";

const workflow = [
  {
    title: "Manage the opportunity",
    text: "Keep every prospect, deal stage, task, note, value, and next follow-up in one working pipeline.",
  },
  {
    title: "Run the outreach",
    text: "Move directly from prospect context into structured emails, sequences, objections, and follow-ups.",
  },
  {
    title: "Operate until won",
    text: "Use the Today queue, activity history, tasks, and reporting to keep momentum until the client closes.",
  },
];

export default function HomePage() {
  const billingLinks = getBillingLinks();
  const proPlusHref = getPlanHref(
    billingLinks.proPlus || billingLinks.bookCall,
    "/book-call"
  );

  return (
    <main className="main">
      <ScrollReveal as="section" className="container homeHero homeRevealHero">
        <div className="homeHeroInner">
          <div className="eyebrow">
            <span className="eyebrowDot" />
            Client acquisition operating system
          </div>

          <h1 className="homeHeroTitle">
            Thalovo, your client acquisition operating system.
          </h1>

          <p className="homeHeroText">
            Manage prospects, run outreach, handle follow-ups, track pipeline
            value, and move opportunities toward signed clients without stitching
            together a pile of disconnected tools.
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
            <strong>{playbooks.length}+ playbooks</strong>
            <span>Messaging for each sales situation</span>
          </div>
          <div>
            <strong>Operational</strong>
            <span>Today queue, reporting, and team access</span>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" className="container section" delay={100}>
        <div className="sectionHeader homeSectionHeader">
          <div>
            <h2 className="pageTitle">One workflow from lead to client</h2>
            <p className="muted">
              Keep account context, communication, and next actions together so
              opportunities do not disappear between tools.
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
              Messaging belongs inside the acquisition operation.
            </h2>
            <p className="muted" style={{ marginTop: 12, maxWidth: 680 }}>
              Start from the prospect record, draft with their context already
              attached, then return to log activity and schedule what happens next.
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

      <ScrollReveal as="section" className="container section" delay={120}>
        <div className="homeCta">
          <div className="badge">Pro+</div>
          <h2 className="pageTitle" style={{ marginTop: 14 }}>
            Want the system shaped around your offer?
          </h2>
          <p className="muted">
            Pro+ is for founders and agencies who want help refining their
            positioning, outbound flow, and reusable messaging system.
          </p>
          <Link href={proPlusHref} className="button buttonPrimary">
            Book Pro+
          </Link>
        </div>
      </ScrollReveal>
    </main>
  );
}
