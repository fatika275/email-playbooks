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

export type ObjectionTone = "concise" | "consultative" | "low-pressure";

export const objectionToneLabels: Record<ObjectionTone, string> = {
  concise: "Concise",
  consultative: "Consultative",
  "low-pressure": "Low pressure",
};

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
  selectedCategory?: ObjectionCategory,
  tone: ObjectionTone = "consultative"
) {
  const category = selectedCategory || detectObjectionCategory(context.objection);
  const greeting = context.name ? `Hi ${context.name},` : "Hi,";
  const offer = context.offer || "what we discussed";
  const result = context.result || "the outcome you are working toward";
  const signoff = context.senderName
    ? `Best,\n${context.senderName}`
    : "Best,";

  const normalizedObjection = context.objection
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^["']|["']$/g, "");
  const shortObjection =
    normalizedObjection.length > 150
      ? `${normalizedObjection.slice(0, 147).trim()}...`
      : normalizedObjection;
  const acknowledgement = shortObjection
    ? `Thanks for explaining. I understand your concern: “${shortObjection}”`
    : "Thanks for explaining. I understand the concern.";

  const guidance: Record<
    ObjectionCategory,
    { reframe: string; question: string; exit: string }
  > = {
    price: {
      reframe: `The useful question is whether ${offer} can create enough value through ${result} to justify the investment.`,
      question: "Would a short breakdown of the scope and expected outcome help you judge that properly?",
      exit: "If the budget is not there, I completely understand and I will leave it with you.",
    },
    timing: {
      reframe: `I do not want to force ${offer} before it is relevant.`,
      question: "Is there a specific time that would be better for me to check back?",
      exit: "No pressure from me. I am happy to leave this until the timing is genuinely better.",
    },
    authority: {
      reframe: `I can make the internal conversation easier by summarising the approach and its expected impact on ${result}.`,
      question: "Would a short decision summary help you discuss it with the right person?",
      exit: "I am happy to step back until the right people are ready to look at it.",
    },
    existing: {
      reframe: `I would not suggest replacing something that already works. The question is whether there is still a gap around ${result}.`,
      question: `Would it be useful to see where ${offer} could complement your current setup?`,
      exit: "If your current setup already covers this well, there is no reason to change it.",
    },
    information: {
      reframe: `${offer} is designed to help with ${result}, and I can keep the explanation concise.`,
      question: "What is the main question you would like the overview to answer?",
      exit: "I can send the essentials and leave you to review them in your own time.",
    },
    trust: {
      reframe: `You should not have to take claims about ${result} at face value.`,
      question: "Would a relevant example and a clear explanation of the approach be useful?",
      exit: "I am happy to send proof and let you decide without any pressure.",
    },
    "not-interested": {
      reframe: "I appreciate you being direct, and I will not keep pushing the conversation.",
      question: "Would you prefer that I close this completely?",
      exit: `I will leave it there. If ${result} becomes relevant later, you are welcome to get in touch.`,
    },
    general: {
      reframe: `It sounds like the key question is whether ${offer} is the right fit for ${result}.`,
      question: "Would one short clarification help, or would you prefer I leave it here?",
      exit: "No pressure. I am happy to leave it with you.",
    },
  };

  const selectedGuidance = guidance[category];
  const reply =
    tone === "concise"
      ? `${acknowledgement}\n\n${selectedGuidance.question}`
      : tone === "low-pressure"
        ? `${acknowledgement}\n\n${selectedGuidance.exit}`
        : `${acknowledgement}\n\n${selectedGuidance.reframe}\n\n${selectedGuidance.question}`;

  return {
    category,
    subject: "Re: your message",
    body: `${greeting}\n\n${reply}\n\n${signoff}`,
  };
}
