import type { Playbook } from "@/lib/data";
import { hasProAccess, type PlanId } from "@/lib/plans";

export const FREE_PLAYBOOK_IDS = [
  "cold-outreach-sequence",
  "follow-up-frameworks",
  "objection-handling",
];

export function isFreePlaybook(playbookId: string) {
  return FREE_PLAYBOOK_IDS.includes(playbookId);
}

export function canUseProFeatures(options: {
  user: unknown;
  founderEligible: boolean;
  isAdmin: boolean;
  plan: PlanId;
}) {
  return hasProAccess(options.plan, options.isAdmin);
}

export function getPlaybookAccess(playbook: Playbook, hasProAccess: boolean) {
  const isFree = isFreePlaybook(playbook.id);

  return {
    isFree,
    isLocked: !isFree && !hasProAccess,
    label: isFree ? "Free" : "Pro",
  };
}
