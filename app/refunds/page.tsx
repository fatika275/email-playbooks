import { siteConfig } from "@/lib/site-config";

export default function RefundsPage() {
  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Refunds</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Refund and cancellation policy
          </h1>
          <p className="muted" style={{ maxWidth: 780, lineHeight: 1.75 }}>
            This page explains how cancellations and refund requests are handled
            for Thalovo customers.
          </p>
        </div>

        <div className="glassCard legalCard">
          <div className="legalBlock">
            <h2 className="cardTitle">1. Subscription cancellations</h2>
            <p className="muted">
              Customers can cancel a subscription at any time before the next
              billing cycle. Cancellation stops future renewals, but does not
              automatically refund charges that have already been paid.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">2. Refund requests for subscriptions</h2>
            <p className="muted">
              Refund requests made within 7 days of the initial payment may be
              reviewed in good faith if the product has not been meaningfully
              used. Because Thalovo is a digital product, refunds are not
              guaranteed in every case.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">3. Founder plans</h2>
            <p className="muted">
              Founder pricing should usually follow the same cancellation rules
              as standard subscriptions. If founder pricing is described as
              locked, that rate is only preserved while the subscription stays
              active.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">4. How refunds are issued</h2>
            <p className="muted">
              Refunds are issued back to the original payment method through
              Stripe. Processing time depends on the payment method and bank.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">5. Billing support</h2>
            <p className="muted">
              Billing questions, cancellation requests, and refund requests can
              be sent to {siteConfig.supportEmail}.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
