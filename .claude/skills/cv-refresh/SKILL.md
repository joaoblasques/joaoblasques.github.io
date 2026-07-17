---
name: cv-refresh
description: Regenerate the public CV (web page + PDF) from brand/cv/cv-source.md, archive a dated copy, and commit. Use when the user says /cv-refresh, "refresh my CV", "update the CV", or on the Friday scheduled run. Commits by design (unlike createpost/postlinkedin) — but never pushes without the standing approval recorded below.
argument-hint: ""
allowed-tools: Bash, Read, Write, Edit, AskUserQuestion
---

# /cv-refresh

Regenerates `joaoblasques.com/cv` (web page + PDF) from one canonical source, keeps a
forever-archive of every version, and commits the result. Runs both on-demand and
unattended (weekly launchd job) — see "Publish semantics" below for what unattended
runs are and aren't allowed to do.

Spec: `specs/2026-07-17-cv-refresh-spec.md` (copied from the vault plan that Jonas
approved 2026-07-17 — read that file for the full decision record if anything here
seems to contradict it; the spec wins).

## Hard rules

1. **cv-source.md claims only what public work evidences** — the same three-tier
   doctrine as `data/pages/skills.md` (core/working/familiar, each tier mapped to
   something checkable). Don't upgrade a skill's tier without evidence appearing
   first in the site's own project write-ups.
2. **Never invent a metric, date, or job title.** If a fact needs updating (a new
   cert, a role change), that's a human edit to `cv-source.md`, not something this
   skill infers or guesses.
3. **Honesty framing is binding, not optional style:** experience is framed as
   "data & software background since 2009, full-time data engineering since 2023"
   (matches `data/profile.json`/`about.md` — keep these in sync, don't let the CV
   drift into a different story than the website tells). The wind-turbine
   blade-repair years stay in the CV, framed as deliberate — never hidden, never
   apologized for. The 2024 overlap between the DataStuff.nl freelance work and the
   final Global Wind Service contract gets stated plainly, not left for a reader to
   puzzle out.
4. **Human voice, no AI-tell prose.** Read any new/changed sentence in
   `cv-source.md` out loud before shipping. If it wouldn't survive that, run it
   through `/de-aiify-writing` — this document goes to actual employers.
5. **Design comes from the site's real CSS, never a guessed resume template.**
   `brand/cv/render.js` already extracts colors, type, spacing from
   `assets/styles.css` and `lib/layout.js` the same way the Vitals logo was pulled
   from its site's real markup — reuse those tokens, don't reinvent a look.
6. **≤2 pages, A4.** `render.js` warns (and `check.js` fails the build) if the PDF
   overflows. Fix overflow by trimming `cv-source.md` content, not by shrinking
   fonts/margins below what's still readable and consistent with the site's type
   scale.
7. **Never hand-edit `docs/cv/`** — it's generated, same rule as `docs/` generally.
   Edit `brand/cv/cv-source.md` and re-render.
8. **Publish semantics — commit vs. push are different levels of consequence:**
   - Regenerating and **committing** is this skill's normal job, every run,
     unattended or not. A commit is local and reversible.
   - **Pushing** is what actually deploys (`docs/` is live GitHub Pages) — this is
     the irreversible-in-practice step (the old CV stops being served the moment
     the new one is live, and a bad push means a broken CV in front of an
     employer).
   - **The first-ever push of `/cv` needs Jonas's explicit OK inside the actual
     session doing it** — not inferred, not assumed from the spec being
     "approved." Ask, wait for a clear yes, then push and record it (below).
   - **After that explicit OK is given once, record it in this file** (see
     "Standing approval log") and subsequent runs — including the unattended
     Friday launchd run — may push under that standing approval without asking
     again. Don't re-ask every week; that defeats the point of "weekly and
     unattended."
   - If the honesty rules, the design, or the page-count constraint are ever
     violated by a render, that's cause to stop and NOT push regardless of any
     standing approval — a bad render reaching a live CV is exactly the failure
     mode the guards exist to prevent. Standing approval covers "push a *good*
     render," not "push whatever happened to render."

## Standing approval log

- **2026-07-17** — Jonas reviewed the rendered PDF (two review passes: header
  redesign, clickable contact links, page-break before Education, section
  spacing) and said "Done, please publish it to the website." First deploy
  pushed as commit `5b23908`. Future runs — including the unattended Friday
  launchd job — may commit and push without asking again, subject to Hard
  Rule 8's override (a render that fails honesty/design/page-count checks
  is never pushed regardless of this standing approval).

## Phase 1 — Render

```
npm run cv
```

This runs `brand/cv/render.js` (writes `docs/cv/index.html` +
`docs/cv/CV-Joao-Blasques.pdf`, archives a dated copy to
`brand/cv/archive/CV-Joao-Blasques-YYYY-MM-DD.pdf`) then `check.js` (fails loudly on
a stale build, a >2-page PDF, or a missing/empty page body).

If `cv-source.md` hasn't changed since the last run, the render is still safe to
re-run (idempotent) — but there's nothing new to commit; say so and stop rather than
committing a no-op.

## Phase 2 — Verify before committing

- Read the rendered PDF (or at minimum `docs/cv/index.html`) and actually look at
  it — page count, whether content got cut off mid-sentence by a bad page break,
  whether the design still matches the live site (colors, the octocat mark, the
  green "online" dot). Don't trust the page-count number alone; a 2-page PDF can
  still look wrong.
- If anything in `cv-source.md` changed this run, do the "read it out loud" honesty
  check from Hard Rule 4 on the new/changed text specifically.

## Phase 3 — Commit

Stage exactly: `docs/cv/`, `brand/cv/cv-source.md` (if changed),
`brand/cv/archive/<new dated file>`. Commit message states what changed in
`cv-source.md` this run (or "no content change — scheduled refresh" if it's just a
weekly re-render with nothing new). This is a normal commit — always do this part,
attended or not.

## Phase 4 — Push (the part that needs care)

- **No entry in "Standing approval log" yet** → stop after committing. Tell the
  user: "CV regenerated and committed. This is the first `/cv` deploy — pushing
  makes it live at joaoblasques.com/cv. Push now?" Use `AskUserQuestion`. On a
  clear yes: push, then **add the approval entry to this file** (date, "Jonas,
  first /cv-refresh push") before ending the session — this is what lets future
  unattended runs proceed.
- **Entry exists** → push under that standing approval, no need to ask again. Still
  stop and flag it (don't silently proceed) if Phase 2's verification found anything
  off — a bad render overrides standing approval per Hard Rule 8.
- Either way, tell the user plainly what happened: committed only, or committed +
  pushed + live at joaoblasques.com/cv.

## Reminders

- This is the one skill in this repo's `.claude/skills/` that commits by default —
  `createpost` and `postlinkedin` deliberately never do. Don't let that asymmetry
  bleed into either direction: don't start committing from those, don't stop
  committing here out of habit copied from them.
- The weekly launchd job (`com.jonas.branding.cv-refresh`, Fridays ~17:30) runs
  `claude -p "/cv-refresh"` from this repo's root. It is a separate job from the
  vault's brain-review cascade — never wire this into that, and never have the
  vault session touch this repo's git state.
- If `cv-source.md` and `data/pages/about.md` / `data/pages/skills.md` drift apart
  (one says something the other doesn't), that's a bug to flag to Jonas, not
  something to silently reconcile by guessing which one is right.
