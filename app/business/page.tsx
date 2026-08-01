import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";

const businessFeatures = [
  "Everything in Pro",
  "Team sharing to keep everyone aligned on leads",
  "Shared notes, activity, proposals, retainers, and handoffs",
  "One payment for the business",
  "Full Pro access for up to 10 teammates",
  "Shared lead-capture messages and follow-up plans",
  "Owner-controlled invitations and removals",
  "Team visibility to avoid duplicate chasing",
];

export default function BusinessPage() {
  return (
    <main className="main">
      <section className="container">
        <div className="planHero">
          <div>
            <div className="badge">Business Pro</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>
              One shared place for the team handling leads.
            </h1>
            <p className="muted" style={{ marginTop: 14, lineHeight: 1.75 }}>
              For small agencies where the founder is not the only person
              chasing replies. Share the same lightweight outreach and pipeline
              workflow so notes, follow-ups, booked calls, and handoffs stay
              visible while the team turns outreach into booked clients.
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
              so everyone works from the same pipeline, notes, and next actions.
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
