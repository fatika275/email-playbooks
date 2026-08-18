export type PlanId = "free" | "pro" | "founder" | "business";

export const PLAN_LABELS: Record<PlanId, string> = {
  free: "Free",
  pro: "Pro",
  founder: "Founder Pro",
  business: "Business Pro",
};

export function normalizePlan(plan?: string | null): PlanId {
  if (plan === "pro" || plan === "founder" || plan === "business") {
    return plan;
  }

  return "free";
}

export function hasProAccess(plan: PlanId, isAdmin = false) {
  return isAdmin || plan === "pro" || plan === "founder" || plan === "business";
}

export function getStripePriceIdForPlan(plan: Exclude<PlanId, "free">) {
  const prices: Record<Exclude<PlanId, "free">, string | undefined> = {
    pro: process.env.STRIPE_PRO_PRICE_ID,
    founder: process.env.STRIPE_FOUNDER_PRICE_ID,
    business: process.env.STRIPE_BUSINESS_PRICE_ID,
  };

  return prices[plan]?.trim() || "";
}
