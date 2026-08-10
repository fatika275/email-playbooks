"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  type CustomTemplate,
  type SavedEmail,
  useCustomTemplates,
  useEmails,
} from "@/lib/storage";
import {
  deleteCustomTemplateRecord,
  deleteEmailRecord,
  saveCustomTemplateRecord,
  saveEmailRecord,
} from "@/lib/cloud";

type SavedItem =
  | {
      id: string;
      type: "email";
      title: string;
      subject: string;
      body: string;
      folder: string | null;
      tags: string[];
      isFavorite: boolean;
      createdAt: string;
      href: string;
      item: SavedEmail;
    }
  | {
      id: string;
      type: "sequence";
      title: string;
      subject: string;
      body: string;
      folder: string | null;
      tags: string[];
      isFavorite: boolean;
      createdAt: string;
      href: string;
      item: CustomTemplate;
    };

type SavedGroup = {
  name: string;
  items: SavedItem[];
};

function getFolderName(folder: string | null) {
  return folder?.trim() || "Unfiled";
}

function getPreview(text: string, maxLength = 130) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trim()}...`;
}

export default function WorkspacePage() {
  const emails = useEmails();
  const templates = useCustomTemplates();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedItemKey, setSelectedItemKey] = useState("");
  const [folderName, setFolderName] = useState("");
  const [notice, setNotice] = useState("");

  const allItems = useMemo<SavedItem[]>(
    () => [
      ...emails.map((email) => ({
        id: email.id,
        type: "email" as const,
        title: email.templateLabel,
        subject: email.subject,
        body: email.body,
        folder: email.folder,
        tags: email.tags,
        isFavorite: email.isFavorite,
        createdAt: email.createdAt,
        href: `/history/${email.id}`,
        item: email,
      })),
      ...templates.map((template) => ({
        id: template.id,
        type: "sequence" as const,
        title: template.title,
        subject: template.subject,
        body: template.body,
        folder: template.folder,
        tags: template.tags,
        isFavorite: template.isFavorite,
        createdAt: template.createdAt,
        href: `/custom-templates/${template.id}`,
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
            .map((item) => item.folder?.trim())
            .filter((folder): folder is string => Boolean(folder))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [allItems]
  );

  const folderGroups = useMemo<SavedGroup[]>(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = allItems.filter((item) => {
      const matchesType =
        typeFilter === "All" ||
        (typeFilter === "Messages" && item.type === "email") ||
        (typeFilter === "Follow-up plans" && item.type === "sequence");

      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          item.title,
          item.subject,
          item.body,
          item.folder ?? "",
          item.tags.join(" "),
          item.type,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesType && matchesQuery;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title);
      if (sortBy === "folder") {
        return getFolderName(a.folder).localeCompare(getFolderName(b.folder));
      }
      if (sortBy === "favorites") {
        const favoriteOrder = Number(b.isFavorite) - Number(a.isFavorite);
        if (favoriteOrder !== 0) return favoriteOrder;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const groups = new Map<string, SavedItem[]>();
    for (const item of sorted) {
      const folder = getFolderName(item.folder);
      groups.set(folder, [...(groups.get(folder) ?? []), item]);
    }

    return Array.from(groups.entries())
      .map(([name, items]) => ({ name, items }))
      .sort((a, b) => {
        if (a.name === "Unfiled") return 1;
        if (b.name === "Unfiled") return -1;
        return a.name.localeCompare(b.name);
      });
  }, [allItems, query, sortBy, typeFilter]);

  async function handleMoveToFolder() {
    const item = allItems.find(
      (candidate) => `${candidate.type}:${candidate.id}` === selectedItemKey
    );
    const nextFolder = folderName.trim();

    if (!item || !nextFolder) {
      setNotice("Choose saved work and a folder name.");
      return;
    }

    try {
      if (item.type === "email") {
        await saveEmailRecord({ ...item.item, folder: nextFolder });
      } else {
        await saveCustomTemplateRecord({ ...item.item, folder: nextFolder });
      }

      setSelectedItemKey("");
      setFolderName("");
      setNotice(`Moved "${item.title}" to ${nextFolder}.`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not move this item."
      );
    }
  }

  async function handleDeleteItem(item: SavedItem) {
    if (
      !window.confirm(
        `Delete "${item.title}" from Saved? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      if (item.type === "email") {
        await deleteEmailRecord(item.id);
      } else {
        await deleteCustomTemplateRecord(item.id);
      }

      setNotice(`Deleted "${item.title}".`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not delete this item."
      );
    }
  }

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader savedSimpleHeader">
          <h1 className="pageTitle">Saved</h1>
        </div>

        <div className="savedToolbar">
          <input
            className="input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search saved work"
            aria-label="Search saved work"
          />
          <select
            className="input"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            aria-label="Filter saved work"
          >
            <option>All</option>
            <option>Messages</option>
            <option>Follow-up plans</option>
          </select>
          <select
            className="input"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            aria-label="Sort saved work"
          >
            <option value="newest">Newest</option>
            <option value="name">Name</option>
            <option value="folder">Folder</option>
            <option value="favorites">Favorites</option>
          </select>
        </div>

        {allItems.length > 0 ? (
          <div className="savedMoveBar">
            <select
              className="input"
              value={selectedItemKey}
              onChange={(event) => setSelectedItemKey(event.target.value)}
              aria-label="Saved item to move"
            >
              <option value="">Move saved work...</option>
              {allItems.map((item) => (
                <option key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>
                  {item.type === "email" ? "Message" : "Plan"}: {item.title}
                </option>
              ))}
            </select>
            <input
              className="input"
              list="saved-folder-suggestions"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="Folder name"
              aria-label="Folder name"
            />
            <datalist id="saved-folder-suggestions">
              {existingFolders.map((folder) => (
                <option key={folder} value={folder} />
              ))}
            </datalist>
            <button
              type="button"
              className="button buttonSecondary"
              onClick={() => void handleMoveToFolder()}
            >
              Move
            </button>
          </div>
        ) : null}

        {notice ? <p className="notice">{notice}</p> : null}

        {allItems.length === 0 ? (
          <div className="glassCard emptyState">
            <h2 className="cardTitle">No saved work yet</h2>
          </div>
        ) : (
          <div className="savedFolderStack">
            {folderGroups.map((folder) => (
              <section key={folder.name} className="savedFolder">
                <div className="savedFolderHeader">
                  <h2>{folder.name}</h2>
                  <span>{folder.items.length}</span>
                </div>

                <div className="savedItemGrid">
                  {folder.items.map((item) => (
                    <article key={`${item.type}:${item.id}`} className="savedItemCard">
                      <Link href={item.href} className="savedItemMain">
                        <div className="cardTop">
                          <h3 className="cardTitle">{item.title}</h3>
                          <span className="miniBadge">
                            {item.isFavorite
                              ? "Favorite"
                              : item.type === "email"
                                ? "Message"
                                : "Plan"}
                          </span>
                        </div>
                        <p className="templateMeta">Subject: {item.subject}</p>
                        <p className="muted">{getPreview(item.body)}</p>
                      </Link>

                      <div className="savedItemActions">
                        <Link href={item.href} className="button buttonSecondary">
                          Open
                        </Link>
                        <button
                          type="button"
                          className="button buttonUtility"
                          onClick={() => void handleDeleteItem(item)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}

            {folderGroups.length === 0 ? (
              <div className="glassCard emptyState">
                <h2 className="cardTitle">No saved work matches that search</h2>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
