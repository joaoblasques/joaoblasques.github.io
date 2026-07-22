---
name: replyLinkedin
description: Draft a polite, professional reply to a message someone sent João on LinkedIn. Use when the user says /replyLinkedin followed by the message text, "reply to this LinkedIn message", "how should I answer this recruiter", or pastes an inbound LinkedIn message wanting a response. Drafts and copies to clipboard — never opens LinkedIn, never sends.
argument-hint: "<the message they sent>"
allowed-tools: Bash, Read, AskUserQuestion, Skill
---

# /replyLinkedin

Takes an inbound LinkedIn message, asks a few steering questions, and drafts the reply
in Jonas's voice. **Drafts only — copies to the clipboard and stops.** Opening LinkedIn,
pasting, and hitting Send are all yours.

Same trust model as `/postlinkedin` (fills, never publishes) and Nora (drafts, human
sends). The asymmetry is deliberate: these messages go to real people under Jonas's own
name, and a wrong one can't be unsent.

## Hard rules

1. **Never send, never open LinkedIn.** This skill produces text. It does not drive a
   browser. If the reply needs to go into the real UI, that's `/postlinkedin`'s job or
   a manual paste — not this one.
2. **Always ask before drafting.** The steering questions in Phase 2 are the point of
   the skill; a reply written without them is a guess. Ask even when the intent seems
   obvious from the message — "obvious" is how you end up telling a client you're not
   interested.
3. **Never invent facts about Jonas.** No made-up availability, rates, notice period,
   past employers, or tech he hasn't used. If a question needs a fact not in
   `brand/cv/cv-source.md` and not supplied by the answers, ask — don't fill the gap
   with something plausible.
4. **Every draft goes through `/de-aiify-writing` before he sees it.** Not optional,
   not "if it reads AI-ish". A recruiter reading a chatbot-shaped reply is exactly the
   failure this skill exists to prevent. Same rule as `/createpost` Hard Rule.
5. **Experience is framed the way the CV frames it** — "~8 years across data and
   software engineering, 3 of them full-time in data engineering". Never "3 years"
   alone: it reads as three years of total IT experience and gets filtered out. This
   matches `brand/cv/cv-source.md`, `data/profile.json`, `data/pages/about.md` and
   `data/pages/readme.md` — if you find yourself writing a different number, one of
   those files drifted and that's a bug to flag, not to route around.
6. **Politeness is not agreement.** A "no" stays a clear no. Don't soften a decline
   into something that reads like maybe — that wastes the other person's time and
   invites a follow-up Jonas will have to decline twice.

## Phase 1 — Read the message

The argument is the text they sent. If it wasn't supplied, ask for it before anything
else.

Read it for: who they are, what they actually want, whether they asked a direct
question, and whether they got anything wrong about Jonas (a common recruiter tell —
wrong stack, wrong seniority, wrong location). Note anything worth correcting politely
in the reply.

If the message is a generic mass-blast with no specifics, say so — the right reply is
usually short, and Jonas may prefer not to reply at all.

## Phase 2 — Ask the steering questions

Use `AskUserQuestion`, one call. Lead each option list with the recommendation, per
Jonas's standing preference.

1. **Intent** — Interested · Not interested · Need more info first · Not now, keep in
   touch. This is the biggest fork; everything else is tone on top of it.
2. **Who they are** — Recruiter · Potential client · Peer/network · Vendor/sales.
   Changes register and how much is volunteered.
3. **What to disclose** — multi-select: availability · rate expectations · link the CV
   (joaoblasques.com/cv) · link the site/projects · notice period · nothing beyond the
   reply itself.
4. **Warmth and length** — Warm and brief · Warm and full · Strictly professional and
   brief · Strictly professional and full.
5. **Language — only when the inbound message is not in English.** Reply in their
   language · Reply in English · Their language, noting the CV and site are in English.
   Default to matching the language they wrote in; it reads as natural rather than
   pointed. Skip this question entirely for English messages — don't spend a slot
   asking something with one sensible answer.

`AskUserQuestion` allows at most four questions per call. When the language question
applies, drop **Who they are** and infer it from the message instead — a signature
line like "IT Business Manager" or "Talent Acquisition" settles it without asking, and
language changes the draft more than register does. If the sender's role is genuinely
ambiguous *and* the message isn't in English, ask the four highest-value ones and infer
the remaining one.

Infer sensible defaults from the message and mark them "(Recommended)" — a recruiter
with a concrete role and a rate range is a different default than an unsolicited
vendor pitch.

If an answer makes another question moot (a flat "not interested" makes disclosure
mostly irrelevant), don't ask it — or ask a narrower version.

## Phase 3 — Draft

Write the reply, then run it through `/de-aiify-writing` (Hard Rule 4).

Shape:
- **Open** by acknowledging what they actually said — reference a specific detail from
  their message, so it's visibly not a form response.
- **Answer the question they asked.** Directly, in the first line or two. Don't bury it.
- **State the intent** from Phase 2, unambiguously.
- **Add only what Phase 2's disclosure answer allows.** Links go in as plain URLs
  (joaoblasques.com/cv), not markdown — LinkedIn renders them as text.
- **Close** with a clear next step if there is one, or a clean sign-off if there isn't.

Length: LinkedIn messages are short. Default to under 120 words unless "full" was
picked. Nobody reads a five-paragraph InMail reply.

**When replying in a language other than English:** match the register they used, not
just the language. Portuguese `tu` vs `você` is the common case — mirroring `tu` when
they opened with it keeps the reply natural; switching to `você` reads as a step back.
Write it natively rather than translating an English draft: translated business prose
carries its own tells (over-formal stock closers like "Fico ao dispor para qualquer
esclarecimento", mirror-greetings like "Espero que esteja tudo bem"). The
`/de-aiify-writing` pass still applies — the goal is text Jonas would have typed
himself, in whichever language.

Avoid, in addition to the usual `/de-aiify-writing` tells:
- "I hope this message finds you well" and every variant
- "I'd love to learn more about this exciting opportunity"
- "Thank you for reaching out!" as an opener when it's a cold mass-mail
- Restating their whole message back at them before answering
- Em-dash-heavy constructions that read as AI-shaped

## Phase 4 — Deliver

Print the draft, then copy it to the clipboard with `pbcopy` (Jonas's standing
preference — don't make him select it by hand):

```
printf '%s' "$REPLY_TEXT" | pbcopy
```

Tell him plainly: drafted, copied to clipboard, ready to paste into LinkedIn. Then
stop. Do not offer to open LinkedIn — see Hard Rule 1.

If he wants changes, revise and re-copy. Don't treat the first draft as final.

## Reminders

- This skill **never commits** — same as `/createpost` and `/postlinkedin`, and unlike
  `/cv-refresh`. Nothing here belongs in git. If a reply is worth keeping, that's a
  vault note, not a repo file.
- The CV and site are the source of truth for anything factual about Jonas. Read
  `brand/cv/cv-source.md` when a reply needs specifics — don't work from memory of a
  previous session.
- If the message is a job spec worth a considered answer rather than a quick reply,
  say so. A three-line LinkedIn response to a role Jonas actually wants is the wrong
  tool; that's a proper application, and it deserves the CV in front of it.
