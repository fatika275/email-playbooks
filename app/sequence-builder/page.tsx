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

const FOLLOW_UP_SITUATIONS = [
  {
    id: "warm-lead",
    label: "Warm lead",
    description: "They replied or showed interest, but have not booked yet.",
    playbookIds: [
      "follow-up-frameworks",
      "meeting-follow-up",
      "demo-booking-sequence",
    ],
  },
  {
    id: "proposal",
    label: "Proposal sent",
    description: "You sent scope or pricing and need a decision.",
    playbookIds: ["proposal-follow-up"],
  },
  {
    id: "quiet-lead",
    label: "Gone quiet",
    description: "A prospect or past client has stopped responding.",
    playbookIds: ["no-show-recovery", "re-engagement-emails", "client-renewal-upsell"],
  },
  {
    id: "all",
    label: "All follow-ups",
    description: "Browse every chase message and follow-up flow.",
    playbookIds: playbooks.map((playbook) => playbook.id),
  },
] satisfies {
  id: string;
  label: string;
  description: string;
  playbookIds: string[];
}[];

type FollowUpSituationId = (typeof FOLLOW_UP_SITUATIONS)[number]["id"];

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
  const [selectedSituationId, setSelectedSituationId] =
    useState<FollowUpSituationId>("warm-lead");
  const [templateQuery, setTemplateQuery] = useState("");
  const [steps, setSteps] = useState<BuilderStep[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [sequenceTitle, setSequenceTitle] = useState("");
  const [notice, setNotice] = useState("");

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
    const selectedSituation =
      FOLLOW_UP_SITUATIONS.find((situation) => situation.id === selectedSituationId) ??
      FOLLOW_UP_SITUATIONS[0];

    return templateOptions.filter((option) => {
      const matchesSituation = selectedSituation.playbookIds.includes(option.playbookId);
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

      return matchesSituation && matchesQuery;
    });
  }, [selectedSituationId, templateOptions, templateQuery]);

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

  const finalSubject = renderedSteps[0]?.subject || "Custom follow-up plan";

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
              Follow-up management is a Pro feature
            </h1>
            <p className="muted" style={{ maxWidth: 680, marginInline: "auto" }}>
              Free access lets you use the core playbooks. Pro unlocks the
              reminders, saved follow-ups, and lead context you need to stop
              warm deals going quiet.
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
      tags: ["follow-up", "pipeline"],
      folder: "Follow-up Plans",
      isFavorite: false,
      createdAt: new Date().toISOString(),
    });

    setNotice("Saved to follow-up plans.");
    setTimeout(() => setNotice(""), 2200);
  }

  return (
    <main className="main">
      <section className="container">
        <div className="builderHero builderHeroSimple followUpHero">
          <div>
            <div className="badge">Follow-ups</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>
              Build a simple chase plan for leads that might slip.
            </h1>
            <p className="muted">
              Choose the situation, pick the next messages, then save the plan.
              No heavy automation, just clear follow-up steps for booking more client work.
            </p>
          </div>
          <div className="builderHeroActions">
            <Link href="/custom-templates" className="button buttonSecondary">
              View Saved Plans
            </Link>
          </div>
        </div>

        <div className="followUpGuide" aria-label="Follow-up builder steps">
          <div className="followUpGuideStep isActive">
            <span>1</span>
            <strong>Choose the chase</strong>
          </div>
          <div className={steps.length > 0 ? "followUpGuideStep isActive" : "followUpGuideStep"}>
            <span>2</span>
            <strong>Add messages</strong>
          </div>
          <div className={isReadyToSave ? "followUpGuideStep isActive" : "followUpGuideStep"}>
            <span>3</span>
            <strong>Save the plan</strong>
          </div>
        </div>

        <div className="builderLayout">
          <div className="builderLibrary glassCard">
            <div className="builderPanelHeader">
              <div>
                <span className="miniBadge">Step 1</span>
                <h2 className="cardTitle">What are you chasing?</h2>
              </div>
            </div>

            <div className="followUpSituationGrid">
              {FOLLOW_UP_SITUATIONS.map((situation) => (
                <button
                  key={situation.id}
                  type="button"
                  className={
                    selectedSituationId === situation.id
                      ? "followUpSituation isSelected"
                      : "followUpSituation"
                  }
                  onClick={() => {
                    setSelectedSituationId(situation.id);
                    setTemplateQuery("");
                  }}
                >
                  <strong>{situation.label}</strong>
                  <span>{situation.description}</span>
                </button>
              ))}
            </div>

            <div className="builderPanelHeader followUpMessageHeader">
              <div>
                <span className="miniBadge">Step 2</span>
                <h2 className="cardTitle">Pick the messages</h2>
              </div>
              <span className="small">{filteredTemplateOptions.length} available</span>
            </div>

            <div className="builderLibraryControls followUpSearch">
              <label className="label" htmlFor="follow-up-search">
                Search these messages
              </label>
              <input
                id="follow-up-search"
                className="input"
                value={templateQuery}
                onChange={(event) => setTemplateQuery(event.target.value)}
                placeholder="Search by goal or use case"
              />
            </div>

            <div className="builderStepPicker">
              {filteredTemplateOptions.length === 0 ? (
                <div className="builderEmptyPanel">
                  <strong>No matching messages</strong>
                  <p className="muted">Try a broader search or choose another chase type.</p>
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
                  <span className="miniBadge">Your plan</span>
                  <h2 className="cardTitle">
                    {steps.length
                      ? `${steps.length} message${steps.length === 1 ? "" : "s"} over ${sequenceSpan} ${sequenceSpan === 1 ? "day" : "days"}`
                      : "No messages selected"}
                  </h2>
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
                  <strong>Start with the first chase</strong>
                  <p className="muted">
                    Choose the first reminder message. It will appear here with
                    a chase day you can change.
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

            {variables.length > 0 ? (
              <div className="glassCard builderPanel">
                <div className="builderPanelHeader">
                  <div>
                    <span className="miniBadge">Personalisation</span>
                    <h2 className="cardTitle">Shared fields</h2>
                  </div>
                  <span className="small">
                    {filledVariableCount} of {variables.length} complete
                  </span>
                </div>
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
              </div>
            ) : null}

            <div className="glassCard builderPanel">
              <div className="builderPanelHeader">
                <div>
                  <span className="miniBadge">Step 3</span>
                  <h2 className="cardTitle">Save the plan</h2>
                </div>
              </div>

              <div className="builderFieldGrid followUpSaveGrid" style={{ marginTop: 16 }}>
                <div className="formGroup" style={{ marginBottom: 0 }}>
                  <label className="label">Plan name</label>
                  <input
                    className="input"
                    value={sequenceTitle}
                    onChange={(event) => setSequenceTitle(event.target.value)}
                    placeholder={finalTitle}
                  />
                </div>
              </div>

              <div className="toolbar builderSaveActions" style={{ marginTop: 18 }}>
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
        </div>
      </section>
    </main>
  );
}
