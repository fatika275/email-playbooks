import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";

const proFeatures = [
  "Agency pipeline for inquiries, scoping calls, proposals, negotiation, and handoff",
  "Follow-up reminders so warm leads do not slip because the chase was late",
  "Outreach, follow-up, proposal chase, and win-back message libraries",
  "Saved client work, reusable messages, and follow-up plans",
  "Simple reporting for replies, booked calls, proposals, signed work, and leakage",
  "One individual workspace for running your own client chase",
];

const proOutcomes = [
  {
    metric: "01",
    label: "Start better conversations",
    copy: "Use agency-ready templates instead of rewriting outreach and follow-ups from scratch.",
  },
  {
    metric: "02",
    label: "Track every live lead",
    copy: "See where each prospect sits from first reply through proposal and close.",
  },
  {
    metric: "03",
    label: "Know what to chase next",
    copy: "Use reminders and pipeline actions to keep good leads from going quiet.",
  },
];

const proWorkflow = [
  "Add a prospect",
  "Choose or write the next message",
  "Track the reply and stage",
  "Follow up until booked, won, or closed",
];

export default function ProPage() {
  return (
    <main className="main">
      <section className="container">
        <section className="proSignupHero">
          <div className="proSignupCopy">
            <span className="proSignupBadge">Pro</span>
            <h1>Turn outreach into booked client work without losing leads.</h1>
            <p>
              Pro is the main Thalovo workflow for solo agency owners and small
              service sellers who need outreach, pipeline tracking, follow-up,
              and simple reporting in one focused place.
            </p>

            <div className="proSignupActions">
              <CheckoutButton
                plan="pro"
                className="button buttonPrimary proSignupButton"
              >
                Start Pro
              </CheckoutButton>
              <Link href="/pricing" className="button buttonSecondary proSignupButton">
                Compare plans
              </Link>
            </div>
          </div>

          <aside className="proSignupPriceCard" aria-label="Pro price">
            <span>For one individual account</span>
            <strong>GBP 19</strong>
            <small>/month</small>
            <div className="proSignupDivider" />
            <p>
              Choose Business Pro when teammates need shared pipeline, notes,
              and lead ownership.
            </p>
          </aside>
        </section>

        <section className="proOutcomeGrid" aria-label="Pro outcomes">
          {proOutcomes.map((outcome) => (
            <article key={outcome.label}>
              <strong>{outcome.metric}</strong>
              <h2>{outcome.label}</h2>
              <p>{outcome.copy}</p>
            </article>
          ))}
        </section>

        <section className="proSignupBody">
          <div className="proIncludedPanel">
            <h2>What Pro includes</h2>
            <div className="proIncludedList">
              {proFeatures.map((feature) => (
                <span key={feature}>{feature}</span>
              ))}
            </div>
          </div>

          <div className="proWorkflowPanel">
            <span className="statusPill statusPillSuccess">Fast setup</span>
            <h2>Start with one lead</h2>
            <p>
              You do not need to configure a whole CRM. Add one prospect, pick
              the next action, and build the habit around the client work you
              are already chasing.
            </p>

            <div className="proWorkflowSteps">
              {proWorkflow.map((step, index) => (
                <div key={step}>
                  <strong>{index + 1}</strong>
                  <span>{step}</span>
                </div>
              ))}
            </div>

            <div className="proSignupActions proSignupActionsCompact">
              <CheckoutButton plan="pro">Start Pro</CheckoutButton>
              <Link href="/workspace" className="button buttonSecondary">
                View saved work
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
