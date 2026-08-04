"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { type CustomTemplate, useCustomTemplates } from "@/lib/storage";
import { playbooks } from "@/lib/data";
import { useAccount } from "@/components/account-provider";

type EnrichedTemplate = CustomTemplate & {
  sourcePlaybookName: string;
  sourceTemplateLabel: string;
};

function getBodyPreview(body: string, maxLength = 140) {
  const clean = body.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trim()}...`;
}

function isGenericCampaignName(folder: string) {
  return ["all", "all campaigns", "campaign", "campaigns"].includes(
    folder.trim().toLowerCase()
  );
}

export default function ReusableSequencesPage() {
  const { hasProAccess } = useAccount();
  const templates = useCustomTemplates();
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [folderFilter, setFolderFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const enrichedTemplates = useMemo<EnrichedTemplate[]>(
    () =>
      templates.map((template) => {
      const sourcePlaybook = playbooks.find(
        (p) => p.id === template.sourcePlaybookId
      );

      const sourceTemplate = sourcePlaybook?.templates.find(
        (t) => t.id === template.sourceTemplateId
      );

      const sourceTemplateLabel = sourceTemplate?.label || "Saved Step";
      return {
        ...template,
        sourcePlaybookName: sourcePlaybook?.name || "Saved Follow-up Plan",
        sourceTemplateLabel,
      };
    }),
    [templates]
  );

  const folderOptions = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          templates
            .map((template) => template.folder)
            .filter((folder): folder is string => Boolean(folder?.trim()))
            .map((folder) => folder.trim())
            .filter((folder) => !isGenericCampaignName(folder))
        )
      ).sort((a, b) => a.localeCompare(b)),
    ],
    [templates]
  );

  const visibleTemplates = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return enrichedTemplates
      .filter((template) => {
          const matchesQuery =
            normalized.length === 0 ||
            [
              template.title,
              template.subject,
              template.body,
              template.sourceTemplateLabel,
              template.sourcePlaybookName,
              template.folder ?? "",
              ...template.tags,
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalized);

          const matchesFavorite = !favoritesOnly || template.isFavorite;
          const matchesFolder =
            folderFilter === "All" || template.folder?.trim() === folderFilter;

          return matchesQuery && matchesFavorite && matchesFolder;
        })
      .sort((a, b) => {
        if (sortBy === "oldest") {
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        }

        if (sortBy === "name") {
          return a.title.localeCompare(b.title);
        }

        if (sortBy === "favorites") {
          const favoriteOrder = Number(b.isFavorite) - Number(a.isFavorite);
          if (favoriteOrder !== 0) return favoriteOrder;
        }

        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [enrichedTemplates, query, favoritesOnly, folderFilter, sortBy]);

  if (!hasProAccess) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <div className="badge">Pro Library</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>
              Saved Follow-up Plans are Pro
            </h1>
            <p className="muted" style={{ maxWidth: 680, marginInline: "auto" }}>
              Free access includes the core playbooks. Pro unlocks reusable
              follow-up plans, reminders, folders, and the full playbook
              library for leads that need chasing.
            </p>
            <div className="toolbar" style={{ justifyContent: "center", marginTop: 20 }}>
              <Link href="/pricing" className="button buttonPrimary">
                View Pro
              </Link>
              <Link href="/" className="button buttonSecondary">
                Use Free Playbooks
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Follow-up Plans</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Your Follow-up Plan Library
          </h1>
          <p className="muted">
            Keep the saved follow-ups you use when deals need another nudge,
            more context, or a timely reminder.
          </p>
        </div>

        {templates.length === 0 ? (
          <div className="glassCard emptyState">
            <h3 className="cardTitle">No follow-up plans yet</h3>

            <p className="muted" style={{ maxWidth: 620, marginInline: "auto" }}>
              Build your first follow-up plan, save the version you want to
              reuse, and it will appear here for the next lead that goes quiet.
            </p>

            <div
              style={{
                display: "grid",
                gap: 10,
                maxWidth: 420,
                margin: "20px auto 0",
                textAlign: "left",
              }}
            >
              <div className="glassCard" style={{ padding: 14 }}>
                <strong>1. Create</strong>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  Start from the follow-up builder when a lead needs chasing.
                </p>
              </div>

              <div className="glassCard" style={{ padding: 14 }}>
                <strong>2. Save version</strong>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  Save the version you want to reuse later.
                </p>
              </div>

              <div className="glassCard" style={{ padding: 14 }}>
                <strong>3. Reuse</strong>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  Attach it to a lead when you need the next reminder and
                  message ready.
                </p>
              </div>
            </div>

            <div className="toolbar" style={{ justifyContent: "center", marginTop: 20 }}>
              <Link href="/library" className="button buttonPrimary">
                Browse Agency Templates
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 24 }}>
            <div className="glassCard" style={{ padding: 18 }}>
              <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr 1fr" }}>
                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Search follow-up plans</label>
                  <input
                    className="input"
                    placeholder="Search by title, subject, or message content"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>

                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Campaign</label>
                  <select
                    className="input"
                    value={folderFilter}
                    onChange={(event) => setFolderFilter(event.target.value)}
                  >
                    {folderOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "All" ? "Any campaign" : option}
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
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="name">Name</option>
                    <option value="favorites">Favorites First</option>
                  </select>
                </div>
              </div>

              <div className="toolbar" style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className={favoritesOnly ? "button buttonPrimary" : "button buttonSecondary"}
                  onClick={() => setFavoritesOnly((prev) => !prev)}
                >
                  {favoritesOnly ? "Showing Favorites" : "Favorites Only"}
                </button>
              </div>
            </div>

            {visibleTemplates.length > 0 ? (
              <section className="glassCard" style={{ padding: 20 }}>
                <div className="cardTop">
                  <div>
                    <div className="badge">Saved Plans</div>
                    <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
                      {visibleTemplates.length} saved{" "}
                      {visibleTemplates.length === 1 ? "plan" : "plans"}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 16,
                    marginTop: 18,
                  }}
                >
                      {visibleTemplates.map((template) => (
                        <Link
                          key={template.id}
                          href={`/custom-templates/${template.id}`}
                          className="listCard glassCard clickable"
                          style={{
                            display: "block",
                            padding: 20,
                            textDecoration: "none",
                          }}
                        >
                          <div className="cardTop">
                            <h3 className="cardTitle">{template.title}</h3>
                            <span className="miniBadge">
                              {template.isFavorite ? "Favorite" : "Follow-up Plan"}
                            </span>
                          </div>

                          <p className="templateMeta">
                            Subject: {template.subject}
                          </p>

                          {(template.folder && !isGenericCampaignName(template.folder)) || template.tags.length > 0 ? (
                            <div style={{ marginTop: 8 }}>
                              {template.folder && !isGenericCampaignName(template.folder) ? (
                                <p className="small" style={{ margin: "0 0 8px" }}>
                                  Campaign: {template.folder.trim()}
                                </p>
                              ) : null}
                              {template.tags.length > 0 ? (
                                <div className="tagRow">
                                  {template.tags.map((tag) => (
                                    <span key={tag} className="tagChip">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          <p className="small">
                            Source: {template.sourcePlaybookName} {"->"}{" "}
                            {template.sourceTemplateLabel}
                          </p>

                          <p
                            className="muted"
                            style={{ marginTop: 10, lineHeight: 1.6 }}
                          >
                            {getBodyPreview(template.body)}
                          </p>

                          <p className="small" style={{ marginTop: 10 }}>
                            Saved on {new Date(template.createdAt).toLocaleString()}
                          </p>
                        </Link>
                      ))}
                </div>
              </section>
            ) : null}

            {visibleTemplates.length === 0 ? (
              <div className="glassCard emptyState">
                <h3 className="cardTitle">No follow-up plans match that search</h3>
                <p className="muted" style={{ maxWidth: 620, marginInline: "auto" }}>
                  Try clearing the filters or use a broader keyword from the
                  title, subject, or message body.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
