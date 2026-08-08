"use client";

import Link from "next/link";
import { useAccount } from "@/components/account-provider";

const workspaceItems = [
  {
    href: "/history",
    label: "Saved Use-Case Messages",
    badge: "Messages",
    description:
      "Reuse outreach, follow-up, proposal, and win-back messages that help leads move.",
  },
  {
    href: "/custom-templates",
    label: "Saved Follow-up Plans",
    badge: "Pro",
    description:
      "Keep the chasing plans that stop warm prospects slipping after the first touch.",
  },
];

export default function WorkspacePage() {
  const { hasProAccess } = useAccount();

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Saved work</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Keep your best messages and follow-up plans ready.
          </h1>
          <p className="muted" style={{ maxWidth: 760, lineHeight: 1.75 }}>
            Find the outreach messages, follow-up plans, proposal chasers, and
            win-back messages you actually reuse. No extra CRM filing system.
          </p>
        </div>

        <div className="workspaceHero glassCard">
          <div>
            <span className={hasProAccess ? "statusPill statusPillSuccess" : "statusPill statusPillWarning"}>
              {hasProAccess ? "Saved work active" : "Free saved-work preview"}
            </span>
            <h2 className="sectionTitle" style={{ marginTop: 16 }}>
              Reuse what helps leads become booked work.
            </h2>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
              Open saved outreach, follow-up, proposal, and win-back messages
              here, then get back to the lead you are trying to move.
            </p>
          </div>

          {!hasProAccess ? (
            <Link href="/pricing" className="button buttonPrimary">
              Unlock saved work
            </Link>
          ) : (
            <Link href="/history" className="button buttonPrimary">
              Open Saved Messages
            </Link>
          )}
        </div>

        <div className="workspaceGrid">
          {workspaceItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="glassCard clickable workspaceCard"
            >
              <div className="cardTop">
                <h3 className="cardTitle">{item.label}</h3>
                <span className={item.badge === "Pro" ? "miniBadge proBadge" : "miniBadge"}>
                  {item.badge}
                </span>
              </div>
              <p className="muted" style={{ marginTop: 12, lineHeight: 1.7 }}>
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
