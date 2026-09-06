"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "@/components/account-provider";
import PageLoadingState from "@/components/page-loading-state";
import { saveClientFolderFile } from "@/lib/client-folder-files";
import {
  getProspect,
  PROSPECT_STAGE_LABELS,
  type Prospect,
} from "@/lib/prospects";

const fileKindLabels: Record<string, string> = {
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

function normalizeFileUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function AddClientFolderFilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useAccount();
  const id = useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [fileTitle, setFileTitle] = useState("");
  const [fileKind, setFileKind] = useState("proposal");
  const [fileUrl, setFileUrl] = useState("");
  const [fileFolder, setFileFolder] = useState("");
  const [fileNote, setFileNote] = useState("");
  const [isFolderLoading, setIsFolderLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    let isMounted = true;

    void getProspect(id)
      .then((record) => {
        if (!isMounted) return;
        setProspect(record);
      })
      .catch((error) => {
        if (!isMounted) return;
        setNotice(
          error instanceof Error ? error.message : "Client folder could not load."
        );
      })
      .finally(() => {
        if (isMounted) setIsFolderLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, user]);

  async function handleSaveFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !fileTitle.trim()) {
      setNotice("Add a name for the file or link first.");
      return;
    }

    setIsSaving(true);
    setNotice("");

    try {
      await saveClientFolderFile({
        id: makeLocalFileId(),
        prospectId: id,
        title: fileTitle.trim(),
        kind: fileKind,
        url: normalizeFileUrl(fileUrl),
        folder: fileFolder.trim() || "Client files",
        note: fileNote.trim(),
        createdAt: new Date().toISOString(),
      });
      router.push(`/client-folders/${id}`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not save this file or link."
      );
      setIsSaving(false);
    }
  }

  if (isLoading || (user && isFolderLoading)) {
    return (
      <PageLoadingState
        eyebrow="Saved"
        title="Loading client folder"
        detail="Preparing the folder before saving a file or link."
      />
    );
  }

  if (!user) {
    return (
      <main className="main">
        <section className="container">
          <div className="glassCard emptyState">
            <h1 className="pageTitle">Sign in to save files</h1>
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
            <Link href={`/client-folders/${prospect.id}`} className="small">
              Back to folder
            </Link>
            <h1 className="pageTitle">Add file or link</h1>
            <p className="muted">
              {prospect.company || prospect.full_name} - {PROSPECT_STAGE_LABELS[prospect.stage]}
            </p>
          </div>
        </div>

        {notice ? <p className="notice">{notice}</p> : null}

        <section className="clientFolderDetailPanel clientFolderAddPanel">
          <form className="clientFolderSaveForm" onSubmit={handleSaveFile}>
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
                {Object.entries(fileKindLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="formGroup">
              <label className="label">Link</label>
              <input
                className="input"
                type="text"
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
                rows={4}
                value={fileNote}
                onChange={(event) => setFileNote(event.target.value)}
                placeholder="What is this and what should the team know?"
              />
            </div>
            <div className="clientFolderFormActions">
              <button
                className="button buttonPrimary"
                type="submit"
                disabled={!fileTitle.trim() || isSaving}
              >
                {isSaving ? "Saving..." : "Save file or link"}
              </button>
              <Link href={`/client-folders/${prospect.id}`} className="button buttonSecondary">
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
