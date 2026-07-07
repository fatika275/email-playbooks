"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { type CustomTemplate, useCustomTemplates } from "@/lib/storage";
import { playbooks } from "@/lib/data";
import { useAccount } from "@/components/account-provider";

type GroupedTemplates = {
  sourcePlaybookId: string;
  sourcePlaybookName: string;
  items: (CustomTemplate & {
    sourceTemplateLabel: string;
  })[];
};

function getBodyPreview(body: string, maxLength = 140) {
  const clean = body.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trim()}...`;
}

export default function ReusableSequencesPage() {
  const { hasProAccess } = useAccount();
  const templates = useCustomTemplates();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [playbookFilter, setPlaybookFilter] = useState("All");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [folderFilter, setFolderFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const groupedTemplates = useMemo<GroupedTemplates[]>(() => {
    const groups = new Map<
      string,
      (CustomTemplate & { sourceTemplateLabel: string })[]
    >();

    for (const template of templates) {
      const sourcePlaybook = playbooks.find(
        (p) => p.id === template.sourcePlaybookId
      );

      const sourceTemplate = sourcePlaybook?.templates.find(
        (t) => t.id === template.sourceTemplateId
      );

      const sourceTemplateLabel = sourceTemplate?.label || "Saved Step";
      const groupKey = template.sourcePlaybookId || "saved-sequences";

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }

      groups.get(groupKey)?.push({
        ...template,
        sourceTemplateLabel,
      });
    }

    return Array.from(groups.entries()).map(([sourcePlaybookId, items]) => {
      const playbook = playbooks.find((p) => p.id === sourcePlaybookId);

      return {
        sourcePlaybookId,
        sourcePlaybookName: playbook?.name || "Reusable Sequence",
        items,
      };
    });
  }, [templates]);

  const playbookOptions = useMemo(
    () => ["All", ...groupedTemplates.map((group) => group.sourcePlaybookName)],
    [groupedTemplates]
  );

  const folderOptions = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          templates
            .map((template) => template.folder)
            .filter((folder): folder is string => Boolean(folder))
        )
      ),
    ],
    [templates]
  );

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return groupedTemplates
      .map((group) => ({
        ...group,
        items: group.items.filter((template) => {
          const matchesQuery =
            normalized.length === 0 ||
            [
              template.title,
              template.subject,
              template.body,
              template.sourceTemplateLabel,
              group.sourcePlaybookName,
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalized);

          const matchesPlaybook =
            playbookFilter === "All" ||
            group.sourcePlaybookName === playbookFilter;

          const matchesFavorite = !favoritesOnly || template.isFavorite;
          const matchesFolder =
            folderFilter === "All" || template.folder === folderFilter;

          return matchesQuery && matchesPlaybook && matchesFavorite && matchesFolder;
        }),
      }))
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => {
          if (sortBy === "oldest") {
            return (
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          }

          if (sortBy === "name") {
            return a.title.localeCompare(b.title);
          }

          if (sortBy === "favorites") {
            return Number(b.isFavorite) - Number(a.isFavorite);
          }

          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [groupedTemplates, query, playbookFilter, favoritesOnly, folderFilter, sortBy]);

  function toggleGroup(groupId: string) {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }

  if (!hasProAccess) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <div className="badge">Pro Library</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>
              Reusable Sequences are Pro
            </h1>
            <p className="muted" style={{ maxWidth: 680, marginInline: "auto" }}>
              Free access includes the core playbooks. Pro unlocks reusable
              sequences, folders, the sequence builder, and the full playbook
              library.
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
          <div className="badge">Reusable Sequences</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Your Sequence Library
          </h1>
          <p className="muted">
            Save your best sequence steps and build a reusable outbound library
            over time.
          </p>
        </div>

        {templates.length === 0 ? (
          <div className="glassCard emptyState">
            <h3 className="cardTitle">No reusable sequences yet</h3>

            <p className="muted" style={{ maxWidth: 620, marginInline: "auto" }}>
              Create your first email, save the version you want to keep, and
              it will appear here as a reusable sequence asset.
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
                  Start from any playbook step in the Message Library.
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
                  Come back anytime and open it as part of your sequence library.
                </p>
              </div>
            </div>

            <div className="toolbar" style={{ justifyContent: "center", marginTop: 20 }}>
              <Link href="/" className="button buttonPrimary">
                Browse Message Library
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 24 }}>
            <div className="glassCard" style={{ padding: 18 }}>
              <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr" }}>
                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Search reusable sequences</label>
                  <input
                    className="input"
                    placeholder="Search by title, subject, or sequence content"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>

                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Filter by playbook</label>
                  <select
                    className="input"
                    value={playbookFilter}
                    onChange={(event) => setPlaybookFilter(event.target.value)}
                  >
                    {playbookOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Folder</label>
                  <select
                    className="input"
                    value={folderFilter}
                    onChange={(event) => setFolderFilter(event.target.value)}
                  >
                    {folderOptions.map((option) => (
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

            {filteredGroups.map((group) => {
              const isOpen =
                openGroups[group.sourcePlaybookId] === undefined
                  ? true
                  : openGroups[group.sourcePlaybookId];

              return (
                <section
                  key={group.sourcePlaybookId}
                  className="glassCard"
                  style={{ padding: 20 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div className="badge">{group.sourcePlaybookName}</div>
                      <p
                        className="muted"
                        style={{ marginTop: 10, marginBottom: 0 }}
                      >
                        {group.items.length} saved{" "}
                        {group.items.length === 1 ? "sequence" : "sequences"}
                      </p>
                    </div>

                    <button
                      className="button buttonUtility"
                      onClick={() => toggleGroup(group.sourcePlaybookId)}
                    >
                      {isOpen ? "Hide Sequences" : "Show Sequences"}
                    </button>
                  </div>

                  {isOpen ? (
                    <div
                      style={{
                        display: "grid",
                        gap: 16,
                        marginTop: 18,
                      }}
                    >
                      {group.items.map((template) => (
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
                              {template.isFavorite ? "Favorite" : "Reusable Sequence"}
                            </span>
                          </div>

                          <p className="templateMeta">
                            Subject: {template.subject}
                          </p>

                          {template.folder || template.tags.length > 0 ? (
                            <div style={{ marginTop: 8 }}>
                              {template.folder ? (
                                <p className="small" style={{ margin: "0 0 8px" }}>
                                  Folder: {template.folder}
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
                            From: {group.sourcePlaybookName} {"->"}{" "}
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
                  ) : null}
                </section>
              );
            })}

            {filteredGroups.length === 0 ? (
              <div className="glassCard emptyState">
                <h3 className="cardTitle">No reusable sequences match that search</h3>
                <p className="muted" style={{ maxWidth: 620, marginInline: "auto" }}>
                  Try clearing the filter or use a broader keyword from the
                  title, subject, or sequence body.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
