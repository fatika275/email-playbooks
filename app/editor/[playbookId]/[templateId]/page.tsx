"use client";

import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPlaybookById, getTemplate } from "@/lib/data";
import { renderTemplate } from "@/lib/renderTemplate";
import { type SavedEmail } from "@/lib/storage";
import {
  saveCustomTemplateRecord,
  saveEmailRecord,
} from "@/lib/cloud";
import { downloadHtmlFile } from "@/lib/exportHtml";
import {
  downloadEmlFile,
  openGmailDraft,
  openOutlookDraft,
} from "@/lib/exportEmail";
import {
  buildObjectionReply,
  detectObjectionCategory,
  objectionCategoryLabels,
  objectionToneLabels,
  type ObjectionCategory,
  type ObjectionTone,
} from "@/lib/objectionAssistant";
import { useAccount } from "@/components/account-provider";
import { getPlaybookAccess } from "@/lib/access";

const REUSE_EMAIL_KEY = "thalovo_reuse_email";
const LEGACY_REUSE_EMAIL_KEY = "arcmail_reuse_email";
const EMPTY_REUSE_EMAIL = "";
const PROSPECT_CONTEXT_KEY = "thalovo_prospect_context";

function subscribeToBrowserStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getReuseEmailSnapshot() {
  if (typeof window === "undefined") return EMPTY_REUSE_EMAIL;
  return (
    localStorage.getItem(REUSE_EMAIL_KEY) ||
    localStorage.getItem(LEGACY_REUSE_EMAIL_KEY) ||
    EMPTY_REUSE_EMAIL
  );
}

function getProspectContextSnapshot() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PROSPECT_CONTEXT_KEY) || "";
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const fieldLabels: Record<string, string> = {
  name: "Who are you emailing?",
  company: "What company are they at?",
  yourName: "What is your name?",
  service: "What service do you offer?",
  result: "What result do you help clients get?",
  idea: "What quick idea do you want to share?",
  value: "What useful value or insight do you want to mention?",
  difference: "What makes your offer different?",
  summary: "What short overview do you want to send?",
  problemArea: "What problem area are you helping with?",
  product: "What product or offer are you referring to?",
  points: "What were the key points from the meeting?",
  nextSteps: "What are the next steps?",
  offer: "What are you offering or walking them through?",
};

const fieldPlaceholders: Record<string, string> = {
  name: "Example: Sarah",
  company: "Example: Bright Growth",
  yourName: "Example: Amina",
  service: "Example: outbound lead generation for agencies",
  result: "Example: more qualified booked calls",
  idea: "Share one specific idea that feels useful to them",
  value: "Mention one relevant insight, observation, or useful angle",
  difference: "Example: faster turnaround, niche expertise, stronger positioning",
  summary: "Write a short, skimmable overview",
  problemArea: "Example: low reply rates, weak follow-up process",
  product: "Example: our lead generation offer",
  points: "Write the main discussion points clearly",
  nextSteps: "Write the agreed actions clearly",
  offer: "Example: our client acquisition system",
};

const fieldHints: Record<string, string> = {
  name: "Use their real first name if you have it.",
  company: "Mention the actual company, not a generic industry label.",
  service: "Keep this tied to an outcome, not just a list of tasks.",
  result: "Focus on the business result they care about most.",
  idea: "Make this specific to them. A useful observation works better than a pitch.",
  value: "This should feel genuinely helpful, not like disguised selling.",
  difference: "Choose one clear differentiator instead of listing everything.",
  summary: "Keep it concise and easy to skim.",
  problemArea: "Name a problem they would likely already recognize.",
  product: "Use plain language they would understand immediately.",
  points: "Only include the points that matter for moving things forward.",
  nextSteps: "Be clear about what happens next and who does what.",
  offer: "Describe the offer in the simplest possible way.",
  yourName: "Use the name you want prospects to see in the signoff.",
};

function getLabel(variable: string) {
  return fieldLabels[variable] || variable;
}

function getPlaceholder(variable: string) {
  return fieldPlaceholders[variable] || `Enter ${variable}`;
}

function getHint(variable: string) {
  return fieldHints[variable] || "";
}

function shouldUseTextarea(variable: string) {
  return ["idea", "value", "summary", "points", "nextSteps"].includes(variable);
}

function Field({
  variable,
  values,
  handleChange,
}: {
  variable: string;
  values: Record<string, string>;
  handleChange: (key: string, value: string) => void;
}) {
  return (
    <div className="formGroup" style={{ marginBottom: 16 }}>
      <label htmlFor={variable} className="label">
        {getLabel(variable)}
      </label>

      {shouldUseTextarea(variable) ? (
        <textarea
          id={variable}
          className="input"
          rows={4}
          value={values[variable] || ""}
          onChange={(e) => handleChange(variable, e.target.value)}
          placeholder={getPlaceholder(variable)}
        />
      ) : (
        <input
          id={variable}
          className="input"
          value={values[variable] || ""}
          onChange={(e) => handleChange(variable, e.target.value)}
          placeholder={getPlaceholder(variable)}
        />
      )}

      {getHint(variable) ? (
        <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
          {getHint(variable)}
        </p>
      ) : null}
    </div>
  );
}

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const { hasProAccess } = useAccount();

  const rawPlaybookId = useMemo(() => {
    const value = params?.playbookId;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const rawTemplateId = useMemo(() => {
    const value = params?.templateId;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [companyName, setCompanyName] = useState("");
  const [logoData, setLogoData] = useState<string>("");
  const [savedMessage, setSavedMessage] = useState("");
  const [offerType, setOfferType] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [showOptionalInputs, setShowOptionalInputs] = useState(false);
  const [showBranding, setShowBranding] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [editorTab, setEditorTab] = useState<"write" | "objection" | "export">(
    "write"
  );
  const [objection, setObjection] = useState("");
  const [objectionCategory, setObjectionCategory] =
    useState<ObjectionCategory>("general");
  const [objectionTone, setObjectionTone] =
    useState<ObjectionTone>("consultative");
  const playbookId = rawPlaybookId ?? "";
  const templateId = rawTemplateId ?? "";
  const foundTemplate =
    playbookId && templateId ? getTemplate(playbookId, templateId) : null;
  const playbook = playbookId ? getPlaybookById(playbookId) : null;
  const access = playbook ? getPlaybookAccess(playbook, hasProAccess) : null;
  const rawReuseEmail = useSyncExternalStore(
    subscribeToBrowserStorage,
    getReuseEmailSnapshot,
    () => EMPTY_REUSE_EMAIL
  );
  const rawProspectContext = useSyncExternalStore(
    subscribeToBrowserStorage,
    getProspectContextSnapshot,
    () => ""
  );
  const prospectContext = useMemo<{
    name?: string;
    company?: string;
    prospectId?: string;
    workflowStep?: number;
  }>(() => {
    if (!rawProspectContext) return {};
    try {
      return JSON.parse(rawProspectContext) as {
        name?: string;
        company?: string;
        prospectId?: string;
        workflowStep?: number;
      };
    } catch {
      return {};
    }
  }, [rawProspectContext]);
  const prospectValues = useMemo<Record<string, string>>(() => ({
    name: prospectContext.name || "",
    company: prospectContext.company || "",
  }), [prospectContext]);
  const reuseDraft = useMemo<Pick<SavedEmail, "subject" | "body"> | null>(() => {
    if (!rawReuseEmail) return null;

    try {
      const savedEmail = JSON.parse(rawReuseEmail) as SavedEmail;

      if (
        savedEmail.playbookId === playbookId &&
        savedEmail.templateId === templateId
      ) {
        return {
          subject: savedEmail.subject,
          body: savedEmail.body,
        };
      }
    } catch {
      return null;
    }

    return null;
  }, [playbookId, rawReuseEmail, templateId]);
  const [reuseMode, setReuseMode] = useState(Boolean(reuseDraft));
  const [editableSubject, setEditableSubject] = useState(
    reuseDraft?.subject ?? ""
  );
  const [editableBody, setEditableBody] = useState(reuseDraft?.body ?? "");

  if (!foundTemplate) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <h1 className="pageTitle">Template not found</h1>
            <p className="muted">This playbook step could not be loaded.</p>
            <div className="toolbar" style={{ justifyContent: "center" }}>
              <button className="button buttonPrimary" onClick={() => router.push("/")}>
                Go Home
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const template = foundTemplate;

  const inputValues = { ...prospectValues, ...values };
  const mergedValues = {
    ...inputValues,
    service: inputValues.service || offerType,
    offer: inputValues.offer || offerType,
    company: inputValues.company || targetAudience,
    result: inputValues.result || primaryGoal,
    product: inputValues.product || offerType,
  };

  const generatedSubject = renderTemplate(template.subject, mergedValues);
  const generatedBody = renderTemplate(template.body, mergedValues);

  const finalSubject = reuseMode ? editableSubject : generatedSubject;
  const finalBody = reuseMode ? editableBody : generatedBody;

  const coreVariables = template.variables.slice(0, 3);
  const optionalVariables = template.variables.slice(3);

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`Subject: ${finalSubject}\n\n${finalBody}`);
      alert("Email copied");
    } catch {
      alert("Copy failed");
    }
  }

  function handleDownloadText() {
    const content = `Subject: ${finalSubject}\n\n${finalBody}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${template.id}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  function handleDownloadHtml() {
    downloadHtmlFile(finalSubject, finalBody, template.id, {
      companyName,
      logoUrl: logoData,
    });
  }

  async function handleSaveEmail() {
    await saveEmailRecord({
      id: makeId(),
      playbookId,
      templateId,
      templateLabel: template.label,
      subject: finalSubject,
      body: finalBody,
      tags: [],
      folder: null,
      isFavorite: false,
      createdAt: new Date().toISOString(),
    });

    setSavedMessage("Saved to Saved Emails");
    setTimeout(() => setSavedMessage(""), 2200);
  }

  function handleObjectionChange(nextObjection: string) {
    setObjection(nextObjection);
    setObjectionCategory(detectObjectionCategory(nextObjection));
  }

  function handleBuildObjectionReply() {
    const reply = buildObjectionReply(
      {
        objection,
        name: values.name,
        offer: values.offer || values.service || offerType,
        result: values.result || primaryGoal,
        senderName: values.yourName,
      },
      objectionCategory,
      objectionTone
    );

    setReuseMode(true);
    setEditableSubject(reply.subject);
    setEditableBody(reply.body);
    setEditorTab("write");
    setSavedMessage(
      `Drafted a ${objectionCategoryLabels[reply.category].toLowerCase()} reply. Review it before sending.`
    );
  }

  if (playbook && access?.isLocked) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <div className="badge">Pro Editor</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>
              Unlock this Pro step
            </h1>
            <p className="muted">
              This editor step belongs to a Pro playbook. Upgrade to use the
              full playbook library and advanced workflows.
            </p>
            <div className="toolbar" style={{ justifyContent: "center" }}>
              <button
                className="button buttonPrimary"
                onClick={() => router.push("/pricing")}
              >
                View Pro
              </button>
              <button
                className="button buttonUtility"
                onClick={() => router.push("/")}
              >
                Back to Library
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  async function handleSaveSequenceVersion() {
    await saveCustomTemplateRecord({
      id: makeId(),
      title: template.label,
      subject: finalSubject,
      body: finalBody,
      sourcePlaybookId: playbookId,
      sourceTemplateId: templateId,
      tags: [],
      folder: null,
      isFavorite: false,
      createdAt: new Date().toISOString(),
    });

    setSavedMessage("Saved to Reusable Sequences");
    setTimeout(() => setSavedMessage(""), 2200);
  }

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Playbook Step Editor</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            {template.label}
          </h1>
          <p className="muted" style={{ maxWidth: 760 }}>
            {prospectContext.workflowStep ? `Proposal follow-up ${prospectContext.workflowStep} for ${prospectContext.name || "this prospect"}. Personalise the draft, send it, then return to mark the reminder done.` : "Start with the essentials, then refine only if you need to."}
          </p>
          {prospectContext.prospectId ? <button className="button buttonSecondary" style={{ marginTop: 14 }} onClick={() => router.push(`/prospects/${prospectContext.prospectId}`)}>Back to prospect</button> : null}
        </div>

        <div
          className="glassCard"
          style={{
            padding: 16,
            marginBottom: 18,
            borderColor: "rgba(201, 166, 72, 0.14)",
            background:
              "linear-gradient(180deg, rgba(201,166,72,0.08), rgba(255,255,255,0.02))",
          }}
        >
          <p className="muted" style={{ margin: 0, lineHeight: 1.65 }}>
            Free playbooks help you start quickly. Pro unlocks the deeper
            library, builder, folders, and reusable sequence workflow.
          </p>
        </div>

        <div
          className="editorLayout"
          style={{
            alignItems: "start",
            gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 0.92fr)",
          }}
        >
          <div className="formCard">
            <div
              className="authModeTabs editorModeTabs"
              role="tablist"
              aria-label="Email editor section"
              style={{ marginBottom: 22 }}
            >
              <button
                type="button"
                className={editorTab === "write" ? "authModeTab active" : "authModeTab"}
                onClick={() => setEditorTab("write")}
              >
                Write
              </button>
              <button
                type="button"
                className={
                  editorTab === "objection" ? "authModeTab active" : "authModeTab"
                }
                onClick={() => setEditorTab("objection")}
              >
                Objections
              </button>
              <button
                type="button"
                className={editorTab === "export" ? "authModeTab active" : "authModeTab"}
                onClick={() => setEditorTab("export")}
              >
                Export
              </button>
            </div>
            <div
              className="glassCard"
              style={{
                display: editorTab === "write" ? "block" : "none",
                padding: 18,
                marginBottom: 18,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <h4 style={{ margin: 0 }}>Quick onboarding</h4>
              <p className="muted" style={{ margin: "8px 0 0" }}>
                Add the basics first so the draft feels relevant immediately.
              </p>
            </div>

            <div
              style={{
                display: editorTab === "write" ? "grid" : "none",
                gap: 14,
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                marginBottom: 18,
              }}
            >
              <div className="formGroup" style={{ marginBottom: 0 }}>
                <label className="label">What do you sell?</label>
                <input
                  className="input"
                  value={offerType}
                  onChange={(e) => setOfferType(e.target.value)}
                  placeholder="Example: lead generation for agencies"
                />
              </div>

              <div className="formGroup" style={{ marginBottom: 0 }}>
                <label className="label">Who are you targeting?</label>
                <input
                  className="input"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Example: agency founders"
                />
              </div>

              <div className="formGroup" style={{ marginBottom: 0 }}>
                <label className="label">What result are you trying to get?</label>
                <input
                  className="input"
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  placeholder="Example: more replies"
                />
              </div>
            </div>

            <div
              className="glassCard"
              style={{
                display: editorTab === "write" ? "block" : "none",
                padding: 18,
                marginBottom: 18,
                background: "rgba(255,255,255,0.026)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h4 style={{ margin: 0 }}>Build your email</h4>
                  <p className="muted" style={{ margin: "6px 0 0" }}>
                    Start with the essentials — you do not need to fill everything.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
                {coreVariables.map((variable) => (
                  <Field
                    key={variable}
                    variable={variable}
                    values={inputValues}
                    handleChange={handleChange}
                  />
                ))}
              </div>
            </div>

            {editorTab === "write" && optionalVariables.length > 0 ? (
              <div className="glassCard" style={{ padding: 18, marginBottom: 18 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0 }}>Optional details</h4>
                    <p className="muted" style={{ margin: "6px 0 0" }}>
                      Add more context if you want a more tailored result.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="button buttonUtility"
                    onClick={() => setShowOptionalInputs((prev) => !prev)}
                  >
                    {showOptionalInputs ? "Hide optional details" : "Show optional details"}
                  </button>
                </div>

                {showOptionalInputs ? (
                  <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
                    {optionalVariables.map((variable) => (
                      <Field
                        key={variable}
                        variable={variable}
                        values={inputValues}
                        handleChange={handleChange}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div
              className="glassCard"
              style={{
                display: editorTab === "export" ? "block" : "none",
                padding: 18,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h4 style={{ margin: 0 }}>Branding for HTML export</h4>
                  <p className="muted" style={{ margin: "6px 0 0" }}>
                    Optional if you want a branded export.
                  </p>
                </div>

                <button
                  type="button"
                  className="button buttonUtility"
                  onClick={() => setShowBranding((prev) => !prev)}
                >
                  {showBranding ? "Hide branding" : "Show branding"}
                </button>
              </div>

              {showBranding ? (
                <div style={{ marginTop: 18 }}>
                  <div className="formGroup">
                    <label htmlFor="companyName" className="label">
                      Brand / Company Name
                    </label>
                    <input
                      id="companyName"
                      className="input"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Enter your brand or company name"
                    />
                  </div>

                  <div className="formGroup" style={{ marginBottom: 0 }}>
                    <label htmlFor="logoUpload" className="label">
                      Upload Logo
                    </label>
                    <input
                      id="logoUpload"
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
                      <div style={{ marginTop: 12 }}>
                        <Image
                          src={logoData}
                          alt="Logo preview"
                          unoptimized
                          width={180}
                          height={56}
                          style={{
                            maxHeight: 56,
                            maxWidth: 180,
                            display: "block",
                            borderRadius: 8,
                            width: "auto",
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div
              className="glassCard"
              style={{
                display: editorTab === "export" ? "block" : "none",
                padding: 18,
                marginBottom: 18,
              }}
            >
              <h4 style={{ margin: 0 }}>Save options</h4>

              <div
                style={{
                  display: "grid",
                  gap: 14,
                  marginTop: 14,
                }}
              >
                <div
                  style={{
                    paddingBottom: 12,
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <strong>Save Email</strong>
                  <p className="muted" style={{ margin: "6px 0 0" }}>
                    Save this email so you can reuse it later from your Saved Emails page.
                  </p>
                </div>

                <div>
                  <strong>Save Sequence Version</strong>
                  <p className="muted" style={{ margin: "6px 0 0" }}>
                    Save this as a reusable version inside your Reusable Sequences library.
                  </p>
                </div>
              </div>
            </div>

            {editorTab !== "write" ? null : reuseMode ? (
              <div className="glassCard" style={{ padding: 18, marginBottom: 18 }}>
                <h4 style={{ margin: 0 }}>Reuse this email</h4>
                <p className="muted" style={{ margin: "8px 0 0" }}>
                  You opened a saved email to use again. You can edit it directly below.
                </p>

                <div className="formGroup" style={{ marginTop: 14 }}>
                  <label className="label">Subject</label>
                  <input
                    className="input"
                    value={editableSubject}
                    onChange={(e) => setEditableSubject(e.target.value)}
                    placeholder="Edit subject"
                  />
                </div>

                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Body</label>
                  <textarea
                    className="input"
                    rows={10}
                    value={editableBody}
                    onChange={(e) => setEditableBody(e.target.value)}
                    placeholder="Edit email body"
                  />
                </div>

                <div className="toolbar" style={{ marginTop: 14 }}>
                  <button
                    className="button buttonUtility"
                    onClick={() => {
                      setReuseMode(false);
                      setEditableSubject("");
                      setEditableBody("");
                    }}
                  >
                    Switch back to generated version
                  </button>
                </div>
              </div>
            ) : (
              <div className="toolbar" style={{ marginBottom: 18 }}>
                {reuseDraft ? (
                  <button
                    className="button buttonPrimary"
                    onClick={() => {
                      setReuseMode(true);
                      setEditableSubject(reuseDraft.subject);
                      setEditableBody(reuseDraft.body);
                    }}
                  >
                    Load saved email
                  </button>
                ) : null}

                <button
                  className="button buttonUtility"
                  onClick={() => {
                    setReuseMode(true);
                    setEditableSubject(generatedSubject);
                    setEditableBody(generatedBody);
                  }}
                >
                  Edit generated email directly
                </button>
              </div>
            )}

            <div
              style={{
                display: editorTab === "objection" ? "block" : "none",
                padding: 18,
                marginBottom: 18,
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h4 style={{ margin: 0 }}>Objection-handling assistant</h4>
                  <p className="muted" style={{ margin: "6px 0 0" }}>
                    Turn a prospect&apos;s concern into a calm, useful reply.
                  </p>
                </div>
                <span className="miniBadge">
                  {objectionCategoryLabels[objectionCategory]}
                </span>
              </div>

              <div style={{ marginTop: 18 }}>
                  <div className="formGroup">
                    <label className="label" htmlFor="prospect-objection">
                      What did the prospect say?
                    </label>
                    <textarea
                      id="prospect-objection"
                      className="input"
                      rows={4}
                      value={objection}
                      onChange={(event) => handleObjectionChange(event.target.value)}
                      placeholder="Paste their objection here"
                    />
                  </div>

                  <div className="formGroup">
                    <label className="label" htmlFor="objection-category">
                      Main concern
                    </label>
                    <select
                      id="objection-category"
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
                    <label className="label" htmlFor="objection-tone">
                      Reply style
                    </label>
                    <select
                      id="objection-tone"
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

                  <button
                    type="button"
                    className="button buttonPrimary"
                    disabled={!objection.trim()}
                    onClick={handleBuildObjectionReply}
                  >
                    Draft reply
                  </button>
              </div>
            </div>

            <div
              className="glassCard"
              style={{
                display: editorTab === "export" ? "block" : "none",
                padding: 18,
                marginTop: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <button className="button buttonPrimary" onClick={handleCopy}>
                  Copy Email
                </button>

                <button
                  className="button buttonSecondary"
                  onClick={() => void handleSaveEmail()}
                >
                  Save Email
                </button>

                <button
                  className="button buttonUtility"
                  onClick={() => setShowMoreActions((prev) => !prev)}
                >
                  {showMoreActions ? "Hide options" : "More"}
                </button>
              </div>

              {showMoreActions ? (
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <button className="button buttonUtility" onClick={handleDownloadText}>
                    Download TXT
                  </button>

                  <button className="button buttonUtility" onClick={handleDownloadHtml}>
                    Export HTML
                  </button>

                  <button
                    className="button buttonUtility"
                    onClick={() => openGmailDraft(finalSubject, finalBody)}
                  >
                    Open in Gmail
                  </button>

                  <button
                    className="button buttonUtility"
                    onClick={() => openOutlookDraft(finalSubject, finalBody)}
                  >
                    Open in Outlook
                  </button>

                  <button
                    className="button buttonUtility"
                    onClick={() =>
                      downloadEmlFile(finalSubject, finalBody, template.id)
                    }
                  >
                    Download EML
                  </button>

                  <button
                    className="button buttonSecondary"
                    onClick={() => void handleSaveSequenceVersion()}
                  >
                    Save Sequence Version
                  </button>
                </div>
              ) : null}
            </div>

            {savedMessage ? <p className="notice">{savedMessage}</p> : null}

            <div
              className="toolbar"
              style={{
                display: editorTab === "export" ? "flex" : "none",
                marginTop: 14,
                rowGap: 12,
                columnGap: 12,
              }}
            >
              <button
                className="button buttonSecondary"
                onClick={() => router.push("/history")}
              >
                Go to Saved Emails
              </button>
              <button
                className="button buttonSecondary"
                onClick={() => router.push("/custom-templates")}
              >
                Go to Reusable Sequences
              </button>
            </div>
          </div>

          <div style={{ position: "sticky", top: 98, alignSelf: "start" }}>
            <div className="previewCard">
              <div className="previewLabel">Live Preview</div>

              <div className="previewBox">
                <strong>Subject: {finalSubject}</strong>
              </div>

              <div className="previewSpacer" />

              <div className="previewLabel">Email Preview</div>
              <div className="previewBox">{finalBody}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
