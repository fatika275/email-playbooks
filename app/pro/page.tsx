import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";

const proFeatures = [
  "Prospect pipeline from first email to booked work",
  "Full playbook library",
  "Full follow-up builder",
  "Unlimited saved emails and folders",
  "Saved follow-up plan library",
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
              Book more client work without losing leads in the follow-up.
            </h1>
            <p className="muted" style={{ marginTop: 14, lineHeight: 1.75 }}>
              Pro is for agency owners and founders who need outreach, replies,
              follow-ups, and active deals in one place instead of scattered
              across inboxes, notes, and memory.
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
                leads coming in but need cleaner follow-up, tracking, and handoff.
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
