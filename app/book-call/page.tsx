import Link from "next/link";
import { getBillingLinks, getPlanHref } from "@/lib/billing";

export default function BookCallPage() {
  const billingLinks = getBillingLinks();
  const bookCallHref = getPlanHref(billingLinks.bookCall, "/account");
  const hasBookingLink = Boolean(billingLinks.bookCall);

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Pro+</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Book a strategy call for a tailored outbound system
          </h1>
          <p className="muted" style={{ maxWidth: 760, lineHeight: 1.75 }}>
            Pro+ is the higher-touch offer for agencies and founders who want
            help refining positioning, tightening messaging, and building a
            reply-focused workflow around their business.
          </p>
        </div>

        <div className="grid" style={{ alignItems: "start" }}>
          <section className="glassCard" style={{ padding: 28 }}>
            <h2 className="cardTitle">What the call is for</h2>
            <ul className="featureList">
              <li>Review your current outbound process</li>
              <li>Find where replies are being lost</li>
              <li>Map a stronger cold outreach and follow-up structure</li>
              <li>Decide whether a tailored Thalovo system makes sense</li>
            </ul>
          </section>

          <section className="glassCard" style={{ padding: 28 }}>
            <h2 className="cardTitle">
              {hasBookingLink ? "Choose a time" : "Register your interest"}
            </h2>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
              {hasBookingLink
                ? "Use the booking button below to open the live scheduling page."
                : "Share your details and we will follow up about the best next step for Pro+."}
            </p>

            <div className="toolbar" style={{ marginTop: 20 }}>
              <Link href={bookCallHref} className="button buttonPrimary">
                {hasBookingLink ? "Open booking page" : "Go to account"}
              </Link>
              <Link href="/pricing" className="button buttonSecondary">
                Back to pricing
              </Link>
            </div>

            <div className="glassCard" style={{ padding: 18, marginTop: 20 }}>
              <h3 className="cardTitle" style={{ fontSize: 18 }}>
                Good fit for Pro+
              </h3>
              <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
                Pro+ is best when you already have an offer, audience, or sales
                motion and want the outreach system tightened around it.
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
