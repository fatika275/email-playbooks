"use client";

import Link from "next/link";
import { useAccount } from "@/components/account-provider";

const workspaceItems = [
  {
    href: "/history",
    label: "Saved Emails",
    badge: "Library",
    description:
      "Reuse the outreach and follow-up messages that help turn leads into calls.",
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
    label: "Folders",
    badge: "Pro",
    description:
      "Group saved emails and follow-up plans by client, offer, or campaign.",
  },
];

export default function WorkspacePage() {
  const { hasProAccess } = useAccount();

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Saved Work</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Keep your best client-chasing assets ready to reuse.
          </h1>
          <p className="muted" style={{ maxWidth: 760, lineHeight: 1.75 }}>
            Find saved messages, follow-up plans, and campaign folders without
            mixing finished assets into your active lead pipeline.
          </p>
        </div>

        <div className="workspaceHero glassCard">
          <div>
            <span className={hasProAccess ? "statusPill statusPillSuccess" : "statusPill statusPillWarning"}>
              {hasProAccess ? "Pro workspace active" : "Free workspace preview"}
            </span>
            <h2 className="sectionTitle" style={{ marginTop: 16 }}>
              Reuse what helps leads become booked work.
            </h2>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
              Open saved drafts and follow-up plans here, then organise them by client,
              offer, or campaign when your agency outreach grows.
            </p>
          </div>

          {!hasProAccess ? (
            <Link href="/pricing" className="button buttonPrimary">
              Unlock Pro Workspace
            </Link>
          ) : (
            <Link href="/history" className="button buttonPrimary">
              Open Saved Emails
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
