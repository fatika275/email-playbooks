export type PlanId = "free" | "pro" | "founder";

export const PLAN_LABELS: Record<PlanId, string> = {
  free: "Free",
  pro: "Pro",
  founder: "Founder Pro",
};

export function normalizePlan(plan?: string | null): PlanId {
  if (plan === "pro" || plan === "founder") {
    return plan;
  }

  return "free";
}

export function hasProAccess(plan: PlanId, isAdmin = false) {
  return isAdmin || plan === "pro" || plan === "founder";
}

export function getStripePriceIdForPlan(plan: Exclude<PlanId, "free">) {
  const prices: Record<Exclude<PlanId, "free">, string | undefined> = {
    pro: process.env.STRIPE_PRO_PRICE_ID,
    founder: process.env.STRIPE_FOUNDER_PRICE_ID,
  };

  return prices[plan] || "";
}
