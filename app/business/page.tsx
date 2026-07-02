import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";

const businessFeatures = [
  "Everything in Pro",
  "One payment for the business",
  "Full Pro access for up to 10 teammates",
  "Secure shared templates and sequences",
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
              One subscription for your working team.
            </h1>
            <p className="muted" style={{ marginTop: 14, lineHeight: 1.75 }}>
              The business owner pays once and invites up to 10 teammates. Each
              accepted teammate receives full Pro access while they remain part
              of the active business workspace.
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
              from Team Library.
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
