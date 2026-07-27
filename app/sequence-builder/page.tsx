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

type TemplateOption = {
  playbookId: string;
  playbookName: string;
  badge: string;
  audience: string;
  template: Template;
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

function getSequenceSpan(steps: BuilderStep[]) {
  if (steps.length === 0) return 0;
  return Math.max(...steps.map((step) => step.dayOffset)) + 1;
}

function getFilledVariableCount(variables: string[], values: Record<string, string>) {
  return variables.filter((variable) => values[variable]?.trim()).length;
}

export default function SequenceBuilderPage() {
  const { hasProAccess } = useAccount();
  const [selectedPlaybookId, setSelectedPlaybookId] = useState(
    playbooks[0]?.id ?? ""
  );
  const [templateQuery, setTemplateQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [steps, setSteps] = useState<BuilderStep[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [sequenceTitle, setSequenceTitle] = useState("");
  const [sequenceSubject, setSequenceSubject] = useState("");
  const [folder, setFolder] = useState("Follow-up Plans");
  const [tags, setTags] = useState("follow-up, outbound");
  const [notice, setNotice] = useState("");

  const categoryOptions = useMemo(
    () => ["All", ...Array.from(new Set(playbooks.map((playbook) => playbook.badge)))],
    []
  );

  const templateOptions = useMemo<TemplateOption[]>(
    () =>
      playbooks.flatMap((playbook) =>
        playbook.templates.map((template) => ({
          playbookId: playbook.id,
          playbookName: playbook.name,
          badge: playbook.badge,
          audience: playbook.audience,
          template,
        }))
      ),
    []
  );

  const filteredTemplateOptions = useMemo(() => {
    const normalizedQuery = templateQuery.trim().toLowerCase();

    return templateOptions.filter((option) => {
      const matchesPlaybook =
        selectedPlaybookId === "all" || option.playbookId === selectedPlaybookId;
      const matchesCategory =
        categoryFilter === "All" || option.badge === categoryFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          option.template.label,
          option.template.goal,
          option.template.whenToUse,
          option.playbookName,
          option.badge,
          option.audience,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesPlaybook && matchesCategory && matchesQuery;
    });
  }, [categoryFilter, selectedPlaybookId, templateOptions, templateQuery]);

  const variables = useMemo(() => getUniqueVariables(steps), [steps]);
  const sequenceSpan = getSequenceSpan(steps);
  const filledVariableCount = getFilledVariableCount(variables, values);
  const isReadyToSave = steps.length > 0;

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
      ? `${steps[0].playbookName} - Follow-up Plan`
      : "Custom Follow-up Plan");

  const finalSubject =
    sequenceSubject.trim() ||
    renderedSteps[0]?.subject ||
    "Custom follow-up plan";

  const finalBody =
    renderedSteps.length > 0
      ? renderedSteps
          .map(
            (step) =>
              `Step ${step.number}: ${getStepLabel(step.template.label)}\nSubject: ${step.subject}\n\n${step.body}`
          )
          .join("\n\n---\n\n")
      : "Add messages to build your follow-up plan.";

  if (!hasProAccess) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <div className="badge">Pro Workflow</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>
              Follow-up Builder is a Pro feature
            </h1>
            <p className="muted" style={{ maxWidth: 680, marginInline: "auto" }}>
              Free access lets you use the core playbooks. Pro unlocks the
              builder so you can save the exact follow-up plan you use to keep
              client leads moving.
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

  function addStep(option: TemplateOption) {
    setSteps((current) => [
      ...current,
      {
        id: makeId("step"),
        playbookId: option.playbookId,
        playbookName: option.playbookName,
        template: option.template,
        dayOffset: getDefaultDayOffset(option.template.label, current.length),
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
      folder: folder.trim() || "Follow-up Plans",
      isFavorite: false,
      createdAt: new Date().toISOString(),
    });

    setNotice("Saved to follow-up plans.");
    setTimeout(() => setNotice(""), 2200);
  }

  return (
    <main className="main">
      <section className="container">
        <div className="builderHero">
          <div>
            <div className="badge">Follow-up Builder</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>
              Build one reusable follow-up plan.
            </h1>
            <p className="muted">
              Pick the messages you want to send, put them in the right order,
              set the days, and save the plan so leads do not slip after the first touch.
            </p>
          </div>

          <div className="builderHeroStats" aria-label="Follow-up plan summary">
            <div>
              <strong>{steps.length}</strong>
              <span>{steps.length === 1 ? "message" : "messages"}</span>
            </div>
            <div>
              <strong>{sequenceSpan}</strong>
              <span>{sequenceSpan === 1 ? "day" : "days"}</span>
            </div>
            <div>
              <strong>
                {filledVariableCount}/{variables.length}
              </strong>
              <span>fields</span>
            </div>
          </div>
        </div>

        <div className="builderLayout">
          <div className="builderLibrary glassCard">
            <div className="builderPanelHeader">
              <div>
                <span className="miniBadge">Step 1</span>
                <h2 className="cardTitle">Choose messages</h2>
              </div>
              <span className="small">{filteredTemplateOptions.length} available</span>
            </div>

            <div className="builderLibraryControls">
              <div className="formGroup" style={{ marginBottom: 0 }}>
                <label className="label">Search</label>
                <input
                  className="input"
                  value={templateQuery}
                  onChange={(event) => setTemplateQuery(event.target.value)}
                  placeholder="Search goal, use case, or playbook"
                />
              </div>

              <div className="formGroup" style={{ marginBottom: 0 }}>
                <label className="label">Source</label>
                <select
                  className="input"
                  value={selectedPlaybookId}
                  onChange={(event) => setSelectedPlaybookId(event.target.value)}
                >
                  <option value="all">All playbooks</option>
                  {playbooks.map((playbook) => (
                    <option key={playbook.id} value={playbook.id}>
                      {playbook.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="formGroup" style={{ marginBottom: 0 }}>
                <label className="label">Category</label>
                <select
                  className="input"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="builderStepPicker">
              {filteredTemplateOptions.length === 0 ? (
                <div className="builderEmptyPanel">
                  <strong>No matching messages</strong>
                  <p className="muted">Try a broader search or reset the category.</p>
                </div>
              ) : (
                filteredTemplateOptions.map((option) => (
                  <button
                    key={`${option.playbookId}-${option.template.id}`}
                    type="button"
                    className="builderStepOption"
                    onClick={() => addStep(option)}
                  >
                    <span className="builderStepOptionTop">
                      <strong>{getStepLabel(option.template.label)}</strong>
                      <span className="miniBadge">{option.badge}</span>
                    </span>
                    <span className="small">{option.template.goal}</span>
                    <span className="builderStepOptionMeta">
                      {option.playbookName}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="builderCanvas">
            <div className="glassCard builderPanel">
              <div className="builderPanelHeader">
                <div>
                  <span className="miniBadge">Step 2</span>
                  <h2 className="cardTitle">Order the follow-up</h2>
                </div>
                {steps.length > 0 ? (
                  <button
                    type="button"
                    className="button buttonUtility"
                    onClick={() => setSteps([])}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              {steps.length === 0 ? (
                <div className="builderEmptyPanel">
                  <strong>Your timeline is empty</strong>
                  <p className="muted">
                    Choose messages on the left, then set when each follow-up should happen.
                  </p>
                </div>
              ) : (
                <div className="builderSelectedSteps">
                  {steps.map((step, index) => (
                    <div key={step.id} className="builderSelectedStep">
                      <div className="builderStepIndex">
                        <span>{index + 1}</span>
                      </div>
                      <div className="builderSelectedStepBody">
                        <div className="builderSelectedStepTop">
                          <div>
                            <h3>{getStepLabel(step.template.label)}</h3>
                            <p className="small">{step.playbookName}</p>
                          </div>
                          <label className="builderDayControl">
                            <span>Day</span>
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
                              aria-label={`Day offset for ${getStepLabel(step.template.label)}`}
                            />
                          </label>
                        </div>
                        <p className="muted">{step.template.goal}</p>
                      </div>

                      <div className="builderStepActions">
                        <button
                          type="button"
                          className="button buttonUtility"
                          onClick={() => moveStep(step.id, "up")}
                          aria-label={`Move ${getStepLabel(step.template.label)} up`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="button buttonUtility"
                          onClick={() => moveStep(step.id, "down")}
                          aria-label={`Move ${getStepLabel(step.template.label)} down`}
                        >
                          ↓
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
              <div className="builderPanelHeader">
                <div>
                  <span className="miniBadge">Details</span>
                  <h2 className="cardTitle">Fill shared details</h2>
                </div>
                <span className="small">
                  {filledVariableCount} of {variables.length} complete
                </span>
              </div>
              {variables.length === 0 ? (
                <div className="builderEmptyPanel">
                  <strong>No fields yet</strong>
                  <p className="muted">
                    Once a message is selected, shared fields will appear here.
                  </p>
                </div>
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
              <div className="builderPanelHeader">
                <div>
                  <span className="miniBadge">Step 3</span>
                  <h2 className="cardTitle">Save the plan</h2>
                </div>
              </div>

              <div className="builderFieldGrid" style={{ marginTop: 16 }}>
                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Plan name</label>
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
                  <label className="label">First email subject</label>
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
                  className={isReadyToSave ? "button buttonPrimary" : "button buttonSecondary"}
                  onClick={() => void handleSaveSequence()}
                >
                  Save Follow-up Plan
                </button>
                <Link href="/custom-templates" className="button buttonSecondary">
                  View Saved Plans
                </Link>
              </div>

              {notice ? <p className="notice">{notice}</p> : null}
            </div>
          </div>

          <div className="previewCard builderPreview">
            <div className="builderPreviewHeader">
              <div>
                <div className="previewLabel">Live Preview</div>
                <h2>{finalTitle}</h2>
              </div>
              <span className="miniBadge">{steps.length} messages</span>
            </div>

            <div className="builderPreviewMeta">
              <div>
                <span>Subject</span>
                <strong>{finalSubject}</strong>
              </div>
              <div>
                <span>Timeline</span>
                <strong>
                  {sequenceSpan} {sequenceSpan === 1 ? "day" : "days"}
                </strong>
              </div>
            </div>

            <div className="builderPreviewSteps">
              {renderedSteps.length === 0 ? (
                <div className="builderEmptyPanel">
                  <strong>Preview waiting</strong>
                  <p className="muted">Selected steps will render here in order.</p>
                </div>
              ) : (
                renderedSteps.map((step) => (
                  <div key={step.id} className="builderPreviewStep">
                    <div className="builderPreviewStepTop">
                      <span className="miniBadge">Day {step.dayOffset}</span>
                      <span className="small">Step {step.number}</span>
                    </div>
                    <h3>{getStepLabel(step.template.label)}</h3>
                    <strong>Subject: {step.subject}</strong>
                    <p className="muted">
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
