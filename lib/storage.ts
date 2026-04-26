export type SavedEmail = {
  id: string;
  playbookId: string;
  templateId: string;
  templateLabel: string;
  subject: string;
  body: string;
  createdAt: string;
};

export type CustomTemplate = {
  id: string;
  title: string;
  subject: string;
  body: string;
  sourcePlaybookId: string;
  sourceTemplateId: string;
  createdAt: string;
};

const EMAILS_KEY = "thalovo_emails";
const LEGACY_EMAILS_KEY = "arcmail_emails";
const TEMPLATES_KEY = "thalovo_templates";
const LEGACY_TEMPLATES_KEY = "arcmail_templates";

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

/* ---------------- EMAILS ---------------- */

export function getEmails(): SavedEmail[] {
  return getStoredCollection<SavedEmail>(EMAILS_KEY, LEGACY_EMAILS_KEY);
}

export function saveEmail(email: SavedEmail) {
  const emails = getEmails();
  const updated = [email, ...emails];
  localStorage.setItem(EMAILS_KEY, JSON.stringify(updated));
}

/* ---------------- CUSTOM PLAYBOOKS ---------------- */

export function getCustomTemplates(): CustomTemplate[] {
  return getStoredCollection<CustomTemplate>(
    TEMPLATES_KEY,
    LEGACY_TEMPLATES_KEY
  );
}

export function saveCustomTemplate(template: CustomTemplate) {
  const templates = getCustomTemplates();
  const updated = [template, ...templates];
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
}
