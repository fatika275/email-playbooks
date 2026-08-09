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
  openMailtoDraft,
  openOutlookDraft,
} from "@/lib/exportEmail";
import {
  createProspectActivity,
  getProspect,
  setProspectTaskCompleted,
  updateProspect,
} from "@/lib/prospects";
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
  name: "Lead name",
  company: "Company",
  yourName: "Your name",
  service: "Service / offer",
  result: "Outcome you help them get",
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
  company: "Use the company they work at, not a target audience.",
  service: "One plain phrase for the service or offer you want to sell.",
  result: "The business outcome they would actually care about.",
  idea: "Make this specific to them. A useful observation works better than a pitch.",
  value: "This should feel genuinely helpful, not like disguised selling.",
  difference: "Choose one clear differentiator instead of listing everything.",
  summary: "Keep it concise and easy to skim.",
  problemArea: "Name a problem they would likely already recognize.",
  product: "Use plain language they would understand immediately.",
  points: "Only include the points that matter for moving things forward.",
  nextSteps: "Be clear about what happens next and who does what.",
  offer: "Describe the offer in the simplest possible way.",
  yourName: "Required for the signoff.",
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
        {variable === "yourName" ? " (required)" : ""}
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
  const { user, hasProAccess } = useAccount();

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
    email?: string | null;
    role?: string | null;
    prospectId?: string;
    workflowTaskId?: string;
    workflowStep?: number;
    workflowLabel?: string;
  }>(() => {
    if (!rawProspectContext) return {};
    try {
      return JSON.parse(rawProspectContext) as {
        name?: string;
        company?: string;
        email?: string | null;
        role?: string | null;
        prospectId?: string;
        workflowTaskId?: string;
        workflowStep?: number;
        workflowLabel?: string;
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
  const offerValue =
    inputValues.service || inputValues.offer || inputValues.product || "";
  const resultValue = inputValues.result || "";
  const mergedValues = {
    ...inputValues,
    service: inputValues.service || offerValue,
    offer: inputValues.offer || offerValue,
    result: resultValue,
    product: inputValues.product || offerValue,
  };

  const generatedSubject = renderTemplate(template.subject, mergedValues);
  const generatedBody = renderTemplate(template.body, mergedValues);

  const finalSubject = reuseMode ? editableSubject : generatedSubject;
  const finalBody = reuseMode ? editableBody : generatedBody;

  const coreVariableOrder = [
    "name",
    "company",
    "service",
    "offer",
    "product",
    "result",
    "yourName",
  ];
  const coreVariables = [
    ...coreVariableOrder.filter((variable) =>
      template.variables.includes(variable)
    ),
    ...template.variables
      .filter((variable) => !coreVariableOrder.includes(variable))
      .slice(0, 1),
  ];
  const optionalVariables = template.variables.filter(
    (variable) => !coreVariables.includes(variable)
  );

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

    setSavedMessage("Saved to saved agency messages");
    setTimeout(() => setSavedMessage(""), 2200);
  }

  async function handleLogProspectEmailSent(source: string) {
    if (!user || !prospectContext.prospectId) {
      setSavedMessage("Email opened. Sign in and open this from a lead to log it.");
      setTimeout(() => setSavedMessage(""), 2600);
      return;
    }

    const prospect = await getProspect(prospectContext.prospectId);
    if (!prospect) {
      setSavedMessage("Email opened, but the lead could not be updated.");
      setTimeout(() => setSavedMessage(""), 2600);
      return;
    }

    await updateProspect(prospect.id, {
      full_name: prospect.full_name,
      company: prospect.company,
      email: prospect.email ?? "",
      role: prospect.role ?? "",
      linkedin_url: prospect.linkedin_url ?? "",
      source: prospect.source ?? "",
      stage: prospect.stage === "new" ? "contacted" : prospect.stage,
      estimated_value_gbp: prospect.estimated_value_gbp,
      notes: prospect.notes ?? "",
      next_follow_up: prospect.next_follow_up ?? "",
      last_contacted_at: new Date().toISOString(),
    });

    await createProspectActivity({
      prospectId: prospect.id,
      userId: user.id,
      activityType: "email",
      summary: `Email opened in ${source}: ${finalSubject}`,
    });

    if (prospectContext.workflowTaskId) {
      await setProspectTaskCompleted(prospectContext.workflowTaskId, true);
    }

    setSavedMessage(
      prospectContext.workflowTaskId
        ? "Email logged and the scheduled reminder was marked sent."
        : "Email logged on the lead."
    );
    setTimeout(() => setSavedMessage(""), 3200);
  }

  function handleOpenEmailDraft(source: "Gmail" | "Outlook" | "Mail app") {
    if (source === "Gmail") {
      openGmailDraft(finalSubject, finalBody, prospectContext.email);
    } else if (source === "Outlook") {
      openOutlookDraft(finalSubject, finalBody, prospectContext.email);
    } else {
      openMailtoDraft(finalSubject, finalBody, prospectContext.email);
    }
    void handleLogProspectEmailSent(source);
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
        offer: values.offer || values.service || values.product,
        result: values.result,
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
              full agency use-case library for outreach, follow-up, proposal
              chase, and win-back workflows.
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

    setSavedMessage("Saved to Follow-up Plans");
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
            {prospectContext.workflowStep ? `Follow-up ${prospectContext.workflowStep} for ${prospectContext.name || "this prospect"}${prospectContext.workflowLabel ? `: ${prospectContext.workflowLabel}` : ""}. Personalise the draft, send it, then return to mark the reminder done.` : "Start with the essentials, then refine only if you need to."}
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
            Free playbooks help you start quickly. Pro unlocks the full message
            library, follow-up plans, and the pipeline view for moving leads
            faster.
          </p>
        </div>

        <div
          className="editorLayout"
          style={{
            alignItems: "start",
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
              className="editorComposerPanel"
              style={{
                display: editorTab === "write" ? "block" : "none",
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
                  <span className="miniBadge">Core details</span>
                  <h4 style={{ margin: "8px 0 0" }}>Build the outreach message</h4>
                  <p className="muted" style={{ margin: "6px 0 0" }}>
                    Add only the details this message needs. Your name is required because it appears in the signoff.
                  </p>
                </div>
              </div>

              <div className="editorFieldGrid">
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
                    <h4 style={{ margin: 0 }}>Extra context</h4>
                    <p className="muted" style={{ margin: "6px 0 0" }}>
                      Add template-specific details only if this message needs them.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="button buttonUtility"
                    onClick={() => setShowOptionalInputs((prev) => !prev)}
                  >
                    {showOptionalInputs ? "Hide extra context" : "Show extra context"}
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
                  <h4 style={{ margin: 0 }}>Optional branding</h4>
                  <p className="muted" style={{ margin: "6px 0 0" }}>
                    Use this only when a saved message needs your agency name.
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
                  <strong>Save agency message</strong>
                  <p className="muted" style={{ margin: "6px 0 0" }}>
                    Save this use-case message so you can reuse it later from your saved messages.
                  </p>
                </div>

                <div>
                  <strong>Save as Follow-up Plan</strong>
                  <p className="muted" style={{ margin: "6px 0 0" }}>
                    Save this inside your follow-up plan library.
                  </p>
                </div>
              </div>
            </div>

            {editorTab !== "write" ? null : reuseMode ? (
              <div className="glassCard" style={{ padding: 18, marginBottom: 18 }}>
                <h4 style={{ margin: 0 }}>Reuse this agency message</h4>
                <p className="muted" style={{ margin: "8px 0 0" }}>
                  You opened a saved agency message to use again. You can edit it directly below.
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
                    Load saved message
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
                    onClick={() => handleOpenEmailDraft("Gmail")}
                  >
                    Open in Gmail
                  </button>

                  <button
                    className="button buttonUtility"
                    onClick={() => handleOpenEmailDraft("Outlook")}
                  >
                    Open in Outlook
                  </button>

                  <button
                    className="button buttonUtility"
                    onClick={() => handleOpenEmailDraft("Mail app")}
                  >
                    Open mail app
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
                    Save as Follow-up Plan
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
                Go to Saved Messages
              </button>
              <button
                className="button buttonSecondary"
                onClick={() => router.push("/custom-templates")}
              >
                Go to Follow-up Plans
              </button>
            </div>
          </div>

          <div className="editorPreviewRail">
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
