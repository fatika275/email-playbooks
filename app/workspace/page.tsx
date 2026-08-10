"use client";

import Link from "next/link";
import { useAccount } from "@/components/account-provider";
import { useCustomTemplates, useEmails } from "@/lib/storage";

const workspaceItems = [
  {
    href: "/folders",
    label: "Saved Library",
    badge: "Folders",
    description:
      "Browse saved messages and follow-up plans together, organized by client, campaign, use case, or team folder.",
  },
  {
    href: "/history",
    label: "Saved Messages",
    badge: "Messages",
    description:
      "Open individual outreach, proposal, win-back, and reply messages you reuse.",
  },
  {
    href: "/custom-templates",
    label: "Follow-up Plans",
    badge: "Plans",
    description:
      "Reuse the chase sequences that stop warm prospects slipping after the first touch.",
  },
];

export default function WorkspacePage() {
  const { hasProAccess } = useAccount();
  const emails = useEmails();
  const templates = useCustomTemplates();
  const totalSaved = emails.length + templates.length;
  const folderCount = new Set(
    [...emails, ...templates]
      .map((item) => item.folder?.trim())
      .filter((folder): folder is string => Boolean(folder))
  ).size;

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Saved library</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Keep every reusable agency asset easy to find.
          </h1>
          <p className="muted" style={{ maxWidth: 760, lineHeight: 1.75 }}>
            Put saved outreach, proposal chasers, win-back messages, and
            follow-up plans in one organized library, then open the right asset
            when a lead needs the next move.
          </p>
        </div>

        <div className="workspaceHero glassCard">
          <div>
            <span className={hasProAccess ? "statusPill statusPillSuccess" : "statusPill statusPillWarning"}>
              {hasProAccess ? `${totalSaved} saved asset${totalSaved === 1 ? "" : "s"}` : "Free saved-library preview"}
            </span>
            <h2 className="sectionTitle" style={{ marginTop: 16 }}>
              Work from folders when saved work starts piling up.
            </h2>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
              {folderCount
                ? `${folderCount} folder${folderCount === 1 ? "" : "s"} already help separate campaigns, client types, and reusable chase plans.`
                : "Start with simple folders like Outreach, Proposal chase, Win-back, or Client handoff."}
            </p>
          </div>

          {!hasProAccess ? (
            <Link href="/pricing" className="button buttonPrimary">
              Unlock saved library
            </Link>
          ) : (
            <Link href="/folders" className="button buttonPrimary">
              Open Saved Library
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
