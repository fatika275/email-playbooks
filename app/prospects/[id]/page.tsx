"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "@/components/account-provider";
import {
  deleteProspect,
  getProspect,
  PROSPECT_STAGES,
  PROSPECT_STAGE_LABELS,
  updateProspect,
  type Prospect,
  type ProspectStage,
} from "@/lib/prospects";

export default function ProspectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, hasProAccess, isLoading } = useAccount();
  const id = useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [source, setSource] = useState("");
  const [stage, setStage] = useState<ProspectStage>("new");
  const [value, setValue] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [lastContactedAt, setLastContactedAt] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [notice, setNotice] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (!id || !user || !hasProAccess) return;
    void getProspect(id)
      .then((record) => {
        if (!record) {
          setNotice("This prospect could not be found or you no longer have access.");
          return;
        }
        setProspect(record);
        setFullName(record.full_name);
        setCompany(record.company);
        setEmail(record.email ?? "");
        setRole(record.role ?? "");
        setLinkedinUrl(record.linkedin_url ?? "");
        setSource(record.source ?? "");
        setStage(record.stage);
        setValue(String(record.estimated_value_gbp || ""));
        setNextFollowUp(record.next_follow_up ?? "");
        setLastContactedAt(record.last_contacted_at);
        setNotes(record.notes ?? "");
      })
      .catch((error) => {
        setNotice(error instanceof Error ? error.message : "Prospect could not load.");
      });
  }, [hasProAccess, id, user]);

  async function save(options?: { markContacted?: boolean }) {
    if (!id || !fullName.trim() || !company.trim()) {
      setNotice("Name and company are required.");
      return;
    }
    setIsWorking(true);
    try {
      const contactedAt = options?.markContacted
        ? new Date().toISOString()
        : lastContactedAt;
      const updated = await updateProspect(id, {
        full_name: fullName,
        company,
        email,
        role,
        linkedin_url: linkedinUrl,
        source,
        stage: options?.markContacted && stage === "new" ? "contacted" : stage,
        estimated_value_gbp: Number(value) || 0,
        next_follow_up: nextFollowUp,
        last_contacted_at: contactedAt,
        notes,
      });
      setProspect(updated);
      setStage(updated.stage);
      setLastContactedAt(updated.last_contacted_at);
      setNotice(options?.markContacted ? "Contact logged and prospect updated." : "Prospect updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Prospect could not be updated.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleDelete() {
    if (!id || !window.confirm("Delete this prospect permanently?")) return;
    setIsWorking(true);
    try {
      await deleteProspect(id);
      router.push("/prospects");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Prospect could not be deleted.");
      setIsWorking(false);
    }
  }

  function handleDraftOutreach() {
    localStorage.setItem(
      "thalovo_prospect_context",
      JSON.stringify({ name: fullName, company, email, role, prospectId: id })
    );
    router.push("/library");
  }

  if (isLoading) {
    return <main className="main"><section className="container"><div className="glassCard emptyState">Loading prospect...</div></section></main>;
  }

  if (!user || !hasProAccess) {
    return (
      <main className="main"><section className="container"><div className="glassCard emptyState">
        <h1 className="pageTitle">Prospect access required</h1>
        <Link href={user ? "/pricing" : "/account"} className="button buttonPrimary">{user ? "View plans" : "Sign in"}</Link>
      </div></section></main>
    );
  }

  if (!prospect && notice) {
    return (
      <main className="main"><section className="container"><div className="glassCard emptyState">
        <h1 className="pageTitle">Prospect unavailable</h1><p className="muted">{notice}</p><Link href="/prospects" className="button buttonPrimary">Back to pipeline</Link>
      </div></section></main>
    );
  }

  return (
    <main className="main">
      <section className="container">
        <div className="prospectHeader">
          <div>
            <div className="badge">Prospect workspace</div>
            <h1 className="pageTitle" style={{ marginTop: 14 }}>{fullName || "Prospect"}</h1>
            <p className="muted" style={{ margin: "8px 0 0" }}>{company || "Loading company..."}</p>
          </div>
          <Link href="/prospects" className="button buttonSecondary">Back to pipeline</Link>
        </div>

        {notice ? <p className="notice">{notice}</p> : null}

        <div className="prospectDetailLayout">
          <section className="prospectDetailMain">
            <div className="prospectSectionHeader"><h2 className="cardTitle">Contact and company</h2></div>
            <div className="prospectFormGrid">
              <div className="formGroup"><label className="label">Name</label><input className="input" value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
              <div className="formGroup"><label className="label">Company</label><input className="input" value={company} onChange={(event) => setCompany(event.target.value)} /></div>
              <div className="formGroup"><label className="label">Work email</label><input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
              <div className="formGroup"><label className="label">Role</label><input className="input" value={role} onChange={(event) => setRole(event.target.value)} /></div>
              <div className="formGroup"><label className="label">LinkedIn URL</label><input className="input" type="url" value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} placeholder="https://linkedin.com/in/..." /></div>
              <div className="formGroup"><label className="label">Lead source</label><input className="input" value={source} onChange={(event) => setSource(event.target.value)} placeholder="Referral, LinkedIn, event..." /></div>
            </div>

            <div className="prospectSectionHeader"><h2 className="cardTitle">Qualification and follow-up</h2></div>
            <div className="prospectFormGrid">
              <div className="formGroup"><label className="label">Pipeline stage</label><select className="input" value={stage} onChange={(event) => setStage(event.target.value as ProspectStage)}>{PROSPECT_STAGES.map((option) => <option key={option} value={option}>{PROSPECT_STAGE_LABELS[option]}</option>)}</select></div>
              <div className="formGroup"><label className="label">Estimated value (GBP)</label><input className="input" type="number" min="0" value={value} onChange={(event) => setValue(event.target.value)} /></div>
              <div className="formGroup"><label className="label">Next follow-up</label><input className="input" type="date" value={nextFollowUp} onChange={(event) => setNextFollowUp(event.target.value)} /></div>
              <div className="formGroup"><label className="label">Last contacted</label><input className="input" value={lastContactedAt ? new Date(lastContactedAt).toLocaleString() : "Not contacted yet"} disabled /></div>
            </div>

            <div className="formGroup"><label className="label">Notes</label><textarea className="input" rows={9} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Decision criteria, pain points, context, objections, and next steps..." /></div>

            <div className="toolbar">
              <button className="button buttonPrimary" disabled={isWorking} onClick={() => void save()}>{isWorking ? "Saving..." : "Save prospect"}</button>
              <button className="button buttonSecondary" disabled={isWorking} onClick={() => void save({ markContacted: true })}>Log contact now</button>
              <button className="button buttonUtility" disabled={isWorking} onClick={() => void handleDelete()}>Delete prospect</button>
            </div>
          </section>

          <aside className="prospectActionPanel">
            <h2 className="cardTitle">Next action</h2>
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
              Move from account context into a relevant message, then return here to log the contact and schedule follow-up.
            </p>
            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              <button className="button buttonPrimary" onClick={handleDraftOutreach}>Draft outreach</button>
              {email ? <a className="button buttonSecondary" href={`mailto:${encodeURIComponent(email)}`}>Email {fullName || "prospect"}</a> : null}
              {linkedinUrl ? <a className="button buttonSecondary" href={linkedinUrl} target="_blank" rel="noreferrer">Open LinkedIn</a> : null}
            </div>
            <div className="prospectContextBlock">
              <span>Current stage</span><strong>{PROSPECT_STAGE_LABELS[stage]}</strong>
              <span>Next follow-up</span><strong>{nextFollowUp || "Not scheduled"}</strong>
              <span>Record owner</span><strong>{prospect?.owner_id === user.id ? "You" : "Teammate"}</strong>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
