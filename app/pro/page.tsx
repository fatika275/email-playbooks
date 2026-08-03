import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";

const proFeatures = [
  "Email templates to start conversations faster",
  "Agency pipeline stages for prospects, proposals, retainers, and client handoff",
  "Follow-up tools to stop warm leads slipping",
  "Basic reporting for replies, booked calls, and won deals",
  "Reusable saved messages and follow-up plans",
];

export default function ProPage() {
  return (
    <main className="main">
      <section className="container">
        <div className="planHero">
          <div>
            <div className="badge">Pro</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>
              Built for one job: turn outreach into booked clients.
            </h1>
            <p className="muted" style={{ marginTop: 14, lineHeight: 1.75 }}>
              Pro connects the simple pieces small agencies need: templates to
              start conversations, agency-native pipeline tracking, follow-up
              tools, and reporting that shows what is working. It is built for
              one job: turn outreach into booked clients, not act like a general
              CRM for every business.
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
                proposals, retainers, follow-ups, and booking clients without a
                heavy sales platform.
              </p>
            </div>

            <div className="glassCard planDetailCard">
              <h2 className="cardTitle">What happens next</h2>
              <p className="muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
                Create an account, complete checkout, then start moving leads
                from first touch to booked call to active client.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
