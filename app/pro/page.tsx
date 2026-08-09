import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";

const proFeatures = [
  "Use-case messages for outreach, follow-up, proposal chase, and win-back",
  "Start with one prospect and a simple agency path",
  "Agency pipeline stages for inquiries, scoping calls, proposals, negotiation, and handoff",
  "Follow-up reminders to stop warm leads slipping because the chase was late",
  "Practical reporting for replies, booked calls, proposals, signed work, stage speed, and leakage",
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
              leads slipping because the chase was late: use-case messages for
              outreach, follow-up, proposal chase, and win-back,
              agency-native pipeline tracking, and practical reporting for the
              signals that help you chase better: replies, booked calls,
              proposals, signed client work, stage speed, and leakage.
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
                Solo agency owners and small service teams who have leads coming in but
                need one clear path for outreach, scoping calls, proposals,
                negotiation, follow-up reminders, and booking clients without a
                long setup project.
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
