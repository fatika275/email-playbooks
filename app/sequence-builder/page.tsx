"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { saveCustomTemplateRecord } from "@/lib/cloud";
import { playbooks, type Template } from "@/lib/data";
import { renderTemplate } from "@/lib/renderTemplate";
import { useAccount } from "@/components/account-provider";

type BuilderStep = {
  id: string;
  playbookId: string;
  playbookName: string;
  template: Template;
  dayOffset: number;
};

function makeId(prefix = "sequence") {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getUniqueVariables(steps: BuilderStep[]) {
  return Array.from(
    new Set(steps.flatMap((step) => step.template.variables))
  );
}

function getStepLabel(label: string) {
  return label.replace(/\s*\(Day\s+\d+\)/i, "").trim();
}

function getDefaultDayOffset(label: string, index: number) {
  const match = label.match(/\(Day\s+(\d+)\)/i);
  return match ? Math.max(0, Number(match[1]) - 1) : index * 3;
}

const variableLabels: Record<string, string> = {
  name: "Recipient name",
  company: "Company",
  yourName: "Your name",
  service: "Service / offer",
  result: "Target result",
  idea: "Useful idea",
  value: "Value add",
  difference: "Differentiator",
  summary: "Short summary",
  problemArea: "Problem area",
  product: "Product / offer",
  points: "Meeting points",
  nextSteps: "Next steps",
  offer: "Offer",
};

function getVariableLabel(variable: string) {
  return variableLabels[variable] ?? variable;
}

export default function SequenceBuilderPage() {
  const { hasProAccess } = useAccount();
  const [selectedPlaybookId, setSelectedPlaybookId] = useState(
    playbooks[0]?.id ?? ""
  );
  const [steps, setSteps] = useState<BuilderStep[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [sequenceTitle, setSequenceTitle] = useState("");
  const [sequenceSubject, setSequenceSubject] = useState("");
  const [folder, setFolder] = useState("Built Sequences");
  const [tags, setTags] = useState("sequence-builder, outbound");
  const [notice, setNotice] = useState("");

  const selectedPlaybook = playbooks.find(
    (playbook) => playbook.id === selectedPlaybookId
  );

  const availableTemplates = selectedPlaybook?.templates ?? [];
  const variables = useMemo(() => getUniqueVariables(steps), [steps]);

  const renderedSteps = useMemo(
    () =>
      steps.map((step, index) => ({
        ...step,
        number: index + 1,
        subject: renderTemplate(step.template.subject, values),
        body: renderTemplate(step.template.body, values),
      })),
    [steps, values]
  );

  const finalTitle =
    sequenceTitle.trim() ||
    (steps.length > 0
      ? `${steps[0].playbookName} - Custom Sequence`
      : "Custom Sequence");

  const finalSubject =
    sequenceSubject.trim() ||
    renderedSteps[0]?.subject ||
    "Custom outreach sequence";

  const finalBody =
    renderedSteps.length > 0
      ? renderedSteps
          .map(
            (step) =>
              `Step ${step.number}: ${getStepLabel(step.template.label)}\nSubject: ${step.subject}\n\n${step.body}`
          )
          .join("\n\n---\n\n")
      : "Add steps to build your sequence.";

  if (!hasProAccess) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <div className="badge">Pro Workflow</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>
              Sequence Builder is a Pro feature
            </h1>
            <p className="muted" style={{ maxWidth: 680, marginInline: "auto" }}>
              Free access lets you use the core playbooks. Pro unlocks the
              builder so you can assemble multi-step outreach systems and save
              them into your reusable library.
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

  function addStep(template: Template) {
    if (!selectedPlaybook) return;

    setSteps((current) => [
      ...current,
      {
        id: makeId("step"),
        playbookId: selectedPlaybook.id,
        playbookName: selectedPlaybook.name,
        template,
        dayOffset: getDefaultDayOffset(template.label, current.length),
      },
    ]);
  }

  function removeStep(stepId: string) {
    setSteps((current) => current.filter((step) => step.id !== stepId));
  }

  function moveStep(stepId: string, direction: "up" | "down") {
    setSteps((current) => {
      const index = current.findIndex((step) => step.id === stepId);
      if (index === -1) return current;

      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) return current;

      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  }

  function updateValue(variable: string, value: string) {
    setValues((current) => ({ ...current, [variable]: value }));
  }

  function updateStepDayOffset(stepId: string, dayOffset: number) {
    setSteps((current) =>
      current.map((step) =>
        step.id === stepId
          ? { ...step, dayOffset: Math.max(0, Number.isFinite(dayOffset) ? dayOffset : 0) }
          : step
      )
    );
  }

  async function handleSaveSequence() {
    if (steps.length === 0) {
      setNotice("Add at least one step before saving.");
      return;
    }

    const firstStep = steps[0];
    const parsedTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    await saveCustomTemplateRecord({
      id: makeId("built-sequence"),
      title: finalTitle,
      subject: finalSubject,
      body: finalBody,
      sourcePlaybookId: firstStep.playbookId,
      sourceTemplateId: firstStep.template.id,
      sequenceSteps: steps.map((step) => ({
        playbookId: step.playbookId,
        playbookName: step.playbookName,
        templateId: step.template.id,
        templateLabel: getStepLabel(step.template.label),
        dayOffset: step.dayOffset,
      })),
      tags: parsedTags,
      folder: folder.trim() || "Built Sequences",
      isFavorite: false,
      createdAt: new Date().toISOString(),
    });

    setNotice("Saved to Reusable Sequences.");
    setTimeout(() => setNotice(""), 2200);
  }

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader">
          <div className="badge">Sequence Builder</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            Build a Custom Outreach Sequence
          </h1>
          <p className="muted" style={{ maxWidth: 760, lineHeight: 1.75 }}>
            Combine steps from the system library, fill shared variables once,
            and save the result as a reusable sequence.
          </p>
        </div>

        <div className="builderLayout">
          <div className="formCard">
            <div className="glassCard builderPanel">
              <h3 className="cardTitle">1. Choose steps</h3>
              <p className="muted" style={{ marginTop: 8 }}>
                Pick a playbook, then add the steps you want in order.
              </p>

              <div className="formGroup" style={{ marginTop: 16 }}>
                <label className="label">Playbook</label>
                <select
                  className="input"
                  value={selectedPlaybookId}
                  onChange={(event) => setSelectedPlaybookId(event.target.value)}
                >
                  {playbooks.map((playbook) => (
                    <option key={playbook.id} value={playbook.id}>
                      {playbook.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="builderStepPicker">
                {availableTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="builderStepOption"
                    onClick={() => addStep(template)}
                  >
                    <span>{getStepLabel(template.label)}</span>
                    <span className="small">{template.goal}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="glassCard builderPanel">
              <h3 className="cardTitle">2. Arrange sequence</h3>

              {steps.length === 0 ? (
                <p className="muted" style={{ marginTop: 10 }}>
                  No steps selected yet.
                </p>
              ) : (
                <div className="builderSelectedSteps">
                  {steps.map((step, index) => (
                    <div key={step.id} className="builderSelectedStep">
                      <div>
                        <span className="miniBadge">Step {index + 1}</span>
                        <h4 style={{ margin: "10px 0 4px" }}>
                          {getStepLabel(step.template.label)}
                        </h4>
                        <p className="small" style={{ margin: 0 }}>
                          {step.playbookName}
                        </p>
                      </div>

                      <div className="builderStepActions">
                        <label className="small" style={{ display: "grid", gap: 4 }}>
                          Day
                          <input
                            className="input"
                            type="number"
                            min="0"
                            value={step.dayOffset}
                            onChange={(event) =>
                              updateStepDayOffset(
                                step.id,
                                Number(event.target.value)
                              )
                            }
                            style={{ width: 84, padding: "8px 10px" }}
                            aria-label={`Day offset for ${getStepLabel(step.template.label)}`}
                          />
                        </label>
                        <button
                          type="button"
                          className="button buttonUtility"
                          onClick={() => moveStep(step.id, "up")}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="button buttonUtility"
                          onClick={() => moveStep(step.id, "down")}
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          className="button buttonUtility"
                          onClick={() => removeStep(step.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glassCard builderPanel">
              <h3 className="cardTitle">3. Fill shared details</h3>

              {variables.length === 0 ? (
                <p className="muted" style={{ marginTop: 10 }}>
                  Add steps first and the builder will show the fields they need.
                </p>
              ) : (
                <div className="builderFieldGrid">
                  {variables.map((variable) => (
                    <div key={variable} className="formGroup" style={{ marginBottom: 0 }}>
                      <label className="label">{getVariableLabel(variable)}</label>
                      <input
                        className="input"
                        value={values[variable] ?? ""}
                        onChange={(event) =>
                          updateValue(variable, event.target.value)
                        }
                        placeholder={`Enter ${getVariableLabel(variable).toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glassCard builderPanel">
              <h3 className="cardTitle">4. Save to your library</h3>

              <div className="builderFieldGrid" style={{ marginTop: 16 }}>
                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Sequence title</label>
                  <input
                    className="input"
                    value={sequenceTitle}
                    onChange={(event) => setSequenceTitle(event.target.value)}
                    placeholder={finalTitle}
                  />
                </div>

                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Folder</label>
                  <input
                    className="input"
                    value={folder}
                    onChange={(event) => setFolder(event.target.value)}
                    placeholder="Example: Client acquisition"
                  />
                </div>

                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Tags</label>
                  <input
                    className="input"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder="Example: outbound, follow-up"
                  />
                </div>

                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Sequence subject</label>
                  <input
                    className="input"
                    value={sequenceSubject}
                    onChange={(event) => setSequenceSubject(event.target.value)}
                    placeholder={finalSubject}
                  />
                </div>
              </div>

              <div className="toolbar" style={{ marginTop: 18 }}>
                <button
                  type="button"
                  className="button buttonPrimary"
                  onClick={() => void handleSaveSequence()}
                >
                  Save Sequence
                </button>
                <Link href="/custom-templates" className="button buttonSecondary">
                  View Reusable Sequences
                </Link>
              </div>

              {notice ? <p className="notice">{notice}</p> : null}
            </div>
          </div>

          <div className="previewCard builderPreview">
            <div className="previewLabel">Sequence Preview</div>
            <div className="previewBox">
              <strong>{finalTitle}</strong>
              <br />
              <span className="muted">Subject: {finalSubject}</span>
            </div>

            <div className="previewSpacer" />

            <div className="previewLabel">Steps</div>
            <div className="builderPreviewSteps">
              {renderedSteps.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  Your selected steps will appear here.
                </p>
              ) : (
                renderedSteps.map((step) => (
                  <div key={step.id} className="builderPreviewStep">
                    <span className="miniBadge">Step {step.number}</span>
                    <h4 style={{ margin: "10px 0 6px" }}>
                      {getStepLabel(step.template.label)}
                    </h4>
                    <p className="small" style={{ margin: "0 0 10px" }}>
                      Subject: {step.subject}
                    </p>
                    <p className="muted" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                      {step.body}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
