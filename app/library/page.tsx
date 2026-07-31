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
  const [stageFilter, setStageFilter] = useState("All");
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
  const stageOptions = useMemo(
    () => [
      "All",
      ...Array.from(new Set(playbooks.map((playbook) => playbook.salesStage))),
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

      const matchesBadge =
        badgeFilter === "All" || playbook.badge === badgeFilter;
      const matchesAudience =
        audienceFilter === "All" || playbook.audience === audienceFilter;
      const matchesStage =
        stageFilter === "All" || playbook.salesStage === stageFilter;

      return matchesQuery && matchesBadge && matchesAudience && matchesStage;
    });

    const sorted = [...filtered];
    if (sortBy === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "steps") {
      sorted.sort((a, b) => b.templates.length - a.templates.length);
    }

    return sorted;
  }, [query, badgeFilter, audienceFilter, stageFilter, sortBy]);

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader libraryHeader">
          <div className="badge">Lead Capture and Outreach</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Find the right message for the use case in front of you.
          </h1>
          <p className="muted">
            Templates are grouped by outreach type, client type, and sales
            stage so your agency can move faster without digging through a
            giant generic library.
          </p>
        </div>

        <div className="glassCard libraryFilters">
          <div className="grid libraryFilterGrid">
            <div className="formGroup" style={{ marginBottom: 0 }}>
              <label className="label">Search use cases</label>
              <input
                className="input"
                placeholder="Search by stage, reply goal, or message type"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="formGroup" style={{ marginBottom: 0 }}>
              <label className="label">Outreach type</label>
              <select
                className="input"
                value={badgeFilter}
                onChange={(event) => setBadgeFilter(event.target.value)}
              >
                {badgeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "All" ? "Any outreach type" : option}
                  </option>
                ))}
              </select>
            </div>

            <div className="formGroup" style={{ marginBottom: 0 }}>
              <label className="label">Client type</label>
              <select
                className="input"
                value={audienceFilter}
                onChange={(event) => setAudienceFilter(event.target.value)}
              >
                {audienceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "All" ? "Any client type" : option}
                  </option>
                ))}
              </select>
            </div>

            <div className="formGroup" style={{ marginBottom: 0 }}>
              <label className="label">Sales stage</label>
              <select
                className="input"
                value={stageFilter}
                onChange={(event) => setStageFilter(event.target.value)}
              >
                {stageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "All" ? "Any sales stage" : option}
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
                setStageFilter("All");
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
              Try clearing the filters or searching with a broader term like
              follow-up, proposal, inbound, or cold outreach.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
