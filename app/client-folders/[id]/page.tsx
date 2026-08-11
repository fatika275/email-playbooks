"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "@/components/account-provider";
import PageLoadingState from "@/components/page-loading-state";
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

const fileKindFilterOptions = Object.entries(fileKindLabels).filter(
  ([value]) => value !== "sent-message"
);

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

function readAllProspectFiles() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(PROSPECT_FILES_KEY) || "[]"
    );
    return Array.isArray(parsed) ? (parsed as ProspectFileRecord[]) : [];
  } catch {
    return [];
  }
}

function writeProspectFiles(prospectId: string, files: ProspectFileRecord[]) {
  if (typeof window === "undefined") return;
  const otherFiles = readAllProspectFiles().filter(
    (file) => file.prospectId !== prospectId
  );
  window.localStorage.setItem(
    PROSPECT_FILES_KEY,
    JSON.stringify([...otherFiles, ...files])
  );
}

function isSentMessageActivity(activity: ProspectActivity) {
  const summary = activity.summary.toLowerCase();
  return (
    activity.activity_type === "email" &&
    !summary.includes("follow-up plan started") &&
    !summary.includes("plan started")
  );
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
  const [messageSearch, setMessageSearch] = useState("");
  const [fileSearch, setFileSearch] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [isFolderLoading, setIsFolderLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const sentMessages = useMemo(() => {
    const normalized = messageSearch.trim().toLowerCase();
    return activities
      .filter(isSentMessageActivity)
      .filter((activity) =>
        normalized
          ? [activity.summary, activity.actor_email ?? "", activity.created_at]
              .join(" ")
              .toLowerCase()
              .includes(normalized)
          : true
      );
  }, [activities, messageSearch]);

  const filteredFiles = useMemo(() => {
    const normalized = fileSearch.trim().toLowerCase();
    return files.filter((file) =>
      (fileTypeFilter === "all" || file.kind === fileTypeFilter) &&
      (normalized
        ? [file.title, file.kind, file.folder, file.note, file.url]
            .join(" ")
            .toLowerCase()
            .includes(normalized)
        : true)
    );
  }, [files, fileSearch, fileTypeFilter]);

  function handleRemoveFile(fileId: string) {
    if (!id) return;
    const nextFiles = files.filter((file) => file.id !== fileId);
    setFiles(nextFiles);
    writeProspectFiles(id, nextFiles);
    setNotice("Removed from this client folder.");
  }

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
      } finally {
        if (isMounted) setIsFolderLoading(false);
      }
    }

    void loadFolder();
    return () => {
      isMounted = false;
    };
  }, [id, user]);

  if (isLoading || (user && isFolderLoading)) {
    return (
      <PageLoadingState
        eyebrow="Saved"
        title="Loading client folder"
        detail="Opening saved messages, files, links, and folder access."
      />
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

  if (!prospect) {
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
          <div className="clientFolderHeaderActions">
            <Link href={`/client-folders/${prospect.id}/add`} className="button buttonPrimary">
              Add file or link
            </Link>
            <Link href={`/prospects/${prospect.id}`} className="button buttonSecondary">
              Open pipeline record
            </Link>
          </div>
        </div>

        {notice ? <p className="notice">{notice}</p> : null}

        <div className="clientFolderDetailGrid">
          <section className="clientFolderDetailPanel">
            <div className="clientFolderDetailPanelHeader">
              <h2>Sent messages</h2>
              <span>{sentMessages.length}</span>
            </div>
            <input
              className="input clientFolderSearch"
              value={messageSearch}
              onChange={(event) => setMessageSearch(event.target.value)}
              placeholder="Search sent messages"
              aria-label="Search sent messages"
            />
            <div className="clientFolderDetailList">
              {sentMessages.map((activity) => (
                <article key={activity.id}>
                  <strong>{activity.summary}</strong>
                  <p>{activity.actor_email || "Teammate"} - {new Date(activity.created_at).toLocaleString()}</p>
                </article>
              ))}
              {sentMessages.length === 0 ? (
                <p className="muted">{messageSearch.trim() ? "No sent messages match that search." : "No sent messages have been logged for this client yet."}</p>
              ) : null}
            </div>
          </section>

          <section className="clientFolderDetailPanel">
            <div className="clientFolderDetailPanelHeader">
              <h2>Files and links</h2>
              <span>{files.length}</span>
            </div>
            <div className="clientFolderFilters">
              <input
                className="input"
                value={fileSearch}
                onChange={(event) => setFileSearch(event.target.value)}
                placeholder="Search files and links"
                aria-label="Search files and links"
              />
              <select
                className="input"
                value={fileTypeFilter}
                onChange={(event) => setFileTypeFilter(event.target.value)}
                aria-label="Filter files and links by type"
              >
                <option value="all">All types</option>
                {fileKindFilterOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="clientFolderDetailList">
              {filteredFiles.map((file) => (
                <article key={file.id}>
                  <span className="miniBadge">{fileKindLabels[file.kind] || file.kind}</span>
                  <strong>{file.title}</strong>
                  <p>{file.folder} - added {new Date(file.createdAt).toLocaleDateString()}</p>
                  {file.note ? <p>{file.note}</p> : null}
                  <div className="clientFolderFileActions">
                    {file.url ? (
                      <a href={file.url} target="_blank" rel="noreferrer" className="button buttonSecondary">
                        Open
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="button buttonUtility"
                      onClick={() => handleRemoveFile(file.id)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
              {filteredFiles.length === 0 ? (
                <p className="muted">{fileSearch.trim() || fileTypeFilter !== "all" ? "No files or links match those filters." : "No files or links have been saved for this client yet."}</p>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
