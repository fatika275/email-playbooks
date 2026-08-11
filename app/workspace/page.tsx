"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "@/components/account-provider";
import {
  type CustomTemplate,
  type SavedEmail,
  useCustomTemplates,
  useEmails,
} from "@/lib/storage";
import {
  listClientFolderShares,
  deleteCustomTemplateRecord,
  deleteEmailRecord,
  removeClientFolderShare,
  saveCustomTemplateRecord,
  saveEmailRecord,
  shareClientFolderWithTeammate,
  type ClientFolderShare,
  type ClientFolderShareAccess,
} from "@/lib/cloud";
import {
  PROSPECT_STAGE_LABELS,
  getProspect,
  listProspectActivitiesForProspects,
  listProspects,
  type Prospect,
  type ProspectActivity,
} from "@/lib/prospects";

const PROSPECT_FILES_KEY = "thalovo_prospect_files_v1";

type SavedView = "clients" | "followups";
type FollowUpKind = "email" | "sequence";

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

type FollowUpItem =
  | {
      id: string;
      kind: "email";
      title: string;
      subject: string;
      body: string;
      folder: string | null;
      isFavorite: boolean;
      createdAt: string;
      href: string;
      item: SavedEmail;
    }
  | {
      id: string;
      kind: "sequence";
      title: string;
      subject: string;
      body: string;
      folder: string | null;
      isFavorite: boolean;
      createdAt: string;
      href: string;
      item: CustomTemplate;
    };

function getPreview(text: string, maxLength = 120) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trim()}...`;
}

function readProspectFiles() {
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

export default function WorkspacePage() {
  const { user, businessMembership, syncVersion } = useAccount();
  const emails = useEmails();
  const templates = useCustomTemplates();
  const [view, setView] = useState<SavedView>("clients");
  const [clientQuery, setClientQuery] = useState("");
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [followUpKind, setFollowUpKind] = useState<"all" | FollowUpKind>("all");
  const [renameItemKey, setRenameItemKey] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [activities, setActivities] = useState<ProspectActivity[]>([]);
  const [files] = useState<ProspectFileRecord[]>(() => readProspectFiles());
  const [shares, setShares] = useState<ClientFolderShare[]>([]);
  const [shareProspectId, setShareProspectId] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareAccess, setShareAccess] = useState<ClientFolderShareAccess>("view");
  const [shareNotice, setShareNotice] = useState("");
  const [notice, setNotice] = useState("");

  const followUpItems = useMemo<FollowUpItem[]>(
    () => [
      ...emails.map((email) => ({
        id: email.id,
        kind: "email" as const,
        title: email.templateLabel,
        subject: email.subject,
        body: email.body,
        folder: email.folder,
        isFavorite: email.isFavorite,
        createdAt: email.createdAt,
        href: `/history/${email.id}`,
        item: email,
      })),
      ...templates.map((template) => ({
        id: template.id,
        kind: "sequence" as const,
        title: template.title,
        subject: template.subject,
        body: template.body,
        folder: template.folder,
        isFavorite: template.isFavorite,
        createdAt: template.createdAt,
        href: `/custom-templates/${template.id}`,
        item: template,
      })),
    ],
    [emails, templates]
  );

  const filteredFollowUps = useMemo(() => {
    const normalized = followUpQuery.trim().toLowerCase();
    return followUpItems
      .filter((item) => {
        const matchesKind = followUpKind === "all" || item.kind === followUpKind;
        const matchesQuery =
          normalized.length === 0 ||
          [item.title, item.subject, item.body, item.folder ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(normalized);
        return matchesKind && matchesQuery;
      })
      .sort((a, b) => {
        const favoriteOrder = Number(b.isFavorite) - Number(a.isFavorite);
        if (favoriteOrder !== 0) return favoriteOrder;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [followUpItems, followUpKind, followUpQuery]);

  const activitiesByProspect = useMemo(() => {
    const groups = new Map<string, ProspectActivity[]>();
    for (const activity of activities) {
      groups.set(activity.prospect_id, [
        ...(groups.get(activity.prospect_id) ?? []),
        activity,
      ]);
    }
    return groups;
  }, [activities]);

  const filesByProspect = useMemo(() => {
    const groups = new Map<string, ProspectFileRecord[]>();
    for (const file of files) {
      groups.set(file.prospectId, [...(groups.get(file.prospectId) ?? []), file]);
    }
    return groups;
  }, [files]);

  const sharesByProspect = useMemo(() => {
    const groups = new Map<string, ClientFolderShare[]>();
    for (const share of shares) {
      groups.set(share.prospect_id, [
        ...(groups.get(share.prospect_id) ?? []),
        share,
      ]);
    }
    return groups;
  }, [shares]);

  const filteredProspects = useMemo(() => {
    const normalized = clientQuery.trim().toLowerCase();
    return prospects.filter((prospect) => {
      if (!normalized) return true;
      const prospectActivities = activitiesByProspect.get(prospect.id) ?? [];
      const prospectFiles = filesByProspect.get(prospect.id) ?? [];
      return [
        prospect.full_name,
        prospect.company,
        prospect.email ?? "",
        prospect.service_type ?? "",
        prospect.notes ?? "",
        ...prospectActivities.map((activity) => activity.summary),
        ...prospectFiles.map((file) => `${file.title} ${file.folder} ${file.note}`),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [activitiesByProspect, clientQuery, filesByProspect, prospects]);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const workspaceId = businessMembership?.access_active
      ? businessMembership.workspace_id
      : null;

    async function loadClientFolders() {
      try {
        const [ownedProspects, nextShares] = await Promise.all([
          listProspects({
            userId: user!.id,
            workspaceId,
          }),
          listClientFolderShares(),
        ]);
        const sharedProspectIds = nextShares
          .filter((share) => share.owner_id !== user!.id)
          .map((share) => share.prospect_id);
        const sharedProspects = (
          await Promise.all(
            sharedProspectIds.map((prospectId) => getProspect(prospectId))
          )
        ).filter((prospect): prospect is Prospect => Boolean(prospect));
        const prospectById = new Map(
          [...ownedProspects, ...sharedProspects].map((prospect) => [
            prospect.id,
            prospect,
          ])
        );
        const nextProspects = Array.from(prospectById.values());
        if (!isMounted) return;
        setShares(nextShares);
        setProspects(nextProspects);
        const nextActivities = await listProspectActivitiesForProspects(
          nextProspects.map((prospect) => prospect.id)
        );
        if (!isMounted) return;
        setActivities(nextActivities);
      } catch (error) {
        if (!isMounted) return;
        setNotice(
          error instanceof Error ? error.message : "Client folders could not load."
        );
      }
    }

    void loadClientFolders();
    return () => {
      isMounted = false;
    };
  }, [businessMembership?.access_active, businessMembership?.workspace_id, syncVersion, user]);

  async function refreshClientFolderShares() {
    if (!user) return;
    try {
      const nextShares = await listClientFolderShares();
      setShares(nextShares);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Folder sharing could not refresh."
      );
    }
  }

  async function handleDeleteFollowUp(item: FollowUpItem) {
    if (!window.confirm(`Delete "${item.title}" from follow-up saved work?`)) {
      return;
    }

    try {
      if (item.kind === "email") {
        await deleteEmailRecord(item.id);
      } else {
        await deleteCustomTemplateRecord(item.id);
      }
      setNotice(`Deleted "${item.title}".`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not delete this item."
      );
    }
  }

  async function handleRenameFollowUp() {
    const item = followUpItems.find(
      (candidate) => `${candidate.kind}:${candidate.id}` === renameItemKey
    );
    const nextName = renameValue.trim();

    if (!item || !nextName) {
      setNotice("Choose a follow-up item and give it a clear name.");
      return;
    }

    try {
      if (item.kind === "email") {
        await saveEmailRecord({ ...item.item, templateLabel: nextName });
      } else {
        await saveCustomTemplateRecord({ ...item.item, title: nextName });
      }
      setRenameItemKey("");
      setRenameValue("");
      setNotice(`Renamed to "${nextName}".`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not rename this item."
      );
    }
  }

  async function handleShareClientFolder(prospect: Prospect) {
    const email = shareEmail.trim().toLowerCase();
    if (!email) {
      setShareNotice("Enter a teammate email before sharing the folder.");
      return;
    }

    try {
      await shareClientFolderWithTeammate({
        prospectId: prospect.id,
        recipientEmail: email,
        access: shareAccess,
      });
      await refreshClientFolderShares();
      setShareEmail("");
      setShareAccess("view");
      setShareNotice(`Shared ${prospect.company || prospect.full_name} folder with ${email}.`);
    } catch (error) {
      setShareNotice(
        error instanceof Error ? error.message : "Could not share this folder."
      );
    }
  }

  async function handleRemoveFolderAccess(shareId: string) {
    try {
      await removeClientFolderShare(shareId);
      await refreshClientFolderShares();
      setNotice("Folder access removed.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not remove folder access."
      );
    }
  }

  return (
    <main className="main">
      <section className="container">
        <div className="pageHeader savedSimpleHeader">
          <h1 className="pageTitle">Saved</h1>
        </div>

        <div className="savedViewTabs" role="tablist" aria-label="Saved work">
          <button
            type="button"
            role="tab"
            aria-selected={view === "clients"}
            className={view === "clients" ? "active" : ""}
            onClick={() => setView("clients")}
          >
            Client folders
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "followups"}
            className={view === "followups" ? "active" : ""}
            onClick={() => setView("followups")}
          >
            Follow-up plans
          </button>
        </div>

        {notice ? <p className="notice">{notice}</p> : null}

        {view === "clients" ? (
          <>
            <div className="savedToolbar savedToolbarSingle">
              <input
                className="input"
                type="search"
                value={clientQuery}
                onChange={(event) => setClientQuery(event.target.value)}
                placeholder="Search client folders"
                aria-label="Search client folders"
              />
            </div>

            {filteredProspects.length === 0 ? (
              <div className="glassCard emptyState">
                <h2 className="cardTitle">
                  {prospects.length ? "No client folders match that search" : "No client folders yet"}
                </h2>
              </div>
            ) : (
              <div className="clientFolderGrid">
                {filteredProspects.map((prospect) => {
                  const prospectActivities = activitiesByProspect.get(prospect.id) ?? [];
                  const sentMessages = prospectActivities.filter(
                    (activity) => activity.activity_type === "email"
                  );
                  const prospectFiles = filesByProspect.get(prospect.id) ?? [];
                  const prospectShares = sharesByProspect.get(prospect.id) ?? [];
                  const isSharing = shareProspectId === prospect.id;
                  const latestSent = sentMessages[0];

                  return (
                    <article key={prospect.id} className="clientFolderCard">
                      <div className="clientFolderTop">
                        <div>
                          <h2>{prospect.company || prospect.full_name}</h2>
                          <p>
                            {prospect.full_name}
                            {prospect.email ? ` - ${prospect.email}` : ""}
                          </p>
                        </div>
                        <span className="miniBadge">
                          {PROSPECT_STAGE_LABELS[prospect.stage]}
                        </span>
                      </div>

                      <div className="clientFolderStats">
                        <div>
                          <strong>{sentMessages.length}</strong>
                          <span>sent</span>
                        </div>
                        <div>
                          <strong>{prospectFiles.length}</strong>
                          <span>files</span>
                        </div>
                        <div>
                          <strong>{prospectShares.length}</strong>
                          <span>shared</span>
                        </div>
                      </div>

                      <div className="clientFolderList">
                        {latestSent ? (
                          <p>
                            <strong>Last sent:</strong> {latestSent.summary}
                          </p>
                        ) : (
                          <p>No sent messages logged yet.</p>
                        )}
                        {prospectFiles.slice(0, 2).map((file) => (
                          <p key={file.id}>
                            <strong>{file.folder}:</strong> {file.title}
                          </p>
                        ))}
                      </div>

                      {prospectShares.length ? (
                        <div className="clientFolderAccessList">
                          {prospectShares.map((share) => (
                            <span key={share.id}>
                              {share.recipient_email} - {share.access}
                              <button
                                type="button"
                                onClick={() => void handleRemoveFolderAccess(share.id)}
                              >
                                remove
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {isSharing ? (
                        <div className="clientFolderShareForm">
                          <input
                            className="input"
                            type="email"
                            value={shareEmail}
                            onChange={(event) => {
                              setShareEmail(event.target.value);
                              setShareNotice("");
                            }}
                            placeholder="teammate@agency.com"
                            aria-label="Teammate email"
                          />
                          <select
                            className="input"
                            value={shareAccess}
                            onChange={(event) =>
                              setShareAccess(event.target.value as ClientFolderShareAccess)
                            }
                            aria-label="Folder access"
                          >
                            <option value="view">View only</option>
                            <option value="edit">Can edit</option>
                          </select>
                          <button
                            type="button"
                            className="button buttonSecondary"
                            onClick={() => void handleShareClientFolder(prospect)}
                          >
                            Send folder
                          </button>
                          {shareNotice ? (
                            <p className="clientFolderShareNotice">{shareNotice}</p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="savedItemActions">
                        <Link href={`/client-folders/${prospect.id}`} className="clientFolderOpenAction">
                          Open folder
                        </Link>
                        <button
                          type="button"
                          className={isSharing ? "clientFolderShareToggle isOpen" : "clientFolderShareToggle"}
                          onClick={() => {
                            setShareProspectId(isSharing ? "" : prospect.id);
                            setShareEmail("");
                            setShareAccess("view");
                            setShareNotice("");
                          }}
                        >
                          {isSharing ? "Close sharing" : "Share folder"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="savedToolbar">
              <input
                className="input"
                type="search"
                value={followUpQuery}
                onChange={(event) => setFollowUpQuery(event.target.value)}
                placeholder="Search by name, subject, or content"
                aria-label="Search follow-up plans"
              />
              <select
                className="input"
                value={followUpKind}
                onChange={(event) =>
                  setFollowUpKind(event.target.value as "all" | FollowUpKind)
                }
                aria-label="Filter follow-up saved work"
              >
                <option value="all">All</option>
                <option value="email">Emails</option>
                <option value="sequence">Plans</option>
              </select>
            </div>

            {followUpItems.length > 0 ? (
              <div className="savedMoveBar">
                <select
                  className="input"
                  value={renameItemKey}
                  onChange={(event) => {
                    const key = event.target.value;
                    const item = followUpItems.find(
                      (candidate) => `${candidate.kind}:${candidate.id}` === key
                    );
                    setRenameItemKey(key);
                    setRenameValue(item?.title ?? "");
                  }}
                  aria-label="Follow-up item to rename"
                >
                  <option value="">Rename saved follow-up...</option>
                  {followUpItems.map((item) => (
                    <option key={`${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>
                      {item.kind === "email" ? "Email" : "Plan"}: {item.title}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  placeholder="Clear searchable name"
                  aria-label="New follow-up name"
                />
                <button
                  type="button"
                  className="button buttonSecondary"
                  onClick={() => void handleRenameFollowUp()}
                >
                  Rename
                </button>
              </div>
            ) : null}

            {filteredFollowUps.length === 0 ? (
              <div className="glassCard emptyState">
                <h2 className="cardTitle">
                  {followUpItems.length
                    ? "No follow-up saved work matches that search"
                    : "No follow-up plans saved yet"}
                </h2>
              </div>
            ) : (
              <div className="savedItemGrid">
                {filteredFollowUps.map((item) => (
                  <article key={`${item.kind}:${item.id}`} className="savedItemCard">
                    <Link href={item.href} className="savedItemMain">
                      <div className="cardTop">
                        <h3 className="cardTitle">{item.title}</h3>
                        <span className="miniBadge">
                          {item.kind === "email" ? "Email" : "Plan"}
                        </span>
                      </div>
                      <p className="templateMeta">Subject: {item.subject}</p>
                      <p className="muted">{getPreview(item.body)}</p>
                    </Link>
                    <div className="savedItemActions">
                      <Link href={item.href} className="button buttonSecondary">
                        Open
                      </Link>
                      <button
                        type="button"
                        className="button buttonUtility"
                        onClick={() => void handleDeleteFollowUp(item)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
