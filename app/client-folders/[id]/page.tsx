"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "@/components/account-provider";
import {
  getProspect,
  listProspectActivities,
  PROSPECT_STAGE_LABELS,
  type Prospect,
  type ProspectActivity,
} from "@/lib/prospects";

const PROSPECT_FILES_KEY = "thalovo_prospect_files_v1";

type ProspectFileRecord = {
  id: string;
  prospectId: string;
  title: string;
  kind: string;
  url: string;
  folder: string;
  note: string;
  createdAt: string;
};

const fileKindLabels: Record<string, string> = {
  "sent-message": "Sent message",
  proposal: "Proposal",
  brief: "Brief",
  folder: "Client folder",
  contract: "Contract",
  asset: "Asset / file",
};

function readProspectFiles(prospectId: string) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(PROSPECT_FILES_KEY) || "[]"
    );
    return Array.isArray(parsed)
      ? (parsed as ProspectFileRecord[])
          .filter((file) => file.prospectId === prospectId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : [];
  } catch {
    return [];
  }
}

export default function ClientFolderPage() {
  const params = useParams();
  const { user, isLoading } = useAccount();
  const id = useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [activities, setActivities] = useState<ProspectActivity[]>([]);
  const [files, setFiles] = useState<ProspectFileRecord[]>([]);
  const [notice, setNotice] = useState("");

  const sentMessages = useMemo(
    () => activities.filter((activity) => activity.activity_type === "email"),
    [activities]
  );

  useEffect(() => {
    if (!id || !user) return;
    let isMounted = true;

    async function loadFolder() {
      try {
        const [nextProspect, nextActivities] = await Promise.all([
          getProspect(id!),
          listProspectActivities(id!),
        ]);
        if (!isMounted) return;
        setProspect(nextProspect);
        setActivities(nextActivities);
        setFiles(readProspectFiles(id!));
      } catch (error) {
        if (!isMounted) return;
        setNotice(
          error instanceof Error ? error.message : "Client folder could not load."
        );
      }
    }

    void loadFolder();
    return () => {
      isMounted = false;
    };
  }, [id, user]);

  if (isLoading) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <h1 className="pageTitle">Loading folder...</h1>
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <h1 className="pageTitle">Sign in to open this folder</h1>
            <Link href="/account" className="button buttonPrimary">
              Sign in
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (notice || !prospect) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <h1 className="pageTitle">Client folder not found</h1>
            <p className="muted">{notice || "This folder could not be opened."}</p>
            <Link href="/workspace" className="button buttonPrimary">
              Back to Saved
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="main">
      <section className="container">
        <div className="clientFolderDetailHeader">
          <div>
            <Link href="/workspace" className="small">
              Back to Saved
            </Link>
            <h1 className="pageTitle">{prospect.company || prospect.full_name}</h1>
            <p className="muted">
              {prospect.full_name} - {PROSPECT_STAGE_LABELS[prospect.stage]}
            </p>
          </div>
          <Link href={`/prospects/${prospect.id}`} className="button buttonSecondary">
            Open pipeline record
          </Link>
        </div>

        <div className="clientFolderDetailGrid">
          <section className="clientFolderDetailPanel">
            <div className="clientFolderDetailPanelHeader">
              <h2>Sent messages</h2>
              <span>{sentMessages.length}</span>
            </div>
            <div className="clientFolderDetailList">
              {sentMessages.map((activity) => (
                <article key={activity.id}>
                  <strong>{activity.summary}</strong>
                  <p>{activity.actor_email || "Teammate"} - {new Date(activity.created_at).toLocaleString()}</p>
                </article>
              ))}
              {sentMessages.length === 0 ? (
                <p className="muted">No sent messages have been logged for this client yet.</p>
              ) : null}
            </div>
          </section>

          <section className="clientFolderDetailPanel">
            <div className="clientFolderDetailPanelHeader">
              <h2>Files and links</h2>
              <span>{files.length}</span>
            </div>
            <div className="clientFolderDetailList">
              {files.map((file) => (
                <article key={file.id}>
                  <span className="miniBadge">{fileKindLabels[file.kind] || file.kind}</span>
                  <strong>{file.title}</strong>
                  <p>{file.folder} - added {new Date(file.createdAt).toLocaleDateString()}</p>
                  {file.note ? <p>{file.note}</p> : null}
                  {file.url ? (
                    <a href={file.url} target="_blank" rel="noreferrer" className="button buttonSecondary">
                      Open
                    </a>
                  ) : null}
                </article>
              ))}
              {files.length === 0 ? (
                <p className="muted">No files or links have been saved for this client yet.</p>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
