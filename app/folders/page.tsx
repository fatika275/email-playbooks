"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount } from "@/components/account-provider";
import {
  type CustomTemplate,
  type SavedEmail,
  useCustomTemplates,
  useEmails,
} from "@/lib/storage";
import { saveCustomTemplateRecord, saveEmailRecord } from "@/lib/cloud";

type FolderItem =
  | {
      id: string;
      type: "email";
      title: string;
      subject: string;
      href: string;
      tags: string[];
      isFavorite: boolean;
      createdAt: string;
      item: SavedEmail;
    }
  | {
      id: string;
      type: "sequence";
      title: string;
      subject: string;
      href: string;
      tags: string[];
      isFavorite: boolean;
      createdAt: string;
      item: CustomTemplate;
    };

type FolderGroup = {
  name: string;
  items: FolderItem[];
};

function getFolderName(folder: string | null) {
  return folder?.trim() || "Unfiled";
}

function getPreview(text: string, maxLength = 130) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trim()}...`;
}

export default function FoldersPage() {
  const { hasProAccess } = useAccount();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedItemKey, setSelectedItemKey] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folderNotice, setFolderNotice] = useState("");

  const emails = useEmails();
  const templates = useCustomTemplates();

  const allItems = useMemo<FolderItem[]>(
    () => [
      ...emails.map((email) => ({
        id: email.id,
        type: "email" as const,
        title: email.templateLabel,
        subject: email.subject,
        href: `/history/${email.id}`,
        tags: email.tags,
        isFavorite: email.isFavorite,
        createdAt: email.createdAt,
        item: email,
      })),
      ...templates.map((template) => ({
        id: template.id,
        type: "sequence" as const,
        title: template.title,
        subject: template.subject,
        href: `/custom-templates/${template.id}`,
        tags: template.tags,
        isFavorite: template.isFavorite,
        createdAt: template.createdAt,
        item: template,
      })),
    ],
    [emails, templates]
  );

  const existingFolders = useMemo(
    () =>
      Array.from(
        new Set(
          allItems
            .map((item) => item.item.folder?.trim())
            .filter((folder): folder is string => Boolean(folder))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [allItems]
  );

  const folderGroups = useMemo<FolderGroup[]>(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const items = allItems.filter((item) => {
      const matchesType =
        typeFilter === "All" ||
        (typeFilter === "Saved Emails" && item.type === "email") ||
        (typeFilter === "Follow-up Plans" && item.type === "sequence");

      const folder =
        item.type === "email" ? item.item.folder : item.item.folder;

      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          item.title,
          item.subject,
          folder ?? "",
          item.tags.join(" "),
          item.type,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesType && matchesQuery;
    });

    const sortedItems = [...items].sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title);
      if (sortBy === "folder") {
        const folderA = getFolderName(
          a.type === "email" ? a.item.folder : a.item.folder
        );
        const folderB = getFolderName(
          b.type === "email" ? b.item.folder : b.item.folder
        );
        return folderA.localeCompare(folderB);
      }
      if (sortBy === "favorites") {
        return Number(b.isFavorite) - Number(a.isFavorite);
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const groups = new Map<string, FolderItem[]>();
    for (const item of sortedItems) {
      const folder = getFolderName(
        item.type === "email" ? item.item.folder : item.item.folder
      );
      groups.set(folder, [...(groups.get(folder) ?? []), item]);
    }

    return Array.from(groups.entries())
      .map(([name, groupItems]) => ({ name, items: groupItems }))
      .sort((a, b) => {
        if (a.name === "Unfiled") return 1;
        if (b.name === "Unfiled") return -1;
        return a.name.localeCompare(b.name);
      });
  }, [allItems, query, typeFilter, sortBy]);

  const totalItems = emails.length + templates.length;

  async function handleAssignFolder() {
    const item = allItems.find(
      (candidate) => `${candidate.type}:${candidate.id}` === selectedItemKey
    );
    const nextFolder = folderName.trim();

    if (!item || !nextFolder) {
      setFolderNotice("Choose an item and enter a folder name first.");
      return;
    }

    try {
      if (item.type === "email") {
        await saveEmailRecord({ ...item.item, folder: nextFolder });
      } else {
        await saveCustomTemplateRecord({ ...item.item, folder: nextFolder });
      }

      setFolderNotice(`Moved “${item.title}” to ${nextFolder}.`);
      setSelectedItemKey("");
      setFolderName("");
    } catch (error) {
      setFolderNotice(
        error instanceof Error ? error.message : "Could not update the folder."
      );
    }
  }

  if (!hasProAccess) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <div className="badge">Pro Organization</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>
              Folders are a Pro feature
            </h1>
            <p className="muted" style={{ maxWidth: 680, marginInline: "auto" }}>
              Free access gives you the core playbooks. Pro unlocks folders so
              saved emails and follow-up plans stay organized as your library
              grows.
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
          <div className="badge">Folders</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Organize Your Outreach Library
          </h1>
          <p className="muted" style={{ maxWidth: 760, lineHeight: 1.75 }}>
            Folders collect saved emails and follow-up plans in one place so
            your best work is easier to find.
          </p>
        </div>

        <div className="glassCard" style={{ padding: 18, marginBottom: 22 }}>
          <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr 1fr" }}>
            <div className="formGroup" style={{ marginBottom: 0 }}>
              <label className="label">Search folders</label>
              <input
                className="input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search folder, title, subject, or tag"
              />
            </div>

            <div className="formGroup" style={{ marginBottom: 0 }}>
              <label className="label">Type</label>
              <select
                className="input"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option>All</option>
                <option>Saved Emails</option>
                <option>Follow-up Plans</option>
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
                <option value="name">Name</option>
                <option value="folder">Folder</option>
                <option value="favorites">Favorites First</option>
              </select>
            </div>
          </div>
        </div>

        {totalItems > 0 ? (
          <div className="glassCard" style={{ padding: 22, marginBottom: 22 }}>
            <div className="cardTop">
              <div>
                <h2 className="cardTitle">Add an item to a folder</h2>
                <p className="muted" style={{ margin: "8px 0 0" }}>
                  Choose saved work, then use an existing folder name or type a
                  new one. The first item creates the folder automatically.
                </p>
              </div>
            </div>

            <div
              className="folderOrganizerGrid"
              style={{
                alignItems: "end",
                marginTop: 18,
              }}
            >
              <div className="formGroup" style={{ marginBottom: 0 }}>
                <label className="label" htmlFor="folder-item">
                  Saved email or follow-up plan
                </label>
                <select
                  id="folder-item"
                  className="input"
                  value={selectedItemKey}
                  onChange={(event) => setSelectedItemKey(event.target.value)}
                >
                  <option value="">Choose an item</option>
                  {allItems.map((item) => (
                    <option key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>
                      {item.type === "email" ? "Email" : "Plan"}: {item.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="formGroup" style={{ marginBottom: 0 }}>
                <label className="label" htmlFor="folder-name">
                  Folder name
                </label>
                <input
                  id="folder-name"
                  className="input"
                  list="folder-suggestions"
                  value={folderName}
                  onChange={(event) => setFolderName(event.target.value)}
                  placeholder="Example: Client campaigns"
                />
                <datalist id="folder-suggestions">
                  {existingFolders.map((folder) => (
                    <option key={folder} value={folder} />
                  ))}
                </datalist>
              </div>

              <button
                type="button"
                className="button buttonPrimary"
                onClick={() => void handleAssignFolder()}
              >
                Move to folder
              </button>
            </div>

            {folderNotice ? <p className="notice">{folderNotice}</p> : null}
          </div>
        ) : null}

        {totalItems === 0 ? (
          <div className="glassCard emptyState">
            <h3 className="cardTitle">No saved work yet</h3>
            <p className="muted" style={{ maxWidth: 620, marginInline: "auto" }}>
              Save an email or follow-up plan first. Then return here to put
              it into a folder.
            </p>
            <div className="toolbar" style={{ justifyContent: "center", marginTop: 20 }}>
              <Link href="/sequence-builder" className="button buttonPrimary">
                Build a Follow-up Plan
              </Link>
              <Link href="/" className="button buttonSecondary">
                Browse Playbooks
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 22 }}>
            {folderGroups.map((folder) => (
              <section key={folder.name} className="glassCard" style={{ padding: 20 }}>
                <div className="folderHeader">
                  <div>
                    <div className="badge">{folder.name}</div>
                    <p className="muted" style={{ margin: "10px 0 0" }}>
                      {folder.items.length} saved{" "}
                      {folder.items.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                </div>

                <div className="folderItemGrid">
                  {folder.items.map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      href={item.href}
                      className="glassCard clickable folderItemCard"
                    >
                      <div className="cardTop">
                        <h3 className="cardTitle">{item.title}</h3>
                        <span className="miniBadge">
                          {item.isFavorite
                            ? "Favorite"
                            : item.type === "email"
                              ? "Saved Email"
                              : "Plan"}
                        </span>
                      </div>

                      <p className="templateMeta">Subject: {item.subject}</p>

                      {item.tags.length > 0 ? (
                        <div className="tagRow" style={{ marginTop: 10 }}>
                          {item.tags.map((tag) => (
                            <span key={tag} className="tagChip">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
                        {getPreview(
                          item.type === "email" ? item.item.body : item.item.body
                        )}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ))}

            {folderGroups.length === 0 ? (
              <div className="glassCard emptyState">
                <h3 className="cardTitle">No folders match that search</h3>
                <p className="muted" style={{ maxWidth: 620, marginInline: "auto" }}>
                  Try a broader search or clear the type filter.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
