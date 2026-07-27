export type Template = {
  id: string;
  label: string;
  subject: string;
  body: string;
  variables: string[];
  whenToUse: string;
  whyItWorks: string;
  goal: string;
  nextStep: string;
  expectedOutcome: string;
  psychology: string;
  subjectLineLogic: string;
  keySentenceBreakdown: {
    sentence: string;
    explanation: string;
  }[];
  commonMistakes: string[];
};

export type Playbook = {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  audience: string;
  badge: string;
  templates: Template[];
};

export const playbooks: Playbook[] = [
  {
    id: "cold-outreach-sequence",
    name: "Agency Cold Outreach Follow-up Plan",
    shortDescription: "Get clients through cold outreach.",
    description:
      "A structured cold outreach system for agencies and founders to start conversations, follow up with intent, and move cold leads toward replies.",
    audience: "Agencies & Founders",
    badge: "Client Acquisition",
    templates: [
      {
        id: "day-1-intro",
        label: "Introduction (Day 1)",
        subject: "Quick idea for {{company}}",
        variables: ["name", "company", "service", "result", "yourName"],
        body: `Hi {{name}},

I came across {{company}} and thought there may be an opportunity to improve {{result}}.

We help businesses with {{service}} and usually focus on outcomes like {{result}}.

Would you be open to a quick conversation?

Best,
{{yourName}}`,
        whenToUse:
          "Use this as the first email in a cold outreach follow-up plan when you want to open a conversation without over-explaining.",
        whyItWorks:
          "It leads with relevance and outcome instead of making the whole email about you.",
        goal: "Start a conversation with a relevant prospect.",
        nextStep: "Wait a few days, then send a light follow-up if there is no reply.",
        expectedOutcome: "A reply, a question, or a signal of interest.",
        psychology:
          "People respond better when they feel understood quickly. This email works because it is short, relevant, and focused on their outcome.",
        subjectLineLogic:
          "The subject uses specificity plus light curiosity. It sounds direct without sounding aggressive.",
        keySentenceBreakdown: [
          {
            sentence:
              "I came across {{company}} and thought there may be an opportunity to improve {{result}}.",
            explanation:
              "This creates relevance immediately and gives the email a real reason to exist.",
          },
          {
            sentence:
              "We help businesses with {{service}} and usually focus on outcomes like {{result}}.",
            explanation:
              "This frames your offer around the result they care about, not just your activity.",
          },
          {
            sentence: "Would you be open to a quick conversation?",
            explanation:
              "The ask is small and easy to respond to.",
          },
        ],
        commonMistakes: [
          "Making the first email too long.",
          "Talking too much about your background.",
          "Using a vague result that means nothing to the prospect.",
          "Trying to close too early.",
        ],
      },
      {
        id: "day-3-follow-up",
        label: "Follow Up (Day 3)",
        subject: "Following up on my last note",
        variables: ["name", "yourName"],
        body: `Hi {{name}},

Just following up in case my last email got buried.

Would it be worth a quick conversation?

Best,
{{yourName}}`,
        whenToUse:
          "Use this a few days after the first email if there has been no response.",
        whyItWorks:
          "It is short, respectful, and easy to answer without pressure.",
        goal: "Get a reply from a prospect who has not answered yet.",
        nextStep: "Wait a few more days, then send a value-add follow-up.",
        expectedOutcome: "A reply or a simple yes/no signal.",
        psychology:
          "A good follow-up reduces friction. This one gives them an easy reason for silence and an easy path to respond.",
        subjectLineLogic:
          "It feels natural in a thread and does not create unnecessary pressure.",
        keySentenceBreakdown: [
          {
            sentence: "Just following up in case my last email got buried.",
            explanation:
              "This gives them social permission to have missed it without feeling blamed.",
          },
          {
            sentence: "Would it be worth a quick conversation?",
            explanation:
              "This keeps the ask light and easy to accept or decline.",
          },
        ],
        commonMistakes: [
          "Sounding annoyed.",
          "Repeating the first email exactly.",
          "Adding too much new information.",
          "Writing a longer follow-up than the original email.",
        ],
      },
      {
        id: "day-7-value",
        label: "Value Add (Day 7)",
        subject: "Quick idea for {{company}}",
        variables: ["name", "company", "idea", "yourName"],
        body: `Hi {{name}},

Had a quick idea for {{company}}:

{{idea}}

Thought it might be useful.

Best,
{{yourName}}`,
        whenToUse:
          "Use this after earlier messages were ignored and you want to add something genuinely useful.",
        whyItWorks:
          "It changes the dynamic from asking for attention to offering something relevant.",
        goal: "Restart the conversation by adding value.",
        nextStep: "If there is still no reply, send a final close-the-loop email.",
        expectedOutcome: "Renewed attention or a reply.",
        psychology:
          "People are more receptive when the message gives before it asks. A useful idea lowers resistance.",
        subjectLineLogic:
          "The subject stays practical and relevant instead of sounding like another follow-up nudge.",
        keySentenceBreakdown: [
          {
            sentence: "Had a quick idea for {{company}}:",
            explanation:
              "This frames the email as helpful and specific.",
          },
          {
            sentence: "{{idea}}",
            explanation:
              "This is the core value. It should be concrete, not vague.",
          },
        ],
        commonMistakes: [
          "Sharing a generic idea.",
          "Turning the value-add into a disguised pitch.",
          "Making it too long.",
          "Using jargon instead of plain language.",
        ],
      },
      {
        id: "day-10-breakup",
        label: "Close The Loop (Day 10)",
        subject: "Should I close this?",
        variables: ["name", "yourName"],
        body: `Hi {{name}},

I haven’t heard back, so I’ll assume this is not a priority right now.

Happy to reconnect later if it becomes relevant.

Best,
{{yourName}}`,
        whenToUse:
          "Use this as the final step when the earlier messages have not been answered.",
        whyItWorks:
          "It creates closure without sounding bitter, which often prompts a final reply.",
        goal: "Get a final signal or close the loop cleanly.",
        nextStep: "Move on for now and revisit later only if it becomes relevant again.",
        expectedOutcome: "A final reply or a clean ending.",
        psychology:
          "Finality creates response more often than endless chasing. It restores control to the prospect.",
        subjectLineLogic:
          "The subject line creates a simple decision point and signals the thread is nearing an end.",
        keySentenceBreakdown: [
          {
            sentence: "I’ll assume this is not a priority right now.",
            explanation:
              "This creates closure without blame.",
          },
          {
            sentence: "Happy to reconnect later if it becomes relevant.",
            explanation:
              "This keeps the relationship positive for future timing.",
          },
        ],
        commonMistakes: [
          "Sounding passive-aggressive.",
          "Using guilt to force a reply.",
          "Sending too many follow-ups before this step.",
          "Closing too early.",
        ],
      },
    ],
  },

  {
    id: "follow-up-frameworks",
    name: "Agency Follow-Up Frameworks",
    shortDescription: "Reusable follow-up structures for stalled conversations.",
    description:
      "A library of follow-up frameworks for agencies and founders who need better ways to restart, nudge, and progress conversations.",
    audience: "Agencies & Founders",
    badge: "Follow-Up",
    templates: [
      {
        id: "gentle-nudge",
        label: "Gentle Nudge",
        subject: "Just circling back",
        variables: ["name", "yourName"],
        body: `Hi {{name}},

Just wanted to quickly circle back on my last message.

Let me know if this is worth exploring.

Best,
{{yourName}}`,
        whenToUse:
          "Use this when a conversation has gone quiet and you want a light touch rather than a hard push.",
        whyItWorks:
          "It is simple, polite, and easy to respond to.",
        goal: "Bring the conversation back without creating pressure.",
        nextStep: "If there is still no reply, try a more value-based follow-up.",
        expectedOutcome: "A short reply or a signal of interest.",
        psychology:
          "Lower-pressure follow-ups work because they reduce the emotional effort needed to answer.",
        subjectLineLogic:
          "The subject line is familiar and low-friction, which suits a gentle nudge.",
        keySentenceBreakdown: [
          {
            sentence: "Just wanted to quickly circle back on my last message.",
            explanation:
              "This acts as a soft reminder without tension.",
          },
          {
            sentence: "Let me know if this is worth exploring.",
            explanation:
              "This gives them a very easy response option.",
          },
        ],
        commonMistakes: [
          "Making it too long.",
          "Adding too much new information.",
          "Sounding frustrated.",
          "Using clever wording instead of clear wording.",
        ],
      },
      {
        id: "value-reminder",
        label: "Value Reminder",
        subject: "One quick thought for {{company}}",
        variables: ["name", "company", "value", "yourName"],
        body: `Hi {{name}},

One quick thought for {{company}}: {{value}}

Thought it might be useful to share.

Best,
{{yourName}}`,
        whenToUse:
          "Use this when you want to re-engage a prospect by sharing something useful rather than repeating your ask.",
        whyItWorks:
          "It makes the email feel relevant again instead of repetitive.",
        goal: "Restart attention through a useful insight.",
        nextStep: "If there is still no reply, try a direct next-step message.",
        expectedOutcome: "A response because the message feels more useful than salesy.",
        psychology:
          "Practical usefulness earns attention better than repeated nudging.",
        subjectLineLogic:
          "The subject line promises one concise thing worth opening.",
        keySentenceBreakdown: [
          {
            sentence: "One quick thought for {{company}}: {{value}}",
            explanation:
              "This delivers the relevance immediately and keeps the email skimmable.",
          },
        ],
        commonMistakes: [
          "Sharing vague advice.",
          "Turning the insight into a disguised pitch.",
          "Making the idea too broad.",
          "Overloading the email with detail.",
        ],
      },
      {
        id: "next-step-check",
        label: "Next Step Check",
        subject: "Next steps?",
        variables: ["name", "yourName"],
        body: `Hi {{name}},

Wanted to check if you'd like to move this forward.

Let me know what makes sense on your side.

Best,
{{yourName}}`,
        whenToUse:
          "Use this when the conversation feels live but has stalled around decision-making.",
        whyItWorks:
          "It introduces a clear commercial decision point without sounding aggressive.",
        goal: "Get clarity on whether the conversation is moving forward.",
        nextStep: "If needed, send a final close-the-loop email later.",
        expectedOutcome: "A clearer yes, no, or next step.",
        psychology:
          "Decision-oriented language shifts the conversation from passive silence to active choice.",
        subjectLineLogic:
          "The subject is concise and practical, which suits a later-stage thread.",
        keySentenceBreakdown: [
          {
            sentence: "Wanted to check if you'd like to move this forward.",
            explanation:
              "This creates a clear progression point in the conversation.",
          },
          {
            sentence: "Let me know what makes sense on your side.",
            explanation:
              "This keeps the tone collaborative instead of forceful.",
          },
        ],
        commonMistakes: [
          "Using this too early.",
          "Adding extra justification.",
          "Making it sound transactional too soon.",
          "Skipping earlier value-based nudges.",
        ],
      },
      {
        id: "final-follow-up",
        label: "Final Follow Up",
        subject: "Should I close this out?",
        variables: ["name", "yourName"],
        body: `Hi {{name}},

I haven’t heard back, so I’ll assume this is not a priority right now.

Happy to reconnect if that changes.

Best,
{{yourName}}`,
        whenToUse:
          "Use this when you want to end the follow-up cycle cleanly and professionally.",
        whyItWorks:
          "It introduces finality without blame, which often draws out a response.",
        goal: "Get a final signal or close the loop.",
        nextStep: "Pause outreach unless there is a clear reason to revisit later.",
        expectedOutcome: "A final answer or a clean ending.",
        psychology:
          "Closing the loop lowers the emotional cost of replying and creates a natural last decision point.",
        subjectLineLogic:
          "The subject line sounds like a simple yes-or-no decision rather than another push.",
        keySentenceBreakdown: [
          {
            sentence: "I’ll assume this is not a priority right now.",
            explanation:
              "This creates closure while remaining respectful.",
          },
        ],
        commonMistakes: [
          "Sounding bitter.",
          "Using it too early.",
          "Adding another pitch at the end.",
          "Making the final message too long.",
        ],
      },
    ],
  },

  {
    id: "objection-handling-replies",
    name: "Agency Objection Handling Replies",
    shortDescription: "Reply frameworks for common client objections.",
    description:
      "A set of practical replies for handling pushback on pricing, timing, competitors, and information requests without sounding defensive.",
    audience: "Agencies & Founders",
    badge: "Objections",
    templates: [
      {
        id: "too-expensive",
        label: "Too Expensive",
        subject: "Re: pricing",
        variables: ["name", "result", "yourName"],
        body: `Hi {{name}},

Totally understand.

Most of our clients felt the same initially, but the main value comes from results like {{result}}, which usually outweigh the cost over time.

Happy to walk through it if helpful.

Best,
{{yourName}}`,
        whenToUse:
          "Use this when a prospect says your service feels too expensive.",
        whyItWorks:
          "It acknowledges the objection and reframes the conversation around value rather than reacting defensively.",
        goal: "Keep the conversation alive after pricing pushback.",
        nextStep: "If they stay engaged, clarify value or invite a short discussion.",
        expectedOutcome: "Continued interest or a more useful pricing conversation.",
        psychology:
          "Validating first lowers resistance. Reframing around outcomes is stronger than arguing about cost.",
        subjectLineLogic:
          "In an objection thread, a simple reply subject is usually best.",
        keySentenceBreakdown: [
          {
            sentence: "Totally understand.",
            explanation:
              "This reduces defensiveness immediately.",
          },
          {
            sentence:
              "The main value comes from results like {{result}}, which usually outweigh the cost over time.",
            explanation:
              "This re-anchors the discussion around business outcomes.",
          },
        ],
        commonMistakes: [
          "Getting defensive.",
          "Discounting too quickly.",
          "Talking features instead of outcomes.",
          "Ignoring budget reality entirely.",
        ],
      },
      {
        id: "not-right-time",
        label: "Not The Right Time",
        subject: "Re: timing",
        variables: ["name", "yourName"],
        body: `Hi {{name}},

Completely understand.

Timing matters, so happy to reconnect when it makes more sense on your side.

If helpful, I can check back in later.

Best,
{{yourName}}`,
        whenToUse:
          "Use this when someone says the timing is not right.",
        whyItWorks:
          "It respects their reality instead of forcing urgency and keeps the relationship open.",
        goal: "Preserve the opportunity for a better time.",
        nextStep: "Re-engage later with a timing-based check-in.",
        expectedOutcome: "A warmer future conversation rather than a hard no.",
        psychology:
          "Respecting timing builds trust. Pushing against timing usually destroys future opportunity.",
        subjectLineLogic:
          "A simple reply subject works because the thread context is already there.",
        keySentenceBreakdown: [
          {
            sentence: "Timing matters, so happy to reconnect when it makes more sense on your side.",
            explanation:
              "This validates their position and removes pressure.",
          },
        ],
        commonMistakes: [
          "Trying to manufacture urgency.",
          "Ignoring the timing objection.",
          "Not setting up a later reconnect.",
          "Sounding impatient.",
        ],
      },
      {
        id: "already-working-with-someone",
        label: "Already Working With Someone",
        subject: "Makes sense",
        variables: ["name", "difference", "yourName"],
        body: `Hi {{name}},

Makes sense.

A lot of teams we speak to are already working with someone, and the main difference they usually care about is {{difference}}.

Happy to share more if useful.

Best,
{{yourName}}`,
        whenToUse:
          "Use this when the prospect already has an agency, provider, or internal option in place.",
        whyItWorks:
          "It validates their situation and introduces differentiation without sounding combative.",
        goal: "Create curiosity about your difference.",
        nextStep: "If they engage, explain the difference more clearly or suggest a quick comparison conversation.",
        expectedOutcome: "A chance to reopen evaluation instead of being dismissed.",
        psychology:
          "People resist being told their current choice is wrong. A better angle is introducing a relevant distinction.",
        subjectLineLogic:
          "The subject line is calm and non-threatening, which suits this type of objection.",
        keySentenceBreakdown: [
          {
            sentence:
              "The main difference they usually care about is {{difference}}.",
            explanation:
              "This focuses the conversation on one meaningful angle rather than a list of claims.",
          },
        ],
        commonMistakes: [
          "Attacking the competitor.",
          "Listing too many differences.",
          "Trying to force an immediate switch.",
          "Sounding dismissive of their current setup.",
        ],
      },
      {
        id: "send-more-info",
        label: "Send More Info",
        subject: "A quick overview",
        variables: ["name", "summary", "yourName"],
        body: `Hi {{name}},

Absolutely — here is a quick overview:

{{summary}}

Happy to answer any questions if helpful.

Best,
{{yourName}}`,
        whenToUse:
          "Use this when the prospect wants more information before deciding on a next step.",
        whyItWorks:
          "It gives them something useful without overwhelming them.",
        goal: "Provide clarity while keeping the conversation alive.",
        nextStep: "Follow up later and ask if they would like to discuss it live.",
        expectedOutcome: "More informed interest or a next-step question.",
        psychology:
          "Matching their pace reduces friction. People are more likely to engage when they feel in control of the process.",
        subjectLineLogic:
          "The subject promises something short and digestible.",
        keySentenceBreakdown: [
          {
            sentence: "Absolutely — here is a quick overview:",
            explanation:
              "This is responsive and sets the expectation of brevity.",
          },
        ],
        commonMistakes: [
          "Sending too much information.",
          "Using jargon.",
          "Making the summary hard to skim.",
          "Not following up after sending it.",
        ],
      },
    ],
  },

  {
    id: "re-engagement-emails",
    name: "Agency Re-Engagement Emails",
    shortDescription: "Restart conversations that went cold.",
    description:
      "A playbook for reviving old leads, reconnecting after timing issues, and reopening conversations that have gone quiet.",
    audience: "Agencies & Founders",
    badge: "Re-Engagement",
    templates: [
      {
        id: "old-lead-restart",
        label: "Restart Old Conversation",
        subject: "Worth revisiting?",
        variables: ["name", "company", "yourName"],
        body: `Hi {{name}},

Wanted to reach back out in case this has become more relevant for {{company}}.

Happy to reconnect if it’s worth revisiting.

Best,
{{yourName}}`,
        whenToUse:
          "Use this when a previous prospect went quiet and enough time has passed that priorities may have changed.",
        whyItWorks:
          "It reopens the conversation without guilt, pressure, or pretending nothing happened.",
        goal: "Restart an old conversation cleanly.",
        nextStep: "If they reply, move them into the relevant follow-up plan from there.",
        expectedOutcome: "Renewed interest or a clear answer.",
        psychology:
          "People are more willing to re-engage when silence is framed as changed timing rather than rejection.",
        subjectLineLogic:
          "The subject line is short, low-pressure, and easy to engage with mentally.",
        keySentenceBreakdown: [
          {
            sentence:
              "Wanted to reach back out in case this has become more relevant for {{company}}.",
            explanation:
              "This makes the timing, not the silence, the main variable.",
          },
        ],
        commonMistakes: [
          "Complaining about being ignored.",
          "Using the exact same pitch as before.",
          "Ignoring changed context.",
          "Asking for too much too quickly.",
        ],
      },
      {
        id: "timing-check-in",
        label: "Timing Check-In",
        subject: "Checking back in",
        variables: ["name", "yourName"],
        body: `Hi {{name}},

You mentioned timing was not right before, so I wanted to check back in.

Let me know if now is a better time to revisit this.

Best,
{{yourName}}`,
        whenToUse:
          "Use this when someone previously said not now or asked you to reconnect later.",
        whyItWorks:
          "It shows memory and patience, which makes the follow-up feel intentional rather than random.",
        goal: "See whether the timing window has changed.",
        nextStep: "If they reply, move toward a next-step conversation.",
        expectedOutcome: "A clear timing answer or a reopened conversation.",
        psychology:
          "Referencing prior timing makes the message feel personal and relevant rather than generic.",
        subjectLineLogic:
          "The subject stays neutral and low-friction for a timing-based re-entry.",
        keySentenceBreakdown: [
          {
            sentence: "You mentioned timing was not right before.",
            explanation:
              "This shows you actually listened and are not just blasting follow-ups.",
          },
        ],
        commonMistakes: [
          "Following up too soon.",
          "Ignoring the original reason for delay.",
          "Adding a big pitch.",
          "Sounding impatient.",
        ],
      },
      {
        id: "last-chance-reconnect",
        label: "Last Reconnect Attempt",
        subject: "Should I stop following up?",
        variables: ["name", "yourName"],
        body: `Hi {{name}},

I did not want to keep chasing this if it is no longer relevant.

If it still makes sense to reconnect, I’m happy to do that. Otherwise I’ll close this out here.

Best,
{{yourName}}`,
        whenToUse:
          "Use this as a final re-engagement attempt when previous check-ins have gone unanswered.",
        whyItWorks:
          "It gives closure while still leaving the door open.",
        goal: "Get a final signal on whether to continue.",
        nextStep: "If there is no reply, archive the opportunity and move on.",
        expectedOutcome: "A final answer or a clean close.",
        psychology:
          "Finality can draw out a response because the other person feels the thread is about to disappear.",
        subjectLineLogic:
          "The subject line invites a simple decision rather than a big commitment.",
        keySentenceBreakdown: [
          {
            sentence:
              "I did not want to keep chasing this if it is no longer relevant.",
            explanation:
              "This frames closure as respectful rather than passive-aggressive.",
          },
        ],
        commonMistakes: [
          "Sounding bitter.",
          "Using this too early.",
          "Adding a full pitch at the end.",
          "Not actually moving on if there is still no reply.",
        ],
      },
    ],
  },

  {
    id: "proposal-follow-up",
    name: "Proposal Follow-Up",
    shortDescription: "Keep deals moving after sending a proposal.",
    description:
      "A practical library for checking in on proposals, surfacing objections, and moving opportunities toward a decision.",
    audience: "Agencies & Founders",
    badge: "Proposal",
    templates: [
      {
        id: "proposal-check-in",
        label: "Proposal Check-In",
        subject: "Any thoughts?",
        variables: ["name", "yourName"],
        body: `Hi {{name}},

Just checking if you had any thoughts on the proposal.

Happy to answer any questions.

Best,
{{yourName}}`,
        whenToUse:
          "Use this after giving the recipient time to review a proposal or scope.",
        whyItWorks:
          "It invites feedback without pressuring them into a decision too early.",
        goal: "Restart the proposal conversation.",
        nextStep: "If needed, follow up later with a more direct next-step message.",
        expectedOutcome: "Questions, feedback, or movement toward a decision.",
        psychology:
          "A softer check-in works better early because silence after a proposal often means uncertainty, not rejection.",
        subjectLineLogic:
          "A short subject line works well because the thread already contains context.",
        keySentenceBreakdown: [
          {
            sentence: "Just checking if you had any thoughts on the proposal.",
            explanation:
              "This opens a feedback loop without pushing for commitment immediately.",
          },
        ],
        commonMistakes: [
          "Following up too quickly.",
          "Jumping straight to asking them to sign.",
          "Ignoring likely objections.",
          "Sounding impatient.",
        ],
      },
      {
        id: "proposal-next-steps",
        label: "Proposal Next Steps",
        subject: "Next steps?",
        variables: ["name", "yourName"],
        body: `Hi {{name}},

Wanted to follow up and see if you'd like to move forward.

Let me know what works on your side.

Best,
{{yourName}}`,
        whenToUse:
          "Use this when the proposal has had time to sit and you want clarity on direction.",
        whyItWorks:
          "It moves the thread from passive review into an active next-step decision.",
        goal: "Get a decision or clearer direction.",
        nextStep: "If there is still no movement, close the loop or revisit later.",
        expectedOutcome: "A decision, a next meeting, or a clearer status update.",
        psychology:
          "At later stages, conversations need a clear progression point rather than more passive reminders.",
        subjectLineLogic:
          "The subject is direct and suits a deal-stage conversation.",
        keySentenceBreakdown: [
          {
            sentence: "See if you'd like to move forward.",
            explanation:
              "This introduces the commercial decision point cleanly.",
          },
        ],
        commonMistakes: [
          "Using it too early.",
          "Skipping softer check-ins first.",
          "Combining multiple asks.",
          "Not understanding the real blocker.",
        ],
      },
      {
        id: "proposal-close-loop",
        label: "Proposal Close the Loop",
        subject: "Should I close this out?",
        variables: ["name", "yourName"],
        body: `Hi {{name}},

I wanted to close the loop on the proposal.

Would it be most helpful to move forward, revisit this later, or leave it here for now?

Either way is completely fine - a quick reply will help me plan on my side.

Best,
{{yourName}}`,
        whenToUse:
          "Use this as the final proposal follow-up when earlier check-ins have not received a reply.",
        whyItWorks:
          "It makes replying easy by offering clear options without applying unnecessary pressure.",
        goal: "Get a final yes, no, or later decision.",
        nextStep: "Close the workflow if there is still no response and revisit only when relevant.",
        expectedOutcome: "A decision, a timing answer, or permission to close the opportunity.",
        psychology:
          "A respectful close-the-loop message lowers the effort and awkwardness involved in replying.",
        subjectLineLogic:
          "The subject signals finality while remaining calm and practical.",
        keySentenceBreakdown: [
          {
            sentence: "Would it be most helpful to move forward, revisit this later, or leave it here for now?",
            explanation:
              "Three clear options make it easier to answer than another open-ended request for thoughts.",
          },
        ],
        commonMistakes: [
          "Sounding frustrated or passive-aggressive.",
          "Adding another full sales pitch.",
          "Creating false urgency.",
          "Continuing to chase after this final message.",
        ],
      },
    ],
  },

  {
    id: "meeting-follow-up",
    name: "Meeting Follow-Up",
    shortDescription: "Turn conversations into clear next steps.",
    description:
      "A practical playbook for recapping meetings, confirming decisions, and keeping post-call momentum alive.",
    audience: "Agencies & Founders",
    badge: "Recap",
    templates: [
      {
        id: "meeting-recap",
        label: "Meeting Recap",
        subject: "Great speaking earlier",
        variables: ["name", "points", "nextSteps", "yourName"],
        body: `Hi {{name}},

Great speaking earlier.

Quick recap:
{{points}}

Next steps:
{{nextSteps}}

Best,
{{yourName}}`,
        whenToUse:
          "Use this shortly after a meeting or call while the conversation is still fresh.",
        whyItWorks:
          "It creates clarity, documents progress, and makes the next step explicit.",
        goal: "Keep momentum after a meeting.",
        nextStep: "Wait for confirmation or proceed with the agreed actions.",
        expectedOutcome: "Better alignment and faster follow-through.",
        psychology:
          "Ambiguity kills momentum. Clear recaps reduce friction and keep everyone aligned.",
        subjectLineLogic:
          "The subject line feels warm and natural after a recent conversation.",
        keySentenceBreakdown: [
          {
            sentence: "Quick recap:",
            explanation:
              "This prepares the reader for something structured and easy to skim.",
          },
          {
            sentence: "Next steps:",
            explanation:
              "This turns discussion into action.",
          },
        ],
        commonMistakes: [
          "Sending the recap too late.",
          "Being vague about next steps.",
          "Including too much detail.",
          "Not being clear on ownership or timing.",
        ],
      },
    ],
  },

  {
    id: "demo-booking-sequence",
    name: "Demo Booking Follow-up Plan",
    shortDescription: "Move interest into booked calls.",
    description:
      "A small follow-up plan for turning interest into a booked demo or discovery call without sounding too heavy.",
    audience: "Agencies & Founders",
    badge: "Demo",
    templates: [
      {
        id: "demo-invite",
        label: "Demo Invite",
        subject: "Worth a quick walkthrough?",
        variables: ["name", "offer", "yourName"],
        body: `Hi {{name}},

Happy to walk you through how {{offer}} works and where it could fit for you.

Would you be open to a quick call?

Best,
{{yourName}}`,
        whenToUse:
          "Use this when someone has shown enough interest to consider a live walkthrough or short call.",
        whyItWorks:
          "It turns vague interest into a clear, low-friction next step.",
        goal: "Book a call.",
        nextStep: "If there is no reply, send a short reminder after a few days.",
        expectedOutcome: "A booked meeting or timing response.",
        psychology:
          "People commit more easily when the next action is clear and small.",
        subjectLineLogic:
          "The subject line is soft and exploratory, which lowers resistance.",
        keySentenceBreakdown: [
          {
            sentence: "Happy to walk you through how {{offer}} works and where it could fit for you.",
            explanation:
              "This makes the purpose of the call immediately useful.",
          },
        ],
        commonMistakes: [
          "Making the demo sound too formal.",
          "Not explaining why the call matters.",
          "Asking for too much time.",
          "Using a weak CTA.",
        ],
      },
      {
        id: "demo-reminder",
        label: "Demo Reminder",
        subject: "Still worth exploring?",
        variables: ["name", "yourName"],
        body: `Hi {{name}},

Just checking if it would still be useful to do a quick walkthrough.

Happy to keep it simple.

Best,
{{yourName}}`,
        whenToUse:
          "Use this after the initial demo invite if they did not reply.",
        whyItWorks:
          "It keeps the ask small and reduces perceived effort.",
        goal: "Recover the demo opportunity.",
        nextStep: "Pause if there is still no reply.",
        expectedOutcome: "A yes, no, or clearer timing signal.",
        psychology:
          "People are more likely to reply to a low-pressure reminder than a heavier push.",
        subjectLineLogic:
          "The subject feels exploratory rather than salesy.",
        keySentenceBreakdown: [
          {
            sentence: "Happy to keep it simple.",
            explanation:
              "This lowers friction around taking the meeting.",
          },
        ],
        commonMistakes: [
          "Making reminders too pushy.",
          "Sounding impatient.",
          "Writing a long second email.",
          "Over-explaining the call.",
        ],
      },
    ],
  },

  {
    id: "inbound-lead-replies",
    name: "Inbound Lead Replies",
    shortDescription: "Reply to inbound interest with more structure.",
    description:
      "A playbook for replying to inbound leads, qualifying interest, and moving conversations toward a call or clearer next step.",
    audience: "Founders & Small Teams",
    badge: "Inbound",
    templates: [
      {
        id: "inbound-first-reply",
        label: "First Reply",
        subject: "Re: your message",
        variables: ["name", "offer", "yourName"],
        body: `Hi {{name}},

Thanks for reaching out.

Happy to share more about {{offer}} and see whether it would be a good fit for what you need.

Would it be easier to continue here, or would you prefer a quick call?

Best,
{{yourName}}`,
        whenToUse:
          "Use this when someone has shown inbound interest and you want a clear, low-friction reply.",
        whyItWorks:
          "It acknowledges their interest, keeps the tone calm, and gives them an easy next step.",
        goal: "Move the inbound lead into a real conversation.",
        nextStep: "If they reply positively, answer their question or book a call.",
        expectedOutcome: "A reply that moves the lead forward.",
        psychology:
          "Inbound leads want clarity, not pressure. A simple response keeps momentum without overwhelming them.",
        subjectLineLogic:
          "A standard reply subject keeps continuity and feels natural.",
        keySentenceBreakdown: [
          {
            sentence:
              "Happy to share more about {{offer}} and see whether it would be a good fit for what you need.",
            explanation:
              "This frames the conversation around fit rather than hard selling.",
          },
          {
            sentence:
              "Would it be easier to continue here, or would you prefer a quick call?",
            explanation:
              "Giving two easy options lowers the effort required to reply.",
          },
        ],
        commonMistakes: [
          "Writing too much in the first reply.",
          "Turning the response into a full pitch.",
          "Pushing for a call too aggressively.",
          "Ignoring what they originally asked about.",
        ],
      },
      {
        id: "inbound-qualification",
        label: "Qualification Reply",
        subject: "A couple of quick questions",
        variables: ["name", "problemArea", "yourName"],
        body: `Hi {{name}},

Happy to help.

Before I suggest the best next step, it would help to understand a little more about {{problemArea}} on your side.

If you can share a bit more context, I can point you in the right direction.

Best,
{{yourName}}`,
        whenToUse:
          "Use this when the lead is real but you need a bit more context before recommending a next step.",
        whyItWorks:
          "It qualifies the conversation without sounding like a form or admin process.",
        goal: "Get the missing information you need.",
        nextStep: "Once they respond, guide them toward a recommendation or call.",
        expectedOutcome: "A more informed reply with useful context.",
        psychology:
          "People are more likely to answer when the questions feel purposeful instead of procedural.",
        subjectLineLogic:
          "The subject line signals brevity and lowers the perceived effort needed to reply.",
        keySentenceBreakdown: [
          {
            sentence:
              "Before I suggest the best next step, it would help to understand a little more...",
            explanation:
              "This makes the questions feel useful instead of intrusive.",
          },
        ],
        commonMistakes: [
          "Asking too many questions at once.",
          "Using generic qualification language.",
          "Making the email feel like admin.",
          "Failing to explain why the context matters.",
        ],
      },
    ],
  },

  {
    id: "no-show-recovery",
    name: "No-Show Recovery",
    shortDescription: "Recover momentum after missed calls or meetings.",
    description:
      "A playbook for following up after missed calls, reducing awkwardness, and getting the conversation back on track.",
    audience: "Agencies & Founders",
    badge: "Recovery",
    templates: [
      {
        id: "missed-call-follow-up",
        label: "Missed Call Follow-Up",
        subject: "No worries",
        variables: ["name", "yourName"],
        body: `Hi {{name}},

No worries — I know things come up.

Happy to reschedule if it still makes sense on your side.

Best,
{{yourName}}`,
        whenToUse:
          "Use this right after someone misses a call or meeting.",
        whyItWorks:
          "It removes awkwardness and gives them an easy path back into the conversation.",
        goal: "Reschedule without creating friction.",
        nextStep: "If there is no reply, send one final reschedule check-in later.",
        expectedOutcome: "A rescheduled call or a timing reply.",
        psychology:
          "Reducing embarrassment makes it easier for people to re-engage after a no-show.",
        subjectLineLogic:
          "A soft subject line lowers tension and keeps the tone friendly.",
        keySentenceBreakdown: [
          {
            sentence: "No worries — I know things come up.",
            explanation:
              "This removes blame immediately and protects goodwill.",
          },
          {
            sentence:
              "Happy to reschedule if it still makes sense on your side.",
            explanation:
              "This keeps the relationship open without pressure.",
          },
        ],
        commonMistakes: [
          "Sounding annoyed.",
          "Making the follow-up guilt-based.",
          "Calling out the no-show too harshly.",
          "Over-explaining the missed call.",
        ],
      },
      {
        id: "no-show-second-try",
        label: "Second Reschedule Nudge",
        subject: "Still worth rescheduling?",
        variables: ["name", "yourName"],
        body: `Hi {{name}},

Just checking whether it still makes sense to reconnect.

If now is not the right time, no problem — I just wanted to close the loop.

Best,
{{yourName}}`,
        whenToUse:
          "Use this if they missed the call and did not reply to the first follow-up.",
        whyItWorks:
          "It gives one last clear opportunity to respond without sounding frustrated.",
        goal: "Get a yes, no, or timing answer.",
        nextStep: "If there is no reply, move on and revisit later only if relevant.",
        expectedOutcome: "A final signal on whether the conversation should continue.",
        psychology:
          "A calm close-the-loop message often works because it reduces the emotional cost of replying.",
        subjectLineLogic:
          "The subject sounds practical rather than confrontational.",
        keySentenceBreakdown: [
          {
            sentence: "I just wanted to close the loop.",
            explanation:
              "This introduces finality without sounding passive-aggressive.",
          },
        ],
        commonMistakes: [
          "Following up too many times after a no-show.",
          "Using frustration as leverage.",
          "Making the email too long.",
          "Failing to move on if there is still no reply.",
        ],
      },
    ],
  },

  {
    id: "client-renewal-upsell",
    name: "Client Renewal & Upsell",
    shortDescription: "Extend client work and open the next conversation.",
    description:
      "A playbook for renewing client relationships, opening next-step conversations, and introducing upsell opportunities more naturally.",
    audience: "Agencies & Consultants",
    badge: "Renewal",
    templates: [
      {
        id: "renewal-check-in",
        label: "Renewal Check-In",
        subject: "Looking ahead",
        variables: ["name", "result", "yourName"],
        body: `Hi {{name}},

As we look ahead, I thought it would be useful to review what has worked well so far and where we could build on the current momentum.

Especially around {{result}}, I think there is room to keep pushing forward.

Happy to discuss next steps if useful.

Best,
{{yourName}}`,
        whenToUse:
          "Use this when an engagement is approaching renewal and you want to open the conversation early.",
        whyItWorks:
          "It frames renewal around progress and momentum instead of making it feel purely contractual.",
        goal: "Start a renewal conversation naturally.",
        nextStep: "If they respond, discuss extension options or next priorities.",
        expectedOutcome: "A constructive renewal conversation.",
        psychology:
          "Renewal feels easier when it is tied to ongoing value rather than just another invoice cycle.",
        subjectLineLogic:
          "The subject line feels forward-looking and strategic instead of transactional.",
        keySentenceBreakdown: [
          {
            sentence:
              "Review what has worked well so far and where we could build on the current momentum.",
            explanation:
              "This focuses the conversation on progress, not paperwork.",
          },
        ],
        commonMistakes: [
          "Waiting too late to raise renewal.",
          "Making it feel purely commercial.",
          "Ignoring the results already achieved.",
          "Leading with price instead of value.",
        ],
      },
      {
        id: "upsell-next-step",
        label: "Upsell Next Step",
        subject: "One next opportunity",
        variables: ["name", "idea", "yourName"],
        body: `Hi {{name}},

One opportunity I think is worth discussing next is:

{{idea}}

It feels like a natural next step based on where things are now.

Happy to talk it through if helpful.

Best,
{{yourName}}`,
        whenToUse:
          "Use this when you want to introduce a sensible upsell or extension based on current progress.",
        whyItWorks:
          "It positions the upsell as a logical next stage rather than a random extra offer.",
        goal: "Create interest in expanded work.",
        nextStep: "If they respond, move into a scoped discussion.",
        expectedOutcome: "A conversation around the next-stage opportunity.",
        psychology:
          "Upsells land more naturally when they are connected to current momentum and context.",
        subjectLineLogic:
          "The subject hints at one focused opportunity rather than a broad pitch.",
        keySentenceBreakdown: [
          {
            sentence: "It feels like a natural next step based on where things are now.",
            explanation:
              "This makes the offer feel earned and relevant.",
          },
        ],
        commonMistakes: [
          "Pitching too many ideas at once.",
          "Making the upsell feel disconnected from current work.",
          "Introducing it too early.",
          "Using vague benefit language.",
        ],
      },
    ],
  },
];

export function getPlaybookById(id: string) {
  return playbooks.find((playbook) => playbook.id === id) ?? null;
}

export function getTemplate(playbookId: string, templateId: string) {
  const playbook = getPlaybookById(playbookId);
  if (!playbook) return null;

  return playbook.templates.find((template) => template.id === templateId) ?? null;
}
