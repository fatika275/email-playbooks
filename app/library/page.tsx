"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount } from "@/components/account-provider";
import { getPlaybookAccess } from "@/lib/access";
import { trackEvent } from "@/lib/analytics";
import { playbooks } from "@/lib/data";

const TEMPLATE_GROUPS = [
  {
    id: "all",
    label: "All agency templates",
    description: "Every saved message flow.",
    playbookIds: playbooks.map((playbook) => playbook.id),
  },
  {
    id: "outreach",
    label: "Outreach sequences",
    description: "Start conversations with new prospects.",
    playbookIds: ["cold-outreach-sequence", "demo-booking-sequence", "inbound-lead-replies"],
  },
  {
    id: "followup",
    label: "Follow-up templates",
    description: "Keep warm leads moving after the first touch.",
    playbookIds: ["follow-up-frameworks", "meeting-follow-up", "no-show-recovery", "objection-handling-replies"],
  },
  {
    id: "proposal",
    label: "Proposal reminders",
    description: "Chase decisions after sending scope or pricing.",
    playbookIds: ["proposal-follow-up"],
  },
  {
    id: "winback",
    label: "Client win-back flows",
    description: "Restart cold leads and past-client conversations.",
    playbookIds: ["re-engagement-emails", "client-renewal-upsell"],
  },
] satisfies {
  id: string;
  label: string;
  description: string;
  playbookIds: string[];
}[];

type TemplateGroupId = (typeof TEMPLATE_GROUPS)[number]["id"];

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const [templateGroup, setTemplateGroup] = useState<TemplateGroupId>("all");
  const { hasProAccess } = useAccount();

  const filteredPlaybooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const activeGroup = TEMPLATE_GROUPS.find((group) => group.id === templateGroup) ?? TEMPLATE_GROUPS[0];
    return playbooks.filter((playbook) => {
      const matchesTemplateGroup = activeGroup.playbookIds.includes(playbook.id);
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          playbook.name,
          playbook.shortDescription,
          playbook.description,
          playbook.badge,
          playbook.audience,
          playbook.salesStage,
          ...playbook.templates.flatMap((template) => [
            template.label,
            template.goal,
            template.whenToUse,
          ]),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesTemplateGroup && matchesQuery;
    });
  }, [query, templateGroup]);

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader libraryHeader">
          <div className="badge">Agency template library</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Templates that match agency work.
          </h1>
          <p className="muted">
            Start with outreach sequences, follow-up templates, proposal
            reminders, and client win-back flows so your agency can chase at
            the right time without digging through a giant generic library.
          </p>
        </div>

        <div className="libraryTemplateGroups" aria-label="Agency template type">
          {TEMPLATE_GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              className={templateGroup === group.id ? "libraryTemplateGroup isActive" : "libraryTemplateGroup"}
              onClick={() => setTemplateGroup(group.id)}
            >
              <span>{group.label}</span>
              <small>{group.description}</small>
            </button>
          ))}
        </div>

        <div className="glassCard libraryFilters">
          <div className="libraryFilterGrid">
            <div className="formGroup" style={{ marginBottom: 0 }}>
              <label className="label">Search templates</label>
              <input
                className="input"
                placeholder="Search proposal, win-back, follow-up..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <button
              type="button"
              className="button buttonUtility"
              onClick={() => {
                setQuery("");
                setTemplateGroup("all");
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid libraryGrid">
          {filteredPlaybooks.map((playbook) => {
            const access = getPlaybookAccess(playbook, hasProAccess);

            return (
              <div
                key={playbook.id}
                className={`playbookCard glassCard ${access.isLocked ? "lockedCard" : ""}`}
              >
                <div className="cardTop">
                  <h3 className="cardTitle">{playbook.name}</h3>
                  <div className="playbookBadges">
                    <span className="miniBadge">{playbook.badge}</span>
                    <span className={access.isFree ? "miniBadge" : "miniBadge proBadge"}>
                      {access.label}
                    </span>
                  </div>
                </div>

                <p className="cardDesc">{playbook.description}</p>

                <div className="cardMeta">
                  {playbook.badge} . {playbook.audience} . {playbook.salesStage} . {playbook.templates.length}{" "}
                  {playbook.templates.length === 1 ? "step" : "steps"}
                </div>

                {access.isLocked ? (
                  <Link
                    href="/pricing"
                    className="button buttonSecondary"
                    onClick={() =>
                      trackEvent("library_upgrade_from_locked_playbook", {
                        playbookId: playbook.id,
                      })
                    }
                  >
                    Unlock with Pro
                  </Link>
                ) : (
                  <Link
                    href={`/playbook/${playbook.id}`}
                    className="button buttonPrimary"
                    onClick={() =>
                      trackEvent("library_open_playbook", { playbookId: playbook.id })
                    }
                  >
                    Open use-case messages
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {filteredPlaybooks.length === 0 ? (
          <div className="glassCard emptyState" style={{ marginTop: 22 }}>
            <h3 className="cardTitle">No outreach messages match that search yet</h3>
            <p className="muted" style={{ maxWidth: 620, marginInline: "auto" }}>
              Try clearing the search or using a broader term like
              follow-up, proposal, inbound, or cold outreach.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
