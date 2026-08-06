"use client";

import Link from "next/link";
import { useAccount } from "@/components/account-provider";

const workspaceItems = [
  {
    href: "/history",
    label: "Saved Outreach",
    badge: "Messages",
    description:
      "Reuse the outreach messages that help start conversations and get replies.",
  },
  {
    href: "/custom-templates",
    label: "Saved Follow-up Plans",
    badge: "Pro",
    description:
      "Keep the chasing plans that stop warm prospects slipping after the first touch.",
  },
  {
    href: "/folders",
    label: "Organise Agency Assets",
    badge: "Pro",
    description:
      "Use folders only when saved messages and follow-up plans start piling up.",
  },
];

export default function WorkspacePage() {
  const { hasProAccess } = useAccount();

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Agency Assets</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Keep your best outreach and follow-up assets ready to reuse.
          </h1>
          <p className="muted" style={{ maxWidth: 760, lineHeight: 1.75 }}>
            Find the messages, proposal chasers, and follow-up plans that help
            leads become booked client work.
          </p>
        </div>

        <div className="workspaceHero glassCard">
          <div>
            <span className={hasProAccess ? "statusPill statusPillSuccess" : "statusPill statusPillWarning"}>
              {hasProAccess ? "Agency assets active" : "Free asset preview"}
            </span>
            <h2 className="sectionTitle" style={{ marginTop: 16 }}>
              Reuse what helps leads become booked work.
            </h2>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
              Open saved drafts, proposal chasers, and follow-up plans here,
              then get back to the lead you are trying to move.
            </p>
          </div>

          {!hasProAccess ? (
            <Link href="/pricing" className="button buttonPrimary">
              Unlock Pro Assets
            </Link>
          ) : (
            <Link href="/history" className="button buttonPrimary">
              Open Saved Outreach
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
