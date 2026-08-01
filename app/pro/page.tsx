import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";

const proFeatures = [
  "Pipeline tracking for stages, replies, and next actions",
  "Follow-up management for deals that stall by delay",
  "Use-case templates by outreach type, client type, and sales stage",
  "Saved follow-up plans and reminder timing",
  "Basic reporting for replies, booked calls, and deal stages",
  "Unlimited saved emails and folders",
  "Easy lead context before every chase",
  "HTML export for more polished sending",
];

export default function ProPage() {
  return (
    <main className="main">
      <section className="container">
        <div className="planHero">
          <div>
            <div className="badge">Pro</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>
              A lightweight outreach and pipeline tool for small agencies.
            </h1>
            <p className="muted" style={{ marginTop: 14, lineHeight: 1.75 }}>
              Pro connects your templates, pipeline, follow-ups, and simple
              reporting so you can book more calls and stop losing leads after
              the first conversation.
            </p>
          </div>

          <aside className="glassCard planCheckoutCard">
            <span className="statusPill statusPillSuccess">Paid access</span>
            <h2 className="pageTitle" style={{ marginTop: 16 }}>
              GBP 19<span className="muted">/month</span>
            </h2>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
              Create or sign into your account first, then checkout will unlock
              Pro access on that account after payment.
            </p>
            <div className="toolbar" style={{ marginTop: 22 }}>
              <CheckoutButton plan="pro">Start Pro</CheckoutButton>
              <Link href="/workspace" className="button buttonSecondary">
                View saved work
              </Link>
            </div>
          </aside>
        </div>

        <section className="section">
          <div className="grid planDetailGrid">
            <div className="glassCard planDetailCard">
              <h2 className="cardTitle">What Pro includes</h2>
              <ul className="featureList">
                {proFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>

            <div className="glassCard planDetailCard">
              <h2 className="cardTitle">Best for</h2>
              <p className="muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
                Small agency owners, founders, and lean sales teams that have
                leads coming in but need one clear workflow for outreach,
                pipeline tracking, follow-up reminders, and handoff.
              </p>
            </div>

            <div className="glassCard planDetailCard">
              <h2 className="cardTitle">What happens next</h2>
              <p className="muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
                Create an account, complete checkout, then start moving leads
                from first touch to booked call to active deal.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
