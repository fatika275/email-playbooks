"use client";

import Link from "next/link";
import { useAccount } from "@/components/account-provider";

const workspaceItems = [
  {
    href: "/library",
    label: "Message Library",
    badge: "Messages",
    description:
      "Browse reusable outreach messages manually, or let prospect workflows choose the right one for you.",
  },
  {
    href: "/prospects",
    label: "Prospect Pipeline",
    badge: "Pro",
    description:
      "Track leads, deal stages, values, notes, and the next follow-up needed to win a client.",
  },
  {
    href: "/sequence-builder",
    label: "Sequence Builder",
    badge: "Pro",
    description:
      "Build a multi-step sequence from proven playbook steps and save it for reuse.",
  },
  {
    href: "/history",
    label: "Saved Emails",
    badge: "Library",
    description:
      "Open, copy, duplicate, and organise individual emails you have saved.",
  },
  {
    href: "/custom-templates",
    label: "Reusable Sequences",
    badge: "Pro",
    description:
      "Keep your strongest sequence versions and reuse them across campaigns.",
  },
  {
    href: "/folders",
    label: "Folders",
    badge: "Pro",
    description:
      "Group saved emails and reusable sequences by client, offer, or campaign.",
  },
  {
    href: "/team",
    label: "Team Library",
    badge: "Business",
    description:
      "Share messages and reusable sequences securely with teammates.",
  },
];

export default function WorkspacePage() {
  const { hasProAccess } = useAccount();

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Workspace</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Your Agency Outreach Workspace
          </h1>
          <p className="muted" style={{ maxWidth: 760, lineHeight: 1.75 }}>
            Keep leads, outreach, and follow-ups together so your agency can book
            more work without adding a complicated CRM.
          </p>
        </div>

        <div className="workspaceHero glassCard">
          <div>
            <span className={hasProAccess ? "statusPill statusPillSuccess" : "statusPill statusPillWarning"}>
              {hasProAccess ? "Pro workspace active" : "Free workspace preview"}
            </span>
            <h2 className="sectionTitle" style={{ marginTop: 16 }}>
              Know who to contact and what happens next.
            </h2>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
              Start in the prospect pipeline, move into the right message, then
              return to log contact and schedule the next follow-up.
            </p>
          </div>

          {!hasProAccess ? (
            <Link href="/pricing" className="button buttonPrimary">
              Unlock Pro Workspace
            </Link>
          ) : (
            <Link href="/prospects" className="button buttonPrimary">
              Open Pipeline
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
