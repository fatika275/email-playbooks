"use client";

import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader" style={{ textAlign: "center" }}>
          <div className="badge">Pricing</div>

          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Choose the level of structure you need
          </h1>

          <p
            className="muted"
            style={{
              maxWidth: 700,
              margin: "10px auto",
              lineHeight: 1.75,
            }}
          >
            Thalovo starts with self-serve systems and expands into a more
            tailored offer for businesses that want help shaping their outbound
            process.
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
            Early access is currently free while we refine the system.
          </p>
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
            <div className="badge">Starter</div>

            <h2 className="pageTitle" style={{ marginTop: 14 }}>
              £9<span className="muted">/month</span>
            </h2>

            <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
              For people who want a simple way to send better outreach with
              structure behind it.
            </p>

            <ul className="featureList">
              <li>Core playbooks</li>
              <li>Cold outreach and follow-up systems</li>
              <li>Copy and export emails</li>
              <li>Save emails for reuse</li>
            </ul>

            <div style={{ marginTop: 24 }}>
              <Link href="/" className="button buttonSecondary">
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
              £29<span className="muted">/month</span>
            </h2>

            <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
              For agencies and founders who want a stronger system they can
              reuse, refine, and learn from.
            </p>

            <ul className="featureList">
              <li>Everything in Starter</li>
              <li>Full playbook library</li>
              <li>Expert breakdowns and education</li>
              <li>Reusable sequence versions</li>
              <li>Branded HTML export</li>
            </ul>

            <div style={{ marginTop: 24 }}>
              <Link href="/" className="button buttonPrimary">
                Explore Pro
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
            <div className="badge">Pro+</div>

            <h2 className="pageTitle" style={{ marginTop: 14 }}>
              £500<span className="muted">+/month</span>
            </h2>

            <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
              For businesses that want a more tailored outbound system built
              around their offer, audience, and messaging.
            </p>

            <ul className="featureList">
              <li>Tailored outreach system for your business</li>
              <li>Positioning and messaging refinement</li>
              <li>Custom cold outreach and follow-up structure</li>
              <li>Support refining sequence quality over time</li>
            </ul>

            <div style={{ marginTop: 24 }}>
              <Link href="/" className="button buttonSecondary">
                Ask about Pro+
              </Link>
            </div>
          </div>
        </div>

        <section className="section">
          <div className="glassCard" style={{ padding: 28 }}>
            <div className="badge">What changes across plans</div>

            <h2 className="pageTitle" style={{ marginTop: 14 }}>
              More structure, more reuse, more refinement
            </h2>

            <div className="grid" style={{ marginTop: 20 }}>
              <div className="glassCard" style={{ padding: 20 }}>
                <h3 className="cardTitle">Starter</h3>
                <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                  Good if you want structured outreach without building from
                  scratch every time.
                </p>
              </div>

              <div className="glassCard" style={{ padding: 20 }}>
                <h3 className="cardTitle">Pro</h3>
                <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                  Better if outreach is a regular part of your workflow and you
                  want stronger systems plus better reuse.
                </p>
              </div>

              <div className="glassCard" style={{ padding: 20 }}>
                <h3 className="cardTitle">Pro+</h3>
                <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                  Best if you want help shaping the system around your business
                  instead of relying only on self-serve templates and sequences.
                </p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
