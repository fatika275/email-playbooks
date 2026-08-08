"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type SavedEmail, useEmails } from "@/lib/storage";
import { saveEmailRecord } from "@/lib/cloud";
import { ShareWithTeam } from "@/components/share-with-team";

const REUSE_EMAIL_KEY = "thalovo_reuse_email";

export default function SavedEmailViewPage() {
  const params = useParams();
  const router = useRouter();
  const emails = useEmails();

  const id = useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const storedEmail = useMemo<SavedEmail | null>(() => {
    if (!id) return null;
    return emails.find((item) => item.id === id) ?? null;
  }, [emails, id]);
  const [optimisticEmail, setOptimisticEmail] = useState<SavedEmail | null>(
    null
  );
  const email =
    optimisticEmail?.id === storedEmail?.id ? optimisticEmail : storedEmail;
  const [tagsInput, setTagsInput] = useState(
    () => storedEmail?.tags.join(", ") ?? ""
  );
  const [folderInput, setFolderInput] = useState(
    () => storedEmail?.folder ?? ""
  );
  const [savedNotice, setSavedNotice] = useState("");

  async function handleCopy() {
    if (!email) return;

    try {
      await navigator.clipboard.writeText(
        `Subject: ${email.subject}\n\n${email.body}`
      );
      alert("Copied!");
    } catch {
      alert("Copy failed");
    }
  }

  function handleUseAgain() {
    if (!email) return;

    if (typeof window !== "undefined") {
      localStorage.setItem(REUSE_EMAIL_KEY, JSON.stringify(email));
      localStorage.removeItem("arcmail_reuse_email");
    }

    router.push(`/editor/${email.playbookId}/${email.templateId}`);
  }

  async function handleSaveMetadata() {
    if (!email) return;

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const updatedEmail = {
      ...email,
      tags,
      folder: folderInput.trim() || null,
    };

    setOptimisticEmail(updatedEmail);
    await saveEmailRecord(updatedEmail);
    setSavedNotice("Details updated.");
  }

  async function handleToggleFavorite() {
    if (!email) return;

    const updatedEmail = {
      ...email,
      isFavorite: !email.isFavorite,
    };

    setOptimisticEmail(updatedEmail);
    await saveEmailRecord(updatedEmail);
    setSavedNotice(email.isFavorite ? "Removed from favorites." : "Added to favorites.");
  }

  if (!email) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <h1 className="pageTitle">Saved message not found</h1>
            <p className="muted">
              This saved agency message could not be loaded.
            </p>
            <div className="toolbar" style={{ justifyContent: "center" }}>
              <Link href="/history" className="button buttonPrimary">
                Back to Saved Messages
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
          <div className="badge">Saved Email</div>

          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            {email.templateLabel}
          </h1>

          <p className="muted">
            Saved on {new Date(email.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="editorLayout">
          <div className="formCard">
            <div className="glassCard" style={{ padding: 18, marginBottom: 18 }}>
              <h4 style={{ margin: 0 }}>Email Details</h4>
              <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
                <div>
                  <p
                    className="muted"
                    style={{
                      margin: 0,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Subject
                  </p>
                  <p style={{ margin: "6px 0 0", fontWeight: 700 }}>
                    {email.subject}
                  </p>
                </div>

                <div>
                  <p
                    className="muted"
                    style={{
                      margin: 0,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Template
                  </p>
                  <p style={{ margin: "6px 0 0" }}>{email.templateLabel}</p>
                </div>

                <div>
                  <p
                    className="muted"
                    style={{
                      margin: 0,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Saved
                  </p>
                  <p style={{ margin: "6px 0 0" }}>
                    {new Date(email.createdAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p
                    className="muted"
                    style={{
                      margin: 0,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Tags
                  </p>
                  <div className="tagRow" style={{ marginTop: 8 }}>
                    {email.tags.length > 0 ? (
                      email.tags.map((tag) => (
                        <span key={tag} className="tagChip">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="small">No tags yet</span>
                    )}
                  </div>
                </div>

                <div>
                  <p
                    className="muted"
                    style={{
                      margin: 0,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Folder
                  </p>
                  <p style={{ margin: "6px 0 0" }}>
                    {email.folder ?? "No folder yet"}
                  </p>
                </div>
              </div>
            </div>

            <div className="glassCard" style={{ padding: 18, marginBottom: 18 }}>
              <h4 style={{ margin: 0 }}>Organize this saved agency message</h4>
              <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Folder</label>
                  <input
                    className="input"
                    defaultValue={email.folder ?? ""}
                    onChange={(event) => setFolderInput(event.target.value)}
                    placeholder="Example: Agency outreach"
                  />
                </div>

                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Tags</label>
                  <input
                    className="input"
                    defaultValue={email.tags.join(", ")}
                    onChange={(event) => setTagsInput(event.target.value)}
                    placeholder="Example: proposal, follow-up, high intent"
                  />
                </div>

                <div className="toolbar">
                  <button
                    className="button buttonSecondary"
                    onClick={() => void handleSaveMetadata()}
                  >
                    Save Details
                  </button>

                  <button
                    className="button buttonSecondary"
                    onClick={() => void handleToggleFavorite()}
                  >
                    {email.isFavorite ? "Remove Favorite" : "Add Favorite"}
                  </button>
                </div>

                {savedNotice ? <p className="notice">{savedNotice}</p> : null}
              </div>
            </div>

            <ShareWithTeam
              assetType="email"
              sourceId={email.id}
              title={email.templateLabel}
              subject={email.subject}
              body={email.body}
            />

            <div className="toolbar">
              <button className="button buttonPrimary" onClick={handleCopy}>
                Copy Email
              </button>

              <button className="button buttonSecondary" onClick={handleUseAgain}>
                Use Again
              </button>

              <Link href="/history" className="button buttonSecondary">
                Back to Saved Messages
              </Link>
            </div>
          </div>

          <div className="previewCard">
            <div className="previewLabel">Message Preview</div>

            <div className="previewBox">
              <strong>Subject: {email.subject}</strong>
              <br />
              <br />
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                {email.body}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
