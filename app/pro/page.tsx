import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";

const proFeatures = [
  "Outreach sequences, follow-up templates, proposal reminders, and client win-back flows",
  "Start with one prospect and a ready-made agency workflow",
  "Agency pipeline stages for prospects, proposals, retainers, and client handoff",
  "Follow-up tools to stop warm leads slipping",
  "Outcome reporting for replies, booked calls, signed work, and lead leakage",
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
              For solo agency owners turning outreach into booked client work.
            </h1>
            <p className="muted" style={{ marginTop: 14, lineHeight: 1.75 }}>
              Pro connects the simple pieces a solo agency owner needs to stop
              leads slipping: outreach sequences, follow-up templates, proposal
              reminders, client win-back flows, agency-native pipeline
              tracking, and outcome reporting for replies, booked calls, signed
              client work, and lead leakage.
            </p>
          </div>

          <aside className="glassCard planCheckoutCard">
            <span className="statusPill statusPillSuccess">Paid access</span>
            <h2 className="pageTitle" style={{ marginTop: 16 }}>
              GBP 19<span className="muted">/month</span>
            </h2>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
              Pro is for one individual account. Choose Business Pro when
              teammates need shared pipeline, notes, and lead ownership.
            </p>
            <div className="toolbar" style={{ marginTop: 22 }}>
              <CheckoutButton plan="pro">Start Pro</CheckoutButton>
              <Link href="/workspace" className="button buttonSecondary">
                View agency assets
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
                Solo agency owners and founders who have leads coming in but
                need one clear workflow for outreach, proposals, retainers,
                follow-ups, and booking clients without a long setup project.
              </p>
            </div>

            <div className="glassCard planDetailCard">
              <h2 className="cardTitle">What happens next</h2>
              <p className="muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
                Create an account, complete checkout, add one prospect, choose a
                follow-up plan, and start moving leads from first touch to
                booked client work.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
