import { useSyncExternalStore } from "react";

export type SavedEmail = {
  id: string;
  playbookId: string;
  templateId: string;
  templateLabel: string;
  subject: string;
  body: string;
  tags: string[];
  folder: string | null;
  isFavorite: boolean;
  createdAt: string;
};

export type CustomTemplate = {
  id: string;
  title: string;
  subject: string;
  body: string;
  sourcePlaybookId: string;
  sourceTemplateId: string;
  sequenceSteps?: CustomSequenceStep[];
  tags: string[];
  folder: string | null;
  isFavorite: boolean;
  createdAt: string;
};

export type CustomSequenceStep = {
  playbookId: string;
  playbookName: string;
  templateId: string;
  templateLabel: string;
  dayOffset: number;
};

const EMAILS_KEY = "thalovo_emails";
const LEGACY_EMAILS_KEY = "arcmail_emails";
const TEMPLATES_KEY = "thalovo_templates";
const LEGACY_TEMPLATES_KEY = "arcmail_templates";
const STORAGE_CHANGE_EVENT = "thalovo_storage_change";
const EMPTY_EMAILS: SavedEmail[] = [];
const EMPTY_TEMPLATES: CustomTemplate[] = [];
let cachedEmailsRaw: string | null = null;
let cachedEmailsSnapshot: SavedEmail[] = EMPTY_EMAILS;
let cachedTemplatesRaw: string | null = null;
let cachedTemplatesSnapshot: CustomTemplate[] = EMPTY_TEMPLATES;

function notifyStorageChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
}

function subscribeToStorageChange(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(STORAGE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(STORAGE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getStoredCollection<T>(key: string, legacyKey?: string): T[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(key);

  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!legacyKey) return [];

  const legacyRaw = localStorage.getItem(legacyKey);
  if (!legacyRaw) return [];

  try {
    const parsed = JSON.parse(legacyRaw) as T[];
    localStorage.setItem(key, JSON.stringify(parsed));
    return parsed;
  } catch {
    return [];
  }
}

function normalizeSavedEmail(email: SavedEmail): SavedEmail {
  return {
    ...email,
    tags: Array.isArray(email.tags) ? email.tags : [],
    folder: typeof email.folder === "string" ? email.folder : null,
    isFavorite: Boolean(email.isFavorite),
  };
}

function normalizeCustomTemplate(template: CustomTemplate): CustomTemplate {
  return {
    ...template,
    sequenceSteps: Array.isArray(template.sequenceSteps)
      ? template.sequenceSteps
          .map((step, index) => ({
            playbookId: String(step.playbookId || template.sourcePlaybookId || ""),
            playbookName: String(step.playbookName || "Message Library"),
            templateId: String(step.templateId || template.sourceTemplateId || ""),
            templateLabel: String(step.templateLabel || `Step ${index + 1}`),
            dayOffset: Number.isFinite(Number(step.dayOffset))
              ? Number(step.dayOffset)
              : index * 3,
          }))
          .filter((step) => step.playbookId && step.templateId)
      : undefined,
    tags: Array.isArray(template.tags) ? template.tags : [],
    folder: typeof template.folder === "string" ? template.folder : null,
    isFavorite: Boolean(template.isFavorite),
  };
}

/* ---------------- EMAILS ---------------- */

export function getEmails(): SavedEmail[] {
  return getStoredCollection<SavedEmail>(EMAILS_KEY, LEGACY_EMAILS_KEY).map(
    normalizeSavedEmail
  );
}

function getEmailsSnapshot() {
  if (typeof window === "undefined") return EMPTY_EMAILS;

  const raw =
    localStorage.getItem(EMAILS_KEY) ??
    localStorage.getItem(LEGACY_EMAILS_KEY) ??
    "";

  if (raw === cachedEmailsRaw) return cachedEmailsSnapshot;

  cachedEmailsRaw = raw;
  cachedEmailsSnapshot = getEmails();
  return cachedEmailsSnapshot;
}

export function saveEmail(email: SavedEmail) {
  const emails = getEmails();
  const normalized = normalizeSavedEmail(email);
  const updated = [normalized, ...emails.filter((item) => item.id !== email.id)];
  localStorage.setItem(EMAILS_KEY, JSON.stringify(updated));
  notifyStorageChange();
}

export function replaceEmails(emails: SavedEmail[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    EMAILS_KEY,
    JSON.stringify(emails.map(normalizeSavedEmail))
  );
  notifyStorageChange();
}

export function updateEmail(id: string, updates: Partial<SavedEmail>) {
  const emails = getEmails();
  const updated = emails.map((email) =>
    email.id === id ? normalizeSavedEmail({ ...email, ...updates }) : email
  );
  localStorage.setItem(EMAILS_KEY, JSON.stringify(updated));
  notifyStorageChange();
}

export function useEmails() {
  return useSyncExternalStore(
    subscribeToStorageChange,
    getEmailsSnapshot,
    () => EMPTY_EMAILS
  );
}

/* ---------------- CUSTOM PLAYBOOKS ---------------- */

export function getCustomTemplates(): CustomTemplate[] {
  return getStoredCollection<CustomTemplate>(
    TEMPLATES_KEY,
    LEGACY_TEMPLATES_KEY
  ).map(normalizeCustomTemplate);
}

function getCustomTemplatesSnapshot() {
  if (typeof window === "undefined") return EMPTY_TEMPLATES;

  const raw =
    localStorage.getItem(TEMPLATES_KEY) ??
    localStorage.getItem(LEGACY_TEMPLATES_KEY) ??
    "";

  if (raw === cachedTemplatesRaw) return cachedTemplatesSnapshot;

  cachedTemplatesRaw = raw;
  cachedTemplatesSnapshot = getCustomTemplates();
  return cachedTemplatesSnapshot;
}

export function saveCustomTemplate(template: CustomTemplate) {
  const templates = getCustomTemplates();
  const normalized = normalizeCustomTemplate(template);
  const updated = [
    normalized,
    ...templates.filter((item) => item.id !== template.id),
  ];
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
  notifyStorageChange();
}

export function replaceCustomTemplates(templates: CustomTemplate[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    TEMPLATES_KEY,
    JSON.stringify(templates.map(normalizeCustomTemplate))
  );
  notifyStorageChange();
}

export function updateCustomTemplate(
  id: string,
  updates: Partial<CustomTemplate>
) {
  const templates = getCustomTemplates();
  const updated = templates.map((template) =>
    template.id === id
      ? normalizeCustomTemplate({ ...template, ...updates })
      : template
  );
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
  notifyStorageChange();
}

export function useCustomTemplates() {
  return useSyncExternalStore(
    subscribeToStorageChange,
    getCustomTemplatesSnapshot,
    () => EMPTY_TEMPLATES
  );
}
