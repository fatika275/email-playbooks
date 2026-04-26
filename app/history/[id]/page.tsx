"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getEmails, type SavedEmail } from "@/lib/storage";

const REUSE_EMAIL_KEY = "thalovo_reuse_email";

export default function SavedEmailViewPage() {
  const params = useParams();
  const router = useRouter();

  const id = useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const email = useMemo<SavedEmail | null>(() => {
    if (!id) return null;
    return getEmails().find((item) => item.id === id) ?? null;
  }, [id]);

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

  if (!email) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <h1 className="pageTitle">Saved email not found</h1>
            <p className="muted">
              This saved email could not be loaded.
            </p>
            <div className="toolbar" style={{ justifyContent: "center" }}>
              <Link href="/history" className="button buttonPrimary">
                Back to Saved Emails
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
              </div>
            </div>

            <div className="toolbar">
              <button className="button buttonPrimary" onClick={handleCopy}>
                Copy Email
              </button>

              <button className="button buttonSecondary" onClick={handleUseAgain}>
                Use Again
              </button>

              <Link href="/history" className="button buttonSecondary">
                Back to Saved Emails
              </Link>
            </div>
          </div>

          <div className="previewCard">
            <div className="previewLabel">Email Preview</div>

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
