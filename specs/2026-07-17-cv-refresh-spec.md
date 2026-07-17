# /cv-refresh — weekly self-updating public CV (spec v2)

**Status:** approved by Jonas 2026-07-17 (v1 vault-scoped → **v2 rescoped to the branding repo** at
Jonas's direction: "everything related with my external branding lives there").
**Implementation home:** `~/Dev/joaoblasques.github.io` (the branding session builds it — handoff
delivered 2026-07-17). Canonical copy: this file. The vault's copy at
`06_Metadata/Plans/2026-07-17-cv-refresh-spec.md` is the historical record of the decision, not a
second source of truth — if they ever disagree, this repo copy wins.

## Decisions (final)
- **Fully public CV**: served at **joaoblasques.com/cv** — web CV page in the site's design +
  `docs/cv/CV-Joao-Blasques.pdf` (stable evergreen URL for LinkedIn/applications).
- **Dated archive in the public repo**: `brand/cv/archive/CV-Joao-Blasques-YYYY-MM-DD.pdf` —
  every version kept forever (the evolving-CV record Jonas asked for).
- **Canonical source**: `brand/cv/cv-source.md` — seeded from the 2026-07-16 consolidation
  (vault: `03_Resources/CV/2026-07-16 - Consolidation - LinkedIn vs Website.md`, readable from the
  repo session) + the rewritten site `data/` + the LinkedIn experience facts captured there.
- **Skill**: `.claude/skills/cv-refresh/SKILL.md` in the repo (its skills convention, like
  createpost/postlinkedin). Vault gets NO cv command.
- **Render**: cv-source → HTML using the site's real design tokens (extract from the live CSS the
  same way the Vitals logo was made — from source, never screenshots) → headless Chrome
  `--print-to-pdf`. A4, ≤2 pages, render warns on overflow.
- **Weekly trigger**: new launchd `com.jonas.branding.cv-refresh`, Fridays (~17:30, after the vault
  cascade), running `cd ~/Dev/joaoblasques.github.io && claude -p "/cv-refresh"`. NOT wired into
  the vault's brain-review cascade (one session per repo).
- **Publish semantics**: /cv-refresh regenerates + commits; the PUSH deploys (docs/ is live) —
  first deploy needs Jonas's explicit OK; thereafter the weekly run may push per his standing
  approval given at first deploy.

## Honesty rules (inherited from the consolidation)
- cv-source claims only what public work evidences (three-tier skills doctrine).
- Since-2009 / full-time-since-2023 experience framing; the blade-repair arc stays, framed as
  deliberate reskilling; the 2024 overlap keeps its explanation line.
- Human voice throughout (no AI-tell prose).

## Vault-side residue (all that remains there)
- `03_Resources/CV/` keeps the consolidation audit + a README pointing at this repo. No PDFs.

## Acceptance
1. `/cv-refresh` in the repo produces joaoblasques.com/cv (page + PDF) matching site design,
   ≤2 pages, consolidation-approved content.
2. Dated copy lands in `brand/cv/archive/`.
3. Proven headless once; Friday launchd produces the next one unattended.
4. `npm test` / `check.js` guards extended so a broken cv build fails loudly.

## Implementation notes (added by the repo-side build, 2026-07-17)
- The blade-repair contracts (4 separate LinkedIn entries) are condensed to one grouped CV entry
  spanning Apr 2021 – Dec 2024, framed as a deliberate arc — full per-contract detail stays on
  LinkedIn, which is a different register. This was needed to hit ≤2 pages without cramming type.
- `render.js`'s first attempt used `break-inside: avoid` on whole `.cv-section` blocks, which wasted
  most of each printed page (a short section couldn't share a page with the next one). Fixed by
  scoping the no-break rule to individual paragraphs/list items instead — sections flow normally,
  entries don't split mid-sentence.
- PDF page-counting avoids adding a PDF-parsing dependency: it counts `/Type /Page` (not
  `/Type /Pages`, the tree root) occurrences directly in the raw PDF bytes. Good enough for a
  1-2 page document; would need a real parser if the CV ever needs more precise introspection.
