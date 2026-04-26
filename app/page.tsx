"use client";

import Link from "next/link";
import { playbooks } from "@/lib/data";

export default function HomePage() {
  return (
    <main className="main">
      <section className="container hero">
        <div className="heroCard">
          <div className="eyebrow">
            <span className="eyebrowDot" />
            Reply-focused outbound system
          </div>

          <h1 className="heroTitle">
            Turn cold leads into <span className="goldText">real replies</span>.
          </h1>

          <p className="heroText muted">
            Thalovo gives you structured outreach systems so you know what to
            send, when to send it, and how to keep conversations moving without
            guessing.
          </p>

          <div className="heroActions">
            <Link
              href="/playbook/cold-outreach-sequence"
              className="button buttonPrimary"
            >
              Start the system
            </Link>

            <Link href="/pricing" className="button buttonSecondary">
              View pricing
            </Link>
          </div>

          <div className="statGrid">
            <div className="statCard">
              <div className="statValue">{playbooks.length}+</div>
              <div className="statLabel">Playbooks</div>
            </div>

            <div className="statCard">
              <div className="statValue">Structured</div>
              <div className="statLabel">Not random templates</div>
            </div>

            <div className="statCard">
              <div className="statValue">Reusable</div>
              <div className="statLabel">Systems and saved emails</div>
            </div>
          </div>
        </div>

        <div className="heroCard sidePanel">
          <div className="badge">Why Thalovo</div>

          <h3 className="sectionTitle" style={{ marginTop: 18 }}>
            Most outreach breaks because there is no system behind it
          </h3>

          <p className="muted" style={{ lineHeight: 1.7 }}>
            One email is rarely enough. Thalovo helps you start strong, follow
            up properly, handle objections, and reuse what works.
          </p>

          <ul className="featureList">
            <li>Cold outreach steps that start conversations</li>
            <li>Follow-ups that recover ignored leads</li>
            <li>Objection replies that protect momentum</li>
            <li>Reusable sequences and saved email workflow</li>
          </ul>
        </div>
      </section>

      <section className="container section">
        <div className="glassCard featureBand" style={{ padding: 30 }}>
          <div className="badge">The system difference</div>

          <h2 className="pageTitle sectionLeadTitle" style={{ marginTop: 14 }}>
            Better replies come from better structure
          </h2>

          <p className="muted sectionLeadCopy" style={{ maxWidth: 760, lineHeight: 1.75 }}>
            Thalovo is designed around the full conversation. You do not just
            get copy. You get timing, progression, decision points, and reusable
            messaging systems built to move a lead forward.
          </p>

          <div className="grid featureGrid" style={{ marginTop: 24 }}>
            <div className="glassCard featurePanel" style={{ padding: 20 }}>
              <h3 className="cardTitle">Start with relevance</h3>
              <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                Open with outreach that feels specific to the prospect instead
                of generic or over-pitched.
              </p>
            </div>

            <div className="glassCard featurePanel" style={{ padding: 20 }}>
              <h3 className="cardTitle">Follow through properly</h3>
              <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                Know when to follow up, what to send next, and how to avoid
                stopping too early.
              </p>
            </div>

            <div className="glassCard featurePanel" style={{ padding: 20 }}>
              <h3 className="cardTitle">Reuse what works</h3>
              <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                Save strong emails and sequence versions so your best outreach
                becomes part of your workflow.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="grid infoGrid">
          <div className="glassCard infoPanel" style={{ padding: 28 }}>
            <div className="badge">Built for</div>
            <h2 className="pageTitle" style={{ marginTop: 14 }}>
              Teams and founders doing outbound seriously
            </h2>

            <ul className="featureList" style={{ marginTop: 18 }}>
              <li>Agencies trying to win more clients</li>
              <li>Founders doing their own outbound</li>
              <li>Freelancers building lead flow through email</li>
              <li>Small teams needing a repeatable system</li>
            </ul>
          </div>

          <div className="glassCard infoPanel" style={{ padding: 28 }}>
            <div className="badge">Positioning</div>
            <h2 className="pageTitle" style={{ marginTop: 14 }}>
              Focused on the messaging layer
            </h2>

            <p className="muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
              Thalovo is not trying to be your CRM or your sending tool. It is
              the structured messaging system you use alongside those tools.
            </p>
          </div>

          <div className="glassCard infoPanel" style={{ padding: 28 }}>
            <div className="badge">Why it feels different</div>
            <h2 className="pageTitle" style={{ marginTop: 14 }}>
              Practical first, educational when needed
            </h2>

            <p className="muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
              Use a step immediately or open the expert breakdown to understand
              the psychology, sentence logic, and common mistakes behind it.
            </p>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="sectionHeader">
          <div>
            <h2 className="pageTitle">System Library</h2>
            <p className="muted">
              Choose the system that fits the conversation you need to move.
            </p>
          </div>
        </div>

        <div className="grid libraryGrid">
          {playbooks.map((playbook) => (
            <div key={playbook.id} className="playbookCard glassCard">
              <div className="cardTop">
                <h3 className="cardTitle">{playbook.name}</h3>
                <span className="miniBadge">{playbook.badge}</span>
              </div>

              <p className="cardDesc">{playbook.description}</p>

              <div className="cardMeta">
                {playbook.templates.length}{" "}
                {playbook.templates.length === 1 ? "step" : "steps"}
              </div>

              <Link
                href={`/playbook/${playbook.id}`}
                className="button buttonPrimary"
              >
                Open system
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="container section">
        <div className="glassCard ctaBand" style={{ padding: 30, textAlign: "center" }}>
          <div className="badge">Thalovo Pro+</div>

          <h2 className="pageTitle" style={{ marginTop: 14 }}>
            Want a system shaped around your business?
          </h2>

          <p className="muted" style={{ maxWidth: 700, margin: "10px auto", lineHeight: 1.75 }}>
            Pro+ is for agencies and founders who want help refining their
            offer, structuring outbound, and building a reply-focused system
            they can actually use.
          </p>

          <Link href="/pricing" className="button buttonPrimary">
            Explore Pro+
          </Link>
        </div>
      </section>
    </main>
  );
}
