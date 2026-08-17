import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";

const businessFeatures = [
  "Shared pipeline for inquiries, scoping calls, proposals, negotiation, and handoff",
  "Shared handoff notes so lead context survives owner changes",
  "Simple ownership rules for who is chasing each lead",
  "Shared outreach messages and follow-up plans",
  "Owner-controlled invitations and removals",
  "Team visibility for scoping calls, proposals, negotiation, and handoff without duplicate chasing",
];

const businessOutcomes = [
  {
    metric: "10",
    label: "Seats included",
    copy: "Bring the people helping with outreach, follow-up, proposals, and handoff into one workspace.",
  },
  {
    metric: "1",
    label: "Shared pipeline",
    copy: "Everyone sees the same leads, stages, owners, notes, and next actions.",
  },
  {
    metric: "0",
    label: "Duplicate chasing",
    copy: "Keep ownership clear so two people do not follow up with the same prospect.",
  },
];

const businessWorkflow = [
  "Invite teammates",
  "Assign lead owners",
  "Share notes and handoff context",
  "Track the next action together",
];

export default function BusinessPage() {
  return (
    <main className="main">
      <section className="container">
        <section className="businessSignupHero">
          <div className="businessSignupCopy">
            <span className="businessSignupBadge">Business Pro</span>
            <h1>Keep your agency team aligned from reply to booked work.</h1>
            <p>
              Business Pro is for small agencies where the founder is not the
              only person chasing leads. Share the pipeline, notes, ownership,
              saved messages, and next actions without adding CRM bloat.
            </p>

            <div className="businessSignupActions">
              <CheckoutButton
                plan="business"
                className="button buttonPrimary businessSignupButton"
              >
                Start Business Pro
              </CheckoutButton>
              <Link href="/pricing" className="button buttonSecondary businessSignupButton">
                Compare plans
              </Link>
            </div>
          </div>

          <aside className="businessSignupPriceCard" aria-label="Business Pro price">
            <span>Team workspace</span>
            <strong>GBP 29</strong>
            <small>/month, 10 seats included</small>
            <div className="businessSignupDivider" />
            <p>
              One agency workspace, one payment, and shared access for the
              people helping turn outreach into client work.
            </p>
          </aside>
        </section>

        <section className="businessOutcomeGrid" aria-label="Business Pro outcomes">
          {businessOutcomes.map((outcome) => (
            <article key={outcome.label}>
              <strong>{outcome.metric}</strong>
              <h2>{outcome.label}</h2>
              <p>{outcome.copy}</p>
            </article>
          ))}
        </section>

        <section className="businessSignupBody">
          <div className="businessIncludedPanel">
            <h2>What Business Pro includes</h2>
            <div className="businessIncludedList">
              <span>Everything in Pro for each active teammate</span>
              {businessFeatures.map((feature) => (
                <span key={feature}>{feature}</span>
              ))}
              <span>One payment for the business</span>
            </div>
          </div>

          <div className="businessWorkflowPanel">
            <span className="statusPill statusPillSuccess">Shared workflow</span>
            <h2>Built for handoff</h2>
            <p>
              When one person starts the conversation and another continues it,
              the context stays with the lead: owner, notes, stage, files, and
              the next action.
            </p>

            <div className="businessWorkflowSteps">
              {businessWorkflow.map((step, index) => (
                <div key={step}>
                  <strong>{index + 1}</strong>
                  <span>{step}</span>
                </div>
              ))}
            </div>

            <div className="businessSignupActions businessSignupActionsCompact">
              <CheckoutButton plan="business">Start Business Pro</CheckoutButton>
              <Link href="/team" className="button buttonSecondary">
                View team area
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
