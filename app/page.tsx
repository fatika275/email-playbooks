"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";
import { playbooks } from "@/lib/data";
import { getBillingLinks, getPlanHref } from "@/lib/billing";
import { trackEvent } from "@/lib/analytics";

const workflow = [
  {
    title: "Pick the situation",
    text: "Choose the outreach moment you are in: first touch, follow-up, objection, proposal, or re-engagement.",
  },
  {
    title: "Shape the message",
    text: "Add prospect context, your offer, and the outcome you want so the draft feels specific.",
  },
  {
    title: "Save the system",
    text: "Keep strong emails and reusable sequences in your workspace so outreach becomes repeatable.",
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
            Reply-focused outbound systems
          </div>

          <h1 className="homeHeroTitle">
            Write outbound emails with structure, not guesswork.
          </h1>

          <p className="homeHeroText">
            Thalovo helps founders, agencies, and small teams build practical
            email sequences for starting conversations, following up, handling
            objections, and reusing what works.
          </p>

          <div className="heroActions homeHeroActions">
            <Link
              href="/library"
              className="button buttonPrimary"
              onClick={() => trackEvent("homepage_explore_library")}
            >
              Explore library
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
            <strong>{playbooks.length}+</strong>
            <span>Playbook systems</span>
          </div>
          <div>
            <strong>Full sequence</strong>
            <span>Not isolated templates</span>
          </div>
          <div>
            <strong>Reusable</strong>
            <span>Saved emails, folders, and workspace</span>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" className="container section" delay={100}>
        <div className="sectionHeader homeSectionHeader">
          <div>
            <h2 className="pageTitle">A calmer way to build outbound</h2>
            <p className="muted">
              Start with proven structure, then make each message specific to
              the person you are trying to reach.
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
              From one email to a repeatable operating system.
            </h2>
            <p className="muted" style={{ marginTop: 12, maxWidth: 680 }}>
              Use the library for the first draft, save the best versions, and
              build reusable sequences as your outreach gets sharper.
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
