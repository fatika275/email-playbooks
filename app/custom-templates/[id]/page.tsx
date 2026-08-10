"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  type CustomTemplate,
  useCustomTemplates,
} from "@/lib/storage";
import {
  deleteCustomTemplateRecord,
  saveCustomTemplateRecord,
  saveEmailRecord,
} from "@/lib/cloud";
import { ShareWithTeam } from "@/components/share-with-team";
import { downloadHtmlFile } from "@/lib/exportHtml";
import { playbooks } from "@/lib/data";
import { useAccount } from "@/components/account-provider";

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sequence-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function SequenceAssetPage() {
  const params = useParams();
  const router = useRouter();
  const { hasProAccess } = useAccount();
  const templates = useCustomTemplates();

  const id = useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const storedTemplate = useMemo<CustomTemplate | null>(() => {
    if (!id) return null;
    return templates.find((item) => item.id === id) ?? null;
  }, [id, templates]);

  const [optimisticTemplate, setOptimisticTemplate] =
    useState<CustomTemplate | null>(null);
  const template =
    optimisticTemplate?.id === storedTemplate?.id
      ? optimisticTemplate
      : storedTemplate;
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [subjectDraft, setSubjectDraft] = useState<string | null>(null);
  const [bodyDraft, setBodyDraft] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [logoData, setLogoData] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [tagsInput, setTagsInput] = useState(
    () => storedTemplate?.tags.join(", ") ?? ""
  );
  const [folderInput, setFolderInput] = useState(
    () => storedTemplate?.folder ?? ""
  );
  const title = titleDraft ?? template?.title ?? "";
  const subject = subjectDraft ?? template?.subject ?? "";
  const body = bodyDraft ?? template?.body ?? "";

  const sourceInfo = useMemo(() => {
    if (!template) {
      return {
        playbookName: "",
        templateLabel: "",
      };
    }

    const sourcePlaybook = playbooks.find(
      (playbook) => playbook.id === template.sourcePlaybookId
    );

    const sourceTemplate = sourcePlaybook?.templates.find(
      (item) => item.id === template.sourceTemplateId
    );

    return {
      playbookName: sourcePlaybook?.name || "Saved Follow-up Plan",
      templateLabel: sourceTemplate?.label || "Saved Step",
    };
  }, [template]);

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
    anchor.download = "sequence-asset.txt";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  function handleDownloadHtml() {
    downloadHtmlFile(subject, body, "sequence-asset", {
      companyName,
      logoUrl: logoData,
    });
  }

  async function handleSaveVersion() {
    if (!template) return;

    await saveCustomTemplateRecord({
      id: makeId(),
      title,
      subject,
      body,
      sourcePlaybookId: template.sourcePlaybookId,
      sourceTemplateId: template.sourceTemplateId,
      sequenceSteps: template.sequenceSteps,
      tags: template.tags ?? [],
      folder: template.folder ?? null,
      isFavorite: template.isFavorite ?? false,
      createdAt: new Date().toISOString(),
    });

    setSavedMessage("Saved as new version.");
    setTimeout(() => setSavedMessage(""), 2000);
  }

  async function handleSaveAsEmail() {
    if (!template) return;

    await saveEmailRecord({
      id: makeId(),
      playbookId: template.sourcePlaybookId,
      templateId: template.sourceTemplateId,
      templateLabel: title,
      subject,
      body,
      tags: template.tags ?? [],
      folder: template.folder ?? null,
      isFavorite: false,
      createdAt: new Date().toISOString(),
    });

    setSavedMessage("Saved to saved agency messages.");
    setTimeout(() => setSavedMessage(""), 2000);
  }

  async function handleSaveMetadata() {
    if (!template) return;

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const updatedTemplate = {
      ...template,
      tags,
      folder: folderInput.trim() || null,
    };

    setOptimisticTemplate(updatedTemplate);
    await saveCustomTemplateRecord(updatedTemplate);
    setSavedMessage("Follow-up plan details updated.");
    setTimeout(() => setSavedMessage(""), 2000);
  }

  async function handleToggleFavorite() {
    if (!template) return;

    const updatedTemplate = {
      ...template,
      isFavorite: !template.isFavorite,
    };

    setOptimisticTemplate(updatedTemplate);
    await saveCustomTemplateRecord(updatedTemplate);
    setSavedMessage(
      template.isFavorite ? "Removed from favorites." : "Added to favorites."
    );
    setTimeout(() => setSavedMessage(""), 2000);
  }

  async function handleDelete() {
    if (!template) return;
    if (
      !window.confirm(
        `Delete "${template.title}" from your follow-up plans? This cannot be undone.`
      )
    ) {
      return;
    }

    await deleteCustomTemplateRecord(template.id);
    router.push("/workspace");
  }

  if (!hasProAccess) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <div className="badge">Pro Library</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>
              Saved Follow-up Plans are Pro
            </h1>
            <p className="muted">
              Upgrade to manage saved follow-up plans.
            </p>
            <div className="toolbar" style={{ justifyContent: "center" }}>
              <button
                className="button buttonPrimary"
                onClick={() => router.push("/pricing")}
              >
                View Pro
              </button>
              <button
                className="button buttonSecondary"
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

  if (!template) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <h1 className="pageTitle">Follow-up plan not found</h1>
            <p className="muted">
              This follow-up plan could not be loaded.
            </p>
            <div className="toolbar" style={{ justifyContent: "center" }}>
              <button
                className="button buttonPrimary"
                onClick={() => router.push("/workspace")}
              >
                Back to Saved
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
          <div className="badge">Follow-up Plan</div>

          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            {title}
          </h1>

          <p className="muted">
            From: {sourceInfo.playbookName} {"->"} {sourceInfo.templateLabel}
          </p>
        </div>

        <div className="editorLayout">
          <div className="formCard">
            <div className="glassCard" style={{ padding: 18, marginBottom: 18 }}>
              <h4 style={{ margin: 0 }}>Plan Details</h4>
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
                    Asset Name
                  </p>
                  <p style={{ margin: "6px 0 0", fontWeight: 700 }}>{title}</p>
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
                    Subject
                  </p>
                  <p style={{ margin: "6px 0 0" }}>{subject}</p>
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
                    Source
                  </p>
                  <p style={{ margin: "6px 0 0" }}>
                    {sourceInfo.playbookName} {"->"} {sourceInfo.templateLabel}
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
                    Favorite
                  </p>
                  <p style={{ margin: "6px 0 0" }}>
                    {template.isFavorite ? "Yes" : "No"}
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
                    Folder
                  </p>
                  <p style={{ margin: "6px 0 0" }}>
                    {template.folder ?? "No folder yet"}
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
                    {template.tags.length > 0 ? (
                      template.tags.map((tag) => (
                        <span key={tag} className="tagChip">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="small">No tags yet</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="glassCard" style={{ padding: 18, marginBottom: 18 }}>
              <h4 style={{ margin: 0 }}>Organize this plan</h4>
              <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Folder</label>
                  <input
                    className="input"
                    defaultValue={template.folder ?? ""}
                    onChange={(event) => setFolderInput(event.target.value)}
                    placeholder="Example: Client acquisition"
                  />
                </div>

                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Tags</label>
                  <input
                    className="input"
                    defaultValue={template.tags.join(", ")}
                    onChange={(event) => setTagsInput(event.target.value)}
                    placeholder="Example: outreach, founder, follow-up"
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
                    {template.isFavorite ? "Remove Favorite" : "Add Favorite"}
                  </button>
                </div>
              </div>
            </div>

            <ShareWithTeam
              assetType="sequence"
              sourceId={template.id}
              title={title}
              subject={subject}
              body={body}
            />

            <div className="formGroup">
              <label className="label">Asset Name</label>
              <input
                className="input"
                value={title}
                onChange={(event) => setTitleDraft(event.target.value)}
                placeholder="Enter asset name"
              />
            </div>

            <div className="formGroup">
              <label className="label">Subject</label>
              <input
                className="input"
                value={subject}
                onChange={(event) => setSubjectDraft(event.target.value)}
                placeholder="Enter subject"
              />
            </div>

            <div className="formGroup">
              <label className="label">Body</label>
              <textarea
                className="input"
                rows={14}
                value={body}
                onChange={(event) => setBodyDraft(event.target.value)}
                placeholder="Enter email body"
              />
            </div>

            <div className="formGroup">
              <label className="label">Company Name</label>
              <input
                className="input"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Enter company name for export"
              />
            </div>

            <div className="formGroup">
              <label className="label">Upload Logo</label>
              <input
                type="file"
                accept="image/*"
                className="input"
                onChange={(event) => {
                  const file = event.target.files?.[0];
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
                Copy Plan
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
                onClick={() => void handleSaveVersion()}
              >
                Save New Version
              </button>

              <button
                className="button buttonSecondary"
                onClick={() => void handleSaveAsEmail()}
              >
                Save as Email
              </button>
            </div>

            {savedMessage ? <p className="notice">{savedMessage}</p> : null}

            <div className="toolbar">
              <button
                className="button buttonSecondary"
                onClick={() => router.push("/workspace")}
              >
                Back to Saved
              </button>

              <button
                className="button buttonUtility"
                onClick={() => void handleDelete()}
              >
                Delete
              </button>
            </div>
          </div>

          <div className="previewCard">
            <div className="previewLabel">Plan Preview</div>

            <div className="previewBox">
              <strong>Subject: {subject}</strong>
              <br />
              <br />
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                {body}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
