"use client";

import { useMemo, useState } from "react";
import { useEmails } from "@/lib/storage";
import Link from "next/link";

function getBodyPreview(body: string, maxLength = 180) {
  const clean = body.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trim()}...`;
}

export default function SavedEmailsPage() {
  const emails = useEmails();
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [folderFilter, setFolderFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const folderOptions = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          emails
            .map((email) => email.folder)
            .filter((folder): folder is string => Boolean(folder))
        )
      ),
    ],
    [emails]
  );
  const filteredEmails = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = emails.filter((email) => {
      const matchesQuery =
        !normalized ||
        [
          email.templateLabel,
          email.subject,
          email.body,
          email.playbookId,
          email.folder ?? "",
          email.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      const matchesFavorite = !favoritesOnly || email.isFavorite;
      const matchesFolder =
        folderFilter === "All" || email.folder === folderFilter;

      return matchesQuery && matchesFavorite && matchesFolder;
    });

    const sorted = [...filtered];
    if (sortBy === "oldest") {
      sorted.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else if (sortBy === "subject") {
      sorted.sort((a, b) => a.subject.localeCompare(b.subject));
    } else if (sortBy === "favorites") {
      sorted.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return sorted;
  }, [emails, query, favoritesOnly, folderFilter, sortBy]);

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Saved agency messages</div>

          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Your saved use-case messages
          </h1>

          <p className="muted">
            Open saved outreach, follow-up, proposal, and win-back messages to
            copy them or use them again.
          </p>
        </div>

        {emails.length === 0 ? (
          <div className="glassCard emptyState">
            <h3 className="cardTitle">No saved agency messages yet</h3>

            <p className="muted" style={{ maxWidth: 620, marginInline: "auto" }}>
              Create your first use-case message, save it, and come back to
              reuse it from your saved agency messages.
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
                  Start from lead capture and outreach when you need a new message.
                </p>
              </div>

              <div className="glassCard" style={{ padding: 14 }}>
                <strong>2. Save</strong>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  Save the email you want to keep for later.
                </p>
              </div>

              <div className="glassCard" style={{ padding: 14 }}>
                <strong>3. Reuse</strong>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  Open it again anytime to copy it or use it again.
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
          <div style={{ display: "grid", gap: 16 }}>
            <div className="glassCard" style={{ padding: 18 }}>
              <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr 1fr" }}>
                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Search saved messages</label>
                  <input
                    className="input"
                    placeholder="Search by subject, use case, or message copy"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
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
                    <option value="subject">Subject</option>
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

            {filteredEmails.map((email) => (
              <Link
                key={email.id}
                href={`/history/${email.id}`}
                className="glassCard clickable"
                style={{
                  padding: 20,
                  display: "block",
                  textDecoration: "none",
                }}
              >
                <div className="cardTop">
                  <h3 className="cardTitle">{email.templateLabel}</h3>
                  <span className="miniBadge">
                    {email.isFavorite ? "Favorite" : "Saved message"}
                  </span>
                </div>

                <p className="templateMeta">Subject: {email.subject}</p>

                {email.folder || email.tags.length > 0 ? (
                  <div style={{ marginTop: 8 }}>
                    {email.folder ? (
                      <p className="small" style={{ margin: "0 0 8px" }}>
                        Folder: {email.folder}
                      </p>
                    ) : null}
                    {email.tags.length > 0 ? (
                      <div className="tagRow">
                        {email.tags.map((tag) => (
                          <span key={tag} className="tagChip">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <p
                  className="muted"
                  style={{ marginTop: 10, lineHeight: 1.6 }}
                >
                  {getBodyPreview(email.body)}
                </p>

                <p className="small" style={{ marginTop: 10 }}>
                  Saved on {new Date(email.createdAt).toLocaleString()}
                </p>
              </Link>
            ))}

            {filteredEmails.length === 0 ? (
              <div className="glassCard emptyState">
                <h3 className="cardTitle">No saved agency messages match that search</h3>
                <p className="muted" style={{ maxWidth: 620, marginInline: "auto" }}>
                  Try a broader phrase or search by subject, template name, or
                  a keyword from the message body.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
