"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { type SavedEmail, useEmails } from "@/lib/storage";
import { saveEmailRecord } from "@/lib/cloud";
import { downloadHtmlFile } from "@/lib/exportHtml";

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `email-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function DuplicateEmailPage() {
  const params = useParams();
  const router = useRouter();
  const emails = useEmails();

  const id = useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const email = useMemo<SavedEmail | null>(() => {
    if (!id) return null;
    return emails.find((item) => item.id === id) ?? null;
  }, [emails, id]);
  const [subjectDraft, setSubjectDraft] = useState<string | null>(null);
  const [bodyDraft, setBodyDraft] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [logoData, setLogoData] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const subject = subjectDraft ?? email?.subject ?? "";
  const body = bodyDraft ?? email?.body ?? "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      alert("Copied!");
    } catch {
      alert("Copy failed");
    }
  }

  function handleDownloadText() {
    const content = `Subject: ${subject}\n\n${body}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "duplicated-email.txt";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  function handleDownloadHtml() {
    downloadHtmlFile(subject, body, "duplicated-email", {
      companyName,
      logoUrl: logoData,
    });
  }

  async function handleSaveEmail() {
    if (!email) return;

    await saveEmailRecord({
      id: makeId(),
      playbookId: email.playbookId,
      templateId: email.templateId,
      templateLabel: email.templateLabel,
      subject,
      body,
      tags: email.tags ?? [],
      folder: email.folder ?? null,
      isFavorite: email.isFavorite ?? false,
      createdAt: new Date().toISOString(),
    });

    setSavedMessage("Saved as a new email");
    setTimeout(() => setSavedMessage(""), 2000);
  }

  if (!email) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <h1 className="pageTitle">Email not found</h1>
            <p className="muted">This email could not be duplicated.</p>
            <div className="toolbar" style={{ justifyContent: "center" }}>
              <button
                className="button buttonPrimary"
                onClick={() => router.push("/history")}
              >
                Back to Saved Messages
              </button>
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
          <div className="badge">Duplicate agency message</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Duplicate and edit
          </h1>
          <p className="muted">
            Make a new version of this saved agency message without changing the original.
          </p>
        </div>

        <div className="editorLayout">
          <div className="formCard">
            <div className="formGroup">
              <label className="label">Subject</label>
              <input
                className="input"
                value={subject}
                onChange={(e) => setSubjectDraft(e.target.value)}
                placeholder="Enter subject"
              />
            </div>

            <div className="formGroup">
              <label className="label">Body</label>
              <textarea
                className="input"
                rows={14}
                value={body}
                onChange={(e) => setBodyDraft(e.target.value)}
                placeholder="Enter email body"
              />
            </div>

            <div className="formGroup">
              <label className="label">Company Name</label>
              <input
                className="input"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name for export"
              />
            </div>

            <div className="formGroup">
              <label className="label">Upload Logo</label>
              <input
                type="file"
                accept="image/*"
                className="input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const reader = new FileReader();
                  reader.onload = () => {
                    setLogoData(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }}
              />

              {logoData ? (
                <Image
                  src={logoData}
                  alt="Logo preview"
                  unoptimized
                  width={160}
                  height={50}
                  style={{ marginTop: 10, maxHeight: 50, width: "auto" }}
                />
              ) : null}
            </div>

            <div className="toolbar">
              <button className="button buttonPrimary" onClick={handleCopy}>
                Copy Email
              </button>

              <button
                className="button buttonSecondary"
                onClick={handleDownloadText}
              >
                Download TXT
              </button>

              <button
                className="button buttonSecondary"
                onClick={handleDownloadHtml}
              >
                Export HTML
              </button>

              <button
                className="button buttonSecondary"
                onClick={() => void handleSaveEmail()}
              >
                Save Email
              </button>
            </div>

            {savedMessage ? <p className="notice">{savedMessage}</p> : null}

            <div className="toolbar" style={{ marginTop: 12 }}>
              <button
                className="button buttonSecondary"
                onClick={() => router.push("/history")}
              >
                Back to Saved Messages
              </button>
            </div>
          </div>

          <div className="previewCard">
            <div className="previewLabel">Preview</div>

            <div className="previewBox">
              <strong>Subject: {subject}</strong>
              <br />
              <br />
              {body}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
