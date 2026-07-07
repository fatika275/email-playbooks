"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { getPlaybookById } from "@/lib/data";
import { useAccount } from "@/components/account-provider";
import { getPlaybookAccess } from "@/lib/access";

function getDayFromLabel(label: string) {
  const match = label.match(/\((Day\s+\d+)\)/i);
  return match ? match[1] : "Step";
}

function getCleanLabel(label: string) {
  return label.replace(/\s*\(Day\s+\d+\)/i, "").trim();
}

function getSuccessOutcome(
  template: {
    goal: string;
    label: string;
    whenToUse: string;
  },
  index: number,
  total: number
) {
  const text = (
    template.goal +
    " " +
    template.label +
    " " +
    template.whenToUse
  ).toLowerCase();

  if (text.includes("book") || text.includes("call") || text.includes("demo")) {
    return "Book a call";
  }

  if (text.includes("objection")) {
    return "Handle objection and keep momentum";
  }

  if (
    text.includes("re-engage") ||
    text.includes("restart") ||
    text.includes("timing check-in")
  ) {
    return "Restart the conversation";
  }

  if (text.includes("proposal") || text.includes("decision")) {
    return "Move toward a decision";
  }

  if (index === total - 1) {
    return "Drive final response or close loop";
  }

  return "Get a reply";
}

type TemplateEducationProps = {
  psychology: string;
  subjectLineLogic: string;
  keySentenceBreakdown: {
    sentence: string;
    explanation: string;
  }[];
  commonMistakes: string[];
};

function Toast({
  message,
  onDone,
}: {
  message: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 1800);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return <div className="toast">{message}</div>;
}

function TemplateEducation({
  psychology,
  subjectLineLogic,
  keySentenceBreakdown,
  commonMistakes,
}: TemplateEducationProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ marginTop: 20 }}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="button buttonUtility"
      >
        {isOpen ? "Hide Expert Breakdown" : "View Expert Breakdown"}
      </button>

      {isOpen ? (
        <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
          <div className="glassCard" style={{ padding: 18 }}>
            <h4 style={{ margin: 0 }}>Underlying Psychology</h4>
            <p className="muted" style={{ margin: "10px 0 0", lineHeight: 1.75 }}>
              {psychology}
            </p>
          </div>

          <div className="glassCard" style={{ padding: 18 }}>
            <h4 style={{ margin: 0 }}>Subject Strategy</h4>
            <p className="muted" style={{ margin: "10px 0 0", lineHeight: 1.75 }}>
              {subjectLineLogic}
            </p>
          </div>

          <div className="glassCard" style={{ padding: 18 }}>
            <h4 style={{ margin: 0 }}>Key Sentence Breakdown</h4>

            <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
              {keySentenceBreakdown.map((item, i) => (
                <div
                  key={i}
                  style={{
                    paddingBottom: 12,
                    borderBottom:
                      i < keySentenceBreakdown.length - 1
                        ? "1px solid rgba(255,255,255,0.06)"
                        : "none",
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 700 }}>{item.sentence}</p>
                  <p className="muted" style={{ margin: "6px 0 0", lineHeight: 1.7 }}>
                    {item.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="glassCard" style={{ padding: 18 }}>
            <h4 style={{ margin: 0 }}>Where Most People Go Wrong</h4>

            <ul
              style={{
                margin: "12px 0 0",
                paddingLeft: 18,
                display: "grid",
                gap: 8,
              }}
            >
              {commonMistakes.map((mistake, i) => (
                <li key={i} className="muted">
                  {mistake}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function PlaybookPage() {
  const params = useParams();
  const [toastMessage, setToastMessage] = useState("");
  const { hasProAccess } = useAccount();

  const id = useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const playbook = id ? getPlaybookById(id) : null;
  const access = playbook ? getPlaybookAccess(playbook, hasProAccess) : null;

  if (!playbook) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <h1 className="pageTitle">Playbook not found</h1>
            <p className="muted">
              This playbook does not exist. Try going back to the system library.
            </p>
            <div className="toolbar" style={{ justifyContent: "center" }}>
              <Link href="/" className="button buttonPrimary">
                Back to Message Library
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (access?.isLocked) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <div className="badge">Pro Playbook</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>
              Unlock {playbook.name}
            </h1>
            <p className="muted" style={{ maxWidth: 680, marginInline: "auto" }}>
              This is part of the Pro library. Free access includes the core
              playbooks, while Pro unlocks the full system library, reusable
              workflows, and advanced sequence tools.
            </p>
            <div className="toolbar" style={{ justifyContent: "center", marginTop: 20 }}>
              <Link href="/pricing" className="button buttonPrimary">
                View Pro
              </Link>
              <Link href="/" className="button buttonSecondary">
                Back to Free Library
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
          <div className="badge">{playbook.badge}</div>
          <h1 className="pageTitle" style={{ marginTop: 14 }}>
            {playbook.name}
          </h1>
          <p className="muted" style={{ maxWidth: 760, lineHeight: 1.75 }}>
            {playbook.description}
          </p>
        </div>

        <div className="sequenceIntro">
          <div style={{ maxWidth: 760 }}>
            <p className="sequenceEyebrow">System + Education</p>
            <h2 className="sequenceTitle">
              Follow the sequence and understand the logic behind each step
            </h2>
            <p className="muted" style={{ marginTop: 14, lineHeight: 1.8 }}>
              Each step gives you the goal, timing context, what success looks
              like, and what to do next — plus deeper breakdowns when you want
              them.
            </p>

            <div className="toolbar" style={{ marginTop: 18 }}>
              <Link href="/sequence-builder" className="button buttonSecondary">
                Build Custom Sequence
              </Link>
            </div>
          </div>

          <div className="sequenceMeta">
            <div className="sequenceMetaItem">
              <span className="sequenceMetaLabel">Audience</span>
              <span className="sequenceMetaValue">{playbook.audience}</span>
            </div>

            <div className="sequenceMetaItem">
              <span className="sequenceMetaLabel">Steps</span>
              <span className="sequenceMetaValue">
                {playbook.templates.length}
              </span>
            </div>
          </div>
        </div>

        <div className="timeline">
          {playbook.templates.map((template, index) => {
            const dayLabel = getDayFromLabel(template.label);
            const cleanLabel = getCleanLabel(template.label);
            const nextTemplate = playbook.templates[index + 1];

            const isFirst = index === 0;
            const isLast = index === playbook.templates.length - 1;
            const stepType = isFirst ? "Start" : isLast ? "Final" : "Middle";
            const progressPercent =
              ((index + 1) / playbook.templates.length) * 100;

            return (
              <div
                key={template.id}
                className="timelineItem"
                id={`step-${template.id}`}
              >
                <div className="timelineRail">
                  <div className="timelineDot">{index + 1}</div>
                  {index < playbook.templates.length - 1 ? (
                    <div className="timelineLine" />
                  ) : null}
                </div>

                <div className="timelineCard">
                  <div className="timelineTop">
                    <div>
                      <p className="timelineDay">{dayLabel}</p>
                      <h3 className="cardTitle" style={{ fontSize: 24 }}>
                        {cleanLabel}
                      </h3>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span className="miniBadge">{playbook.audience}</span>
                      <span
                        className="miniBadge"
                        style={{
                          background:
                            stepType === "Start"
                              ? "var(--green-soft)"
                              : stepType === "Final"
                              ? "var(--red-soft)"
                              : "rgba(255,255,255,0.06)",
                          borderColor:
                            stepType === "Start"
                              ? "rgba(65,200,120,0.18)"
                              : stepType === "Final"
                              ? "rgba(255,90,90,0.18)"
                              : "rgba(255,255,255,0.08)",
                        }}
                      >
                        {stepType}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: 16, marginBottom: 18 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        marginBottom: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        Step {index + 1} of {playbook.templates.length}
                      </p>

                      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                        {stepType} phase
                      </p>
                    </div>

                    <div
                      style={{
                        height: 8,
                        width: "100%",
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 999,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${progressPercent}%`,
                          background: "linear-gradient(90deg, #f4d77a, #d4af37)",
                          borderRadius: 999,
                          boxShadow: "0 0 16px rgba(212,175,55,0.24)",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    className="glassCard"
                    style={{
                      padding: 18,
                      marginBottom: 18,
                      background:
                        "linear-gradient(180deg, rgba(212,175,55,0.08), rgba(255,255,255,0.025))",
                      borderColor: "rgba(212,175,55,0.14)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      Outcome Snapshot
                    </p>

                    <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                          gap: 14,
                        }}
                      >
                        <div
                          style={{
                            padding: 14,
                            borderRadius: 14,
                            background: "rgba(255,255,255,0.035)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <p
                            className="muted"
                            style={{
                              margin: 0,
                              fontSize: 12,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Goal
                          </p>
                          <p style={{ margin: "8px 0 0", fontWeight: 700, lineHeight: 1.5 }}>
                            {template.goal}
                          </p>
                        </div>

                        <div
                          style={{
                            padding: 14,
                            borderRadius: 14,
                            background: "rgba(255,255,255,0.035)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <p
                            className="muted"
                            style={{
                              margin: 0,
                              fontSize: 12,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Success
                          </p>
                          <p style={{ margin: "8px 0 0", fontWeight: 700, lineHeight: 1.5 }}>
                            {getSuccessOutcome(
                              template,
                              index,
                              playbook.templates.length
                            )}
                          </p>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: 14,
                          borderRadius: 14,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <p
                          className="muted"
                          style={{
                            margin: 0,
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Use when
                        </p>
                        <p className="muted" style={{ margin: "8px 0 0", lineHeight: 1.7 }}>
                          {template.whenToUse}
                        </p>
                      </div>

                      <div
                        style={{
                          padding: 14,
                          borderRadius: 14,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <p
                          className="muted"
                          style={{
                            margin: 0,
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Then
                        </p>
                        <p className="muted" style={{ margin: "8px 0 0", lineHeight: 1.7 }}>
                          {template.nextStep}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 14,
                    }}
                  >
                    <div
                      className="glassCard"
                      style={{ padding: 16, background: "rgba(255,255,255,0.025)" }}
                    >
                      <strong>Why it works</strong>
                      <p className="muted" style={{ marginTop: 8, lineHeight: 1.75 }}>
                        {template.whyItWorks}
                      </p>
                    </div>

                    <div
                      className="glassCard"
                      style={{ padding: 16, background: "rgba(255,255,255,0.025)" }}
                    >
                      <strong>Expected outcome</strong>
                      <p className="muted" style={{ marginTop: 8, lineHeight: 1.75 }}>
                        {template.expectedOutcome}
                      </p>
                    </div>
                  </div>

                  <TemplateEducation
                    psychology={template.psychology}
                    subjectLineLogic={template.subjectLineLogic}
                    keySentenceBreakdown={template.keySentenceBreakdown}
                    commonMistakes={template.commonMistakes}
                  />

                  <div className="toolbar" style={{ marginTop: 20 }}>
                    <Link
                      href={`/editor/${playbook.id}/${template.id}`}
                      className="button buttonPrimary"
                      onClick={() => setToastMessage("Opening step editor...")}
                    >
                      Use This Step
                    </Link>

                    {nextTemplate ? (
                      <Link
                        href={`/playbook/${playbook.id}#step-${nextTemplate.id}`}
                        className="button buttonSecondary"
                        onClick={() =>
                          setToastMessage(
                            `Moving to ${getCleanLabel(nextTemplate.label)}`
                          )
                        }
                      >
                        Next Step: {getCleanLabel(nextTemplate.label)}
                      </Link>
                    ) : (
                      <Link
                        href="/custom-templates"
                        className="button buttonSecondary"
                        onClick={() => setToastMessage("Opening reusable sequences...")}
                      >
                        View Saved Sequences
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {toastMessage ? (
        <Toast
          message={toastMessage}
          onDone={() => setToastMessage("")}
        />
      ) : null}
    </main>
  );
}
