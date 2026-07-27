import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";

const businessFeatures = [
  "Everything in Pro",
  "One shared pipeline from outreach to booked work",
  "One payment for the business",
  "Full Pro access for up to 10 teammates",
  "Secure shared templates and follow-up plans",
  "Owner-controlled invitations and removals",
  "Central Team Library",
];

export default function BusinessPage() {
  return (
    <main className="main">
      <section className="container">
        <div className="planHero">
          <div>
            <div className="badge">Business Pro</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>
              One shared place for leads, replies, and handoffs.
            </h1>
            <p className="muted" style={{ marginTop: 14, lineHeight: 1.75 }}>
              For small teams where more than one person touches a lead. Keep
              follow-ups, replies, booked calls, and deal handoffs visible
              instead of scattered across individual inboxes.
            </p>

            <ul className="featureList">
              {businessFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>

          <aside className="glassCard planCheckoutCard">
            <span className="statusPill statusPillSuccess">10 seats included</span>
            <h2 className="pageTitle" style={{ marginTop: 16 }}>
              GBP 29<span className="muted">/month</span>
            </h2>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
              Only the workspace owner is billed. Invite teammates after payment
              so everyone works from the same client-work pipeline.
            </p>
            <div style={{ marginTop: 20 }}>
              <CheckoutButton plan="business">Start Business Pro</CheckoutButton>
            </div>
            <Link
              href="/pricing"
              className="button buttonSecondary"
              style={{ marginTop: 10 }}
            >
              Back to pricing
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
