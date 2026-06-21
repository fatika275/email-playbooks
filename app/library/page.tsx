"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount } from "@/components/account-provider";
import { getPlaybookAccess } from "@/lib/access";
import { trackEvent } from "@/lib/analytics";
import { playbooks } from "@/lib/data";

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const [badgeFilter, setBadgeFilter] = useState("All");
  const [audienceFilter, setAudienceFilter] = useState("All");
  const [sortBy, setSortBy] = useState("featured");
  const { hasProAccess } = useAccount();

  const badgeOptions = useMemo(
    () => ["All", ...Array.from(new Set(playbooks.map((playbook) => playbook.badge)))],
    []
  );
  const audienceOptions = useMemo(
    () => [
      "All",
      ...Array.from(new Set(playbooks.map((playbook) => playbook.audience))),
    ],
    []
  );

  const filteredPlaybooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = playbooks.filter((playbook) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          playbook.name,
          playbook.shortDescription,
          playbook.description,
          playbook.badge,
          playbook.audience,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesBadge =
        badgeFilter === "All" || playbook.badge === badgeFilter;
      const matchesAudience =
        audienceFilter === "All" || playbook.audience === audienceFilter;

      return matchesQuery && matchesBadge && matchesAudience;
    });

    const sorted = [...filtered];
    if (sortBy === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "steps") {
      sorted.sort((a, b) => b.templates.length - a.templates.length);
    }

    return sorted;
  }, [query, badgeFilter, audienceFilter, sortBy]);

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader libraryHeader">
          <div className="badge">System Library</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Choose the outreach system that fits the conversation.
          </h1>
          <p className="muted">
            Browse playbooks for cold outreach, follow-ups, objections,
            proposals, re-engagement, and reusable sequences.
          </p>
        </div>

        <div className="glassCard libraryFilters">
          <div className="grid libraryFilterGrid">
            <div className="formGroup" style={{ marginBottom: 0 }}>
              <label className="label">Search systems</label>
              <input
                className="input"
                placeholder="Search by use case, audience, or playbook name"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="formGroup" style={{ marginBottom: 0 }}>
              <label className="label">Category</label>
              <select
                className="input"
                value={badgeFilter}
                onChange={(event) => setBadgeFilter(event.target.value)}
              >
                {badgeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="formGroup" style={{ marginBottom: 0 }}>
              <label className="label">Audience</label>
              <select
                className="input"
                value={audienceFilter}
                onChange={(event) => setAudienceFilter(event.target.value)}
              >
                {audienceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="formGroup" style={{ marginBottom: 0 }}>
              <label className="label">Sort</label>
              <select
                className="input"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="name">Name</option>
                <option value="steps">Most steps</option>
              </select>
            </div>
          </div>

          <div className="toolbar" style={{ marginTop: 16 }}>
            {badgeOptions.slice(1).map((option) => (
              <button
                key={option}
                type="button"
                className={
                  badgeFilter === option
                    ? "button buttonPrimary"
                    : "button buttonUtility"
                }
                onClick={() => setBadgeFilter(option)}
              >
                {option}
              </button>
            ))}

            <button
              type="button"
              className="button buttonUtility"
              onClick={() => {
                setQuery("");
                setBadgeFilter("All");
                setAudienceFilter("All");
                setSortBy("featured");
              }}
            >
              Reset filters
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
                  {playbook.audience} . {playbook.templates.length}{" "}
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
                    Open system
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {filteredPlaybooks.length === 0 ? (
          <div className="glassCard emptyState" style={{ marginTop: 22 }}>
            <h3 className="cardTitle">No systems match that search yet</h3>
            <p className="muted" style={{ maxWidth: 620, marginInline: "auto" }}>
              Try clearing the filters or searching with a broader term like
              follow-up, proposal, or outbound.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
