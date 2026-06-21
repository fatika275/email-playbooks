import { siteConfig } from "@/lib/site-config";

export default function PrivacyPage() {
  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Privacy</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Privacy policy
          </h1>
          <p className="muted" style={{ maxWidth: 780, lineHeight: 1.75 }}>
            This page explains what customer information Thalovo collects, how
            it is used, and who customers can contact about privacy questions.
          </p>
        </div>

        <div className="glassCard legalCard">
          <div className="legalBlock">
            <h2 className="cardTitle">Who controls the data</h2>
            <p className="muted">
              {siteConfig.businessName} is operated using the contact details
              shown on this site. Privacy requests can be sent to{" "}
              {siteConfig.supportEmail}.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">1. What we collect</h2>
            <p className="muted">
              Thalovo may collect account details such as email address, profile
              information, billing-related information supplied through Stripe,
              and content you save inside the product such as templates, saved
              emails, and sequence drafts.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">2. Why we use it</h2>
            <p className="muted">
              Customer data is used to operate the product, sync accounts across
              devices, improve the service, provide support, secure accounts,
              and manage billing and refunds.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">3. Payments</h2>
            <p className="muted">
              Payments are processed by Stripe. Thalovo does not store full card
              numbers. Billing and payment handling are subject to Stripe&apos;s
              systems and policies in addition to Thalovo&apos;s own site
              policies.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">4. Data storage</h2>
            <p className="muted">
              Account and workspace information may be stored with service
              providers used to run Thalovo, including authentication, cloud
              storage, hosting, and payment infrastructure providers.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">5. Data sharing</h2>
            <p className="muted">
              Thalovo does not sell customer personal information. Limited data
              may be shared with providers that help run the product, process
              payments, prevent abuse, or comply with legal obligations.
            </p>
          </div>

          <div className="legalBlock">
            <h2 className="cardTitle">6. Your choices</h2>
            <p className="muted">
              Customers can request account access, correction, or deletion,
              subject to legal and operational requirements. Privacy requests
              should be sent to {siteConfig.supportEmail}.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
