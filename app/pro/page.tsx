import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";

const proFeatures = [
  "Full playbook library",
  "Full sequence builder",
  "Unlimited saved emails and folders",
  "Reusable sequence library",
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
              Build outbound as a repeatable system.
            </h1>
            <p className="muted" style={{ marginTop: 14, lineHeight: 1.75 }}>
              Pro is for people who send outreach regularly and want more than
              isolated templates. It gives you the full library, reusable
              sequences, saved drafts, and a workspace that improves over time.
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
                View workspace
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
                Agencies, founders, and service businesses that want outbound
                to become a repeatable workflow instead of a blank-page task.
              </p>
            </div>

            <div className="glassCard planDetailCard">
              <h2 className="cardTitle">What happens next</h2>
              <p className="muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
                Create an account, complete checkout, and Pro unlocks on that
                account after Stripe confirms payment.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
