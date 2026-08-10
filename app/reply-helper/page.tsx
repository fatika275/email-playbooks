"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  buildObjectionReply,
  detectObjectionCategory,
  objectionCategoryLabels,
  objectionToneLabels,
  type ObjectionCategory,
  type ObjectionTone,
} from "@/lib/objectionAssistant";
import {
  openGmailDraft,
  openMailtoDraft,
  openOutlookDraft,
} from "@/lib/exportEmail";

function ReplyHelperContent() {
  const searchParams = useSearchParams();
  const [leadName, setLeadName] = useState(searchParams.get("name") ?? "");
  const [leadEmail, setLeadEmail] = useState(searchParams.get("email") ?? "");
  const [offer, setOffer] = useState(searchParams.get("offer") ?? "");
  const [result, setResult] = useState(searchParams.get("result") ?? "");
  const [senderName, setSenderName] = useState("");
  const [objection, setObjection] = useState("");
  const [objectionCategory, setObjectionCategory] =
    useState<ObjectionCategory>("general");
  const [objectionTone, setObjectionTone] =
    useState<ObjectionTone>("consultative");
  const [notice, setNotice] = useState("");

  const suggestedObjectionCategory = useMemo<ObjectionCategory | null>(() => {
    const objectionText = objection.trim();
    const wordCount = objectionText.split(/\s+/).filter(Boolean).length;

    if (objectionText.length < 24 || wordCount < 4) return null;

    const detectedCategory = detectObjectionCategory(objectionText);
    return detectedCategory === objectionCategory ? null : detectedCategory;
  }, [objection, objectionCategory]);

  const reply = useMemo(
    () =>
      buildObjectionReply(
        {
          objection,
          name: leadName,
          offer,
          result,
          senderName,
        },
        objectionCategory,
        objectionTone
      ),
    [leadName, objection, objectionCategory, objectionTone, offer, result, senderName]
  );

  async function handleCopyReply() {
    await navigator.clipboard.writeText(`Subject: ${reply.subject}\n\n${reply.body}`);
    setNotice("Objection reply copied. Review it before sending.");
    setTimeout(() => setNotice(""), 2600);
  }

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div>
            <div className="badge">Objection helper</div>
            <h1 className="pageTitle">Handle objections without going back to a template.</h1>
            <p className="pageSubtitle">
              Use this when a lead pushes back on price, timing, trust, approval, or fit and you need a calm next step toward booked work.
            </p>
          </div>
        </div>

        <div className="editorLayout" style={{ alignItems: "start" }}>
          <div className="formCard">
            <div className="editorComposerPanel">
              <div>
                <span className="miniBadge">Live objection reply</span>
                <h4 style={{ margin: "8px 0 0" }}>What concern do you need to handle?</h4>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  Pick the concern first. Paste their wording only when it gives useful context.
                </p>
              </div>

              <div className="editorFieldGrid">
                <div className="formGroup">
                  <label className="label" htmlFor="reply-lead-name">
                    Lead name
                  </label>
                  <input
                    id="reply-lead-name"
                    className="input"
                    value={leadName}
                    onChange={(event) => setLeadName(event.target.value)}
                    placeholder="Sam"
                  />
                </div>

                <div className="formGroup">
                  <label className="label" htmlFor="reply-lead-email">
                    Lead email <span className="muted">(optional)</span>
                  </label>
                  <input
                    id="reply-lead-email"
                    className="input"
                    value={leadEmail}
                    onChange={(event) => setLeadEmail(event.target.value)}
                    placeholder="sam@example.com"
                  />
                </div>

                <div className="formGroup">
                  <label className="label" htmlFor="reply-offer">
                    Service / offer
                  </label>
                  <input
                    id="reply-offer"
                    className="input"
                    value={offer}
                    onChange={(event) => setOffer(event.target.value)}
                    placeholder="Website redesign, lead-gen retainer, paid ads audit..."
                  />
                </div>

                <div className="formGroup">
                  <label className="label" htmlFor="reply-result">
                    Outcome you help them get
                  </label>
                  <input
                    id="reply-result"
                    className="input"
                    value={result}
                    onChange={(event) => setResult(event.target.value)}
                    placeholder="More booked calls, clearer pipeline, faster launch..."
                  />
                </div>

                <div className="formGroup">
                  <label className="label" htmlFor="reply-category">
                    Main concern
                  </label>
                  <select
                    id="reply-category"
                    className="input"
                    value={objectionCategory}
                    onChange={(event) =>
                      setObjectionCategory(event.target.value as ObjectionCategory)
                    }
                  >
                    {Object.entries(objectionCategoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="formGroup">
                  <label className="label" htmlFor="reply-tone">
                    Reply style
                  </label>
                  <select
                    id="reply-tone"
                    className="input"
                    value={objectionTone}
                    onChange={(event) =>
                      setObjectionTone(event.target.value as ObjectionTone)
                    }
                  >
                    {Object.entries(objectionToneLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="formGroup">
                  <label className="label" htmlFor="reply-objection">
                    Exact words from the prospect <span className="muted">(optional)</span>
                  </label>
                  <textarea
                    id="reply-objection"
                    className="input"
                    rows={5}
                    value={objection}
                    onChange={(event) => setObjection(event.target.value)}
                    placeholder="Paste the objection or concern you need to answer"
                  />
                  {suggestedObjectionCategory ? (
                    <div
                      className="miniCard"
                      style={{
                        marginTop: 10,
                        padding: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="muted">
                        This might be{" "}
                        {objectionCategoryLabels[
                          suggestedObjectionCategory
                        ].toLowerCase()}
                        .
                      </span>
                      <button
                        type="button"
                        className="button buttonUtility"
                        onClick={() =>
                          setObjectionCategory(suggestedObjectionCategory)
                        }
                      >
                        Use this concern
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="formGroup">
                  <label className="label" htmlFor="reply-sender-name">
                    Your name
                  </label>
                  <input
                    id="reply-sender-name"
                    className="input"
                    value={senderName}
                    onChange={(event) => setSenderName(event.target.value)}
                    placeholder="Your name"
                  />
                </div>
              </div>
            </div>
          </div>

          <aside className="editorPreviewRail">
            <div className="previewCard">
              <div className="previewHeader">
                <div>
                  <span className="miniBadge">
                    {objectionCategoryLabels[reply.category]}
                  </span>
                  <h3 className="sectionTitle" style={{ marginTop: 10 }}>
                    Suggested objection reply
                  </h3>
                </div>
              </div>

              <div className="emailPreview" style={{ marginTop: 18 }}>
                <p className="emailSubject">{reply.subject}</p>
                <pre>{reply.body}</pre>
              </div>

              {notice ? (
                <p className="successText" style={{ marginTop: 14 }}>
                  {notice}
                </p>
              ) : null}

              <div className="toolbar" style={{ marginTop: 18 }}>
                <button className="button buttonPrimary" onClick={handleCopyReply}>
                  Copy reply
                </button>
                <button
                  className="button buttonUtility"
                  onClick={() => openGmailDraft(reply.subject, reply.body, leadEmail)}
                >
                  Gmail
                </button>
                <button
                  className="button buttonUtility"
                  onClick={() => openOutlookDraft(reply.subject, reply.body, leadEmail)}
                >
                  Outlook
                </button>
                <button
                  className="button buttonUtility"
                  onClick={() => openMailtoDraft(reply.subject, reply.body, leadEmail)}
                >
                  Mail app
                </button>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default function ReplyHelperPage() {
  return (
    <Suspense
      fallback={
        <main className="main">
          <section className="container">
            <div className="glassCard emptyState">Loading reply helper...</div>
          </section>
        </main>
      }
    >
      <ReplyHelperContent />
    </Suspense>
  );
}
