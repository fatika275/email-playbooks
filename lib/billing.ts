export function getBillingLinks() {
  return {
    founder: process.env.NEXT_PUBLIC_STRIPE_FOUNDER_URL || "",
    pro: process.env.NEXT_PUBLIC_STRIPE_PRO_URL || "",
    proPlus: process.env.NEXT_PUBLIC_STRIPE_PRO_PLUS_URL || "",
    bookCall: process.env.NEXT_PUBLIC_BOOK_CALL_URL || "",
  };
}

export function getPlanHref(planUrl: string, fallback = "/account") {
  return planUrl || fallback;
}
