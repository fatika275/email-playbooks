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

function makeLocalFileId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `client-file-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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
  const [fileTitle, setFileTitle] = useState("");
  const [fileKind, setFileKind] = useState("proposal");
  const [fileUrl, setFileUrl] = useState("");
  const [fileFolder, setFileFolder] = useState("");
  const [fileNote, setFileNote] = useState("");
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
    if (!normalized) return files;
    return files.filter((file) =>
      [file.title, file.kind, file.folder, file.note, file.url]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [files, fileSearch]);

  function handleSaveFile() {
    if (!id || !fileTitle.trim()) {
      setNotice("Add a name for the file or link first.");
      return;
    }

    const nextFiles = [
      {
        id: makeLocalFileId(),
        prospectId: id,
        title: fileTitle.trim(),
        kind: fileKind,
        url: fileUrl.trim(),
        folder: fileFolder.trim() || "Client files",
        note: fileNote.trim(),
        createdAt: new Date().toISOString(),
      },
      ...files,
    ];

    setFiles(nextFiles);
    writeProspectFiles(id, nextFiles);
    setFileTitle("");
    setFileUrl("");
    setFileFolder("");
    setFileNote("");
    setNotice("Saved to this client folder.");
  }

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
            <div className="clientFolderSaveForm">
              <div className="formGroup">
                <label className="label">Name</label>
                <input
                  className="input"
                  value={fileTitle}
                  onChange={(event) => setFileTitle(event.target.value)}
                  placeholder="Proposal v2, Drive folder, signed brief..."
                />
              </div>
              <div className="formGroup">
                <label className="label">Type</label>
                <select
                  className="input"
                  value={fileKind}
                  onChange={(event) => setFileKind(event.target.value)}
                >
                  {Object.entries(fileKindLabels)
                    .filter(([value]) => value !== "sent-message")
                    .map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                </select>
              </div>
              <div className="formGroup">
                <label className="label">Link</label>
                <input
                  className="input"
                  type="url"
                  value={fileUrl}
                  onChange={(event) => setFileUrl(event.target.value)}
                  placeholder="Google Drive, Dropbox, Notion, proposal URL..."
                />
              </div>
              <div className="formGroup">
                <label className="label">Folder</label>
                <input
                  className="input"
                  value={fileFolder}
                  onChange={(event) => setFileFolder(event.target.value)}
                  placeholder="Proposal docs, briefs, handoff..."
                />
              </div>
              <div className="formGroup clientFolderSaveNote">
                <label className="label">Context</label>
                <textarea
                  className="input"
                  rows={3}
                  value={fileNote}
                  onChange={(event) => setFileNote(event.target.value)}
                  placeholder="What is this and what should the team know?"
                />
              </div>
              <button
                className="button buttonPrimary"
                type="button"
                disabled={!fileTitle.trim()}
                onClick={handleSaveFile}
              >
                Save file or link
              </button>
            </div>
            <input
              className="input clientFolderSearch"
              value={fileSearch}
              onChange={(event) => setFileSearch(event.target.value)}
              placeholder="Search files and links"
              aria-label="Search files and links"
            />
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
                <p className="muted">{fileSearch.trim() ? "No files or links match that search." : "No files or links have been saved for this client yet."}</p>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
