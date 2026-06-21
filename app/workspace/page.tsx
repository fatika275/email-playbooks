"use client";

import Link from "next/link";
import { useAccount } from "@/components/account-provider";

const workspaceItems = [
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
];

export default function WorkspacePage() {
  const { hasProAccess } = useAccount();

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Workspace</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Your Outreach Workspace
          </h1>
          <p className="muted" style={{ maxWidth: 760, lineHeight: 1.75 }}>
            Build, save, organise, and return to the outreach assets that are
            already working for you.
          </p>
        </div>

        <div className="workspaceHero glassCard">
          <div>
            <span className={hasProAccess ? "statusPill statusPillSuccess" : "statusPill statusPillWarning"}>
              {hasProAccess ? "Pro workspace active" : "Free workspace preview"}
            </span>
            <h2 className="sectionTitle" style={{ marginTop: 16 }}>
              Fewer links up top, more useful structure in here.
            </h2>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
              The main navigation now stays focused. This page holds the tools
              that support saved work and campaign building.
            </p>
          </div>

          {!hasProAccess ? (
            <Link href="/pricing" className="button buttonPrimary">
              Unlock Pro Workspace
            </Link>
          ) : (
            <Link href="/sequence-builder" className="button buttonPrimary">
              Build Sequence
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
