type ObjectionContext = {
  objection: string;
  name?: string;
  offer?: string;
  result?: string;
  senderName?: string;
};

export type ObjectionCategory =
  | "price"
  | "timing"
  | "authority"
  | "existing"
  | "information"
  | "trust"
  | "not-interested"
  | "general";

export const objectionCategoryLabels: Record<ObjectionCategory, string> = {
  price: "Price or budget",
  timing: "Bad timing",
  authority: "Needs approval",
  existing: "Already using someone",
  information: "Send more information",
  trust: "Needs proof or reassurance",
  "not-interested": "Not interested",
  general: "Something else",
};

export function detectObjectionCategory(objection: string): ObjectionCategory {
  const text = objection.toLowerCase();

  if (/price|pricing|cost|expensive|budget|afford/.test(text)) return "price";
  if (/later|timing|busy|quarter|month|not now|circle back/.test(text)) {
    return "timing";
  }
  if (/boss|manager|partner|team|approval|decision/.test(text)) return "authority";
  if (/already|provider|agency|supplier|in-house|internal/.test(text)) {
    return "existing";
  }
  if (/send|information|info|details|deck|overview/.test(text)) {
    return "information";
  }
  if (/proof|results|case stud|trust|worked with|example/.test(text)) return "trust";
  if (/not interested|no thanks|no thank|stop|remove me/.test(text)) {
    return "not-interested";
  }

  return "general";
}

export function buildObjectionReply(
  context: ObjectionContext,
  selectedCategory?: ObjectionCategory
) {
  const category = selectedCategory || detectObjectionCategory(context.objection);
  const greeting = context.name ? `Hi ${context.name},` : "Hi,";
  const offer = context.offer || "what we discussed";
  const result = context.result || "the outcome you are working toward";
  const signoff = context.senderName
    ? `Best,\n${context.senderName}`
    : "Best,";

  const replies: Record<ObjectionCategory, string> = {
    price: `That makes sense. Rather than forcing the numbers, it may be more useful to check whether ${offer} could create enough value through ${result} to justify the investment.\n\nWould it help if I sent a short breakdown of the scope and expected outcome so you can judge it properly?`,
    timing: `Completely understand. I do not want to add pressure if the timing is not right.\n\nWould it be sensible for me to check back at a specific time, or is there something that would need to change before ${offer} becomes relevant?`,
    authority: `Of course. I can make that conversation easier for you.\n\nWould a short summary covering the problem, the proposed approach, and the expected impact on ${result} help you discuss it internally?`,
    existing: `That makes sense, and I would not suggest changing something that is already working.\n\nThe useful question may be whether there is any gap in the current setup around ${result}. If there is, I can show you where ${offer} would fit without disrupting what you already have.`,
    information: `Absolutely. The short version is that ${offer} is designed to help with ${result}.\n\nI can send a concise overview with the approach, scope, and next step. Is there one question you would especially like it to answer?`,
    trust: `That is a fair question. You should not have to take the claim at face value.\n\nI can share a relevant example and explain exactly how we would approach ${result}, including what success would and would not look like. Would that be useful?`,
    "not-interested": `Thanks for being direct. I will leave it there and will not keep following up.\n\nIf improving ${result} becomes relevant later, you are welcome to get in touch.`,
    general: `Thanks for explaining. That makes sense.\n\nIt sounds like the main concern is whether ${offer} is the right fit for ${result}. Would it help to clarify that in one short reply, or would you prefer I leave it here?`,
  };

  return {
    category,
    subject: "Re: your message",
    body: `${greeting}\n\n${replies[category]}\n\n${signoff}`,
  };
}
