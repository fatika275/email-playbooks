import { siteConfig } from "@/lib/site-config";

export default function TermsPage() {
  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Terms</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Terms of service
          </h1>
          <p className="muted" style={{ maxWidth: 780, lineHeight: 1.75 }}>
            These terms explain how customers can use Thalovo, how billing
            works, and what to expect from the service.
          </p>
        </div>

        <div className="glassCard legalCard">
          <div className="legalBlock">
            <h2 className="cardTitle">Business details</h2>
            <p className="muted">
              These terms apply to {siteConfig.businessName}, with support
              available at {siteConfig.supportEmail}.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">1. Service</h2>
            <p className="muted">
              Thalovo provides educational materials, playbooks, templates, and
              workflow tools for outbound messaging. Features may change over
              time as the product improves.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">2. Accounts</h2>
            <p className="muted">
              Customers are responsible for keeping their account email secure
              and for making sure their account information is accurate. Account
              access must not be used in a way that misrepresents identity or
              abuses the service.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">3. Acceptable use</h2>
            <p className="muted">
              Customers must comply with applicable email, privacy, consumer, and
              anti-spam laws in the places where you operate. Thalovo provides
              messaging systems and examples, but each customer remains
              responsible for how those materials are used in practice.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">4. Payments</h2>
            <p className="muted">
              Paid plans are billed according to the pricing shown at checkout
              unless clearly stated otherwise. Payments are processed by Stripe.
              Any taxes, fees, and billing details shown at checkout form part
              of the customer&apos;s order.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">5. Founder pricing</h2>
            <p className="muted">
              Founder pricing is invite-only and may be limited to selected
              accounts. If founder pricing is offered as a locked rate, that
              rate stays in place while the subscription remains active. If the
              subscription is cancelled, switched away from, or later restarted,
              Founder pricing may no longer be available and a different price
              may apply.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">6. Refunds and cancellations</h2>
            <p className="muted">
              Refund handling is governed by the refund policy published on this
              site. Customers can cancel future billing at any time, but past
              charges are not automatically refunded unless the published refund
              policy says otherwise.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">7. No guarantee of results</h2>
            <p className="muted">
              Thalovo does not promise meetings, replies, revenue, or client
              wins. Outbound performance depends on your offer, audience,
              deliverability, list quality, execution, and follow-through.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">8. Contact</h2>
            <p className="muted">
              Customer support contact: {siteConfig.supportEmail}. Business
              address: {siteConfig.businessAddress}.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
