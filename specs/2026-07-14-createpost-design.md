# `/createpost` — design

**Date:** 2026-07-14
**Status:** approved, pending implementation

> Spec location note: the Superpowers default is `docs/superpowers/specs/`, but in this
> repo `docs/` **is the published website** (GitHub Pages serves `main:/docs`). A spec
> there would be publicly readable at `joaoblasques.com/superpowers/specs/`. Specs live
> in `specs/` at the repo root instead — a sibling of `data/` and `lib/`, never copied
> into `docs/` by `build.js`.

## Purpose

One command turns a project/repo into three drafts: a post for joaoblasques.com, a
LinkedIn post, and a LinkedIn Featured/Projects entry. It drafts; the human reviews,
edits, and publishes.

## Invocation

```
/createpost                    # cwd, if it's a git repo
/createpost ~/Dev/vitals       # local path
/createpost joaoblasques/vitals  # owner/repo slug — clones shallow to a temp dir if not local
```

## Flow

Four phases. Phases 1–3 produce files; nothing is committed or published.

### Phase 1 — Scan (silent)

Read the repo and build a factual picture. No questions yet, so that Phase 2's
questions are specific rather than generic.

Gather:
- `README.md` — the project's own framing, usually the best raw material
- Repo tree (depth 3, excluding `node_modules/`, `.git/`, build output)
- `git log --oneline -30` — what's been happening lately
- CI config (`.github/workflows/*`) — what's actually tested and deployed
- Dependency manifests (`pyproject.toml`, `requirements.txt`, `package.json`) — real stack
- Language breakdown via `gh api repos/<owner>/<repo>/languages` when it's a GitHub repo

Derive: what it does, the stack, architecture shape, what's tested, what's automated.

### Phase 2 — Ask 2–3 targeted questions

The scan produces the *what*. These questions produce the *why* and the war story —
the things that made the MBTA post good and that no scan can reach:

> "The system caught its own bug." — failure-monitor catching a real OOM
> "One deep project rather than a pile of toy demos." — the actual motivation

Questions MUST be grounded in something the scan found. Good:

> "I see `failure_monitor.py` with a retry path and issue-filing — did it ever catch
> something real in production?"

Bad (generic, could be asked of any repo):

> "What was challenging about this project?"

Ask **at most 3**, one message, via AskUserQuestion where the options are knowable.
If the user answers "nothing interesting" to all, proceed — a flatter post is
acceptable; a fabricated one is not.

### Phase 3 — Draft three artifacts

| Artifact | Path | Committed? |
|---|---|---|
| Website post | `data/posts/<slug>.md` + entry in `data/posts.json` | yes, by the user |
| LinkedIn post | `.createpost/<slug>-linkedin.txt` (+ clipboard via `pbcopy`) | no — gitignored |
| Featured entry | `.createpost/<slug>-linkedin-featured.md` | no — gitignored |

**Website post** follows the house pattern for *project posts*. The existing 11 posts
split into two genres, and `/createpost` writes only the first:

| Genre | Count | Length | Tags | Shape |
|---|---|---|---|---|
| **Project post** | 7 | 432–1,574w (median 638) | 8–9 | 7/7 open `## Project Overview`; 6/7 have `## Key Concepts` second |
| Essay / intro | 4 | 177–251w | 2–3 | Topic-specific headings, no template |

The pattern is unambiguous within the genre that matters. `/createpost` writes project
posts:

- Opens `## Project Overview` (7/7 of project posts)
- `## Key Concepts` second (6/7)
- Then project-specific sections. Only `## Architecture` recurs (2 posts); `## Tech
  Stack`, `## Quickstart`, `## Takeaway` appear once each. So: after the first two
  headings, let the project dictate the sections rather than forcing a checklist.
- ~450–950 words is the comfortable band; go longer only when the material earns it
  (the 1,574w dbt post is a deliberate deep-dive, not the target)
- 8–9 tags, reusing existing tag vocabulary from `posts.json` where they fit, so tag
  pages aggregate instead of fragmenting
- Frontmatter fields match `posts.json`: `slug`, `title`, `date`, `description`, `tags`

The skill reads two or three existing project posts at run time as the live template
rather than hardcoding the shape — if the house style drifts, the skill drifts with it.

**LinkedIn post**: hook first, 150–250 words, no hashtag spam (≤3, only if they're
real), links to the post on joaoblasques.com — not to the raw repo, so the site is
the destination. Plain text; LinkedIn strips markdown.

**Featured entry**: title, one-paragraph description, link. Formatted for pasting into
LinkedIn's Projects/Featured section.

### Phase 4 — Build, verify, stop

1. `npm run build` — `check.js` catches a bad slug, missing `<h1>`, dead internal link
2. `npm run linkcheck` — every external link in the draft must resolve
3. Print the local preview path (`/post/<slug>/`) and a summary of the three artifacts
4. **Stop.** Do not commit, do not push.
5. Then ask once: "Add this to Pinned (`repos.json`) and the Projects page too?" —
   only on a yes, make those edits and leave them uncommitted as well.

### Slug rules

`<slug>` is the post's URL (`/post/<slug>/`) and the filename stem. It must be decided
before drafting, since the LinkedIn post links to it.

- Derive from the project name, kebab-case: `mbta-on-time-lakehouse` → `mbta-otp-lakehouse`
  (shortened by hand — the slug need not equal the repo name)
- Ask the user to confirm the slug when the repo name is long or unclear
- **If `data/posts/<slug>.md` already exists**: stop and ask. Never silently overwrite
  a post — offer to update the existing one or pick a new slug. An overwrite loses
  writing that isn't recoverable except from git.
- A slug is permanent once published: changing it 404s the old URL. If a published
  post's slug must change, add a redirect stub (see `build.js`, `redirect()`).

## Hard rules

These exist because each has already bitten this site:

1. **Never invent a metric.** If the repo doesn't prove a number, it doesn't appear.
   No "5TB daily", no "reduced latency by 35%", no "saved €2.1M" unless it's in the
   repo and attributable. This is exactly what put unverifiable claims on the site.
2. **Verify every link before writing it.** Any URL entering a draft — repo, docs
   site, demo — gets checked first. `datastreampy`, `ml-monitor` and
   `data-quality-framework` were advertised for months while 404ing.
3. **Private repo → link the public destination, never the repo.** Check visibility
   with `gh api repos/<owner>/<repo> --jq .visibility` before linking. A private repo
   URL 404s for every reader. Known mappings:

   | Project | Repo | Link instead |
   |---|---|---|
   | Vitals | public | `https://joaoblasques.com/vitals/` (repo link fine too) |
   | Corpus | **private** | `https://joaoblasques.com/corpus-docs/` |
   | Nora | **private** | `https://nora-bennett.com/` (docs: `docs.nora-bennett.com`) |

   If a private project has no public destination, say so and ask — don't link the
   repo, and don't quietly omit the link.
4. **Draft only; the human posts.** No LinkedIn API, no driving a logged-in session.
   Same asymmetry as Nora: the machine drafts, the human sends.
5. **Never touch `docs/` by hand.** It's generated. Write `data/`, run the build.
6. **Correct GitHub handle.** `joaoblasques`, never `jonasblasques` (the nickname has
   been typo'd into a live link before; `check.js` now guards it).

## What this deliberately does not do

YAGNI — the existing 11 posts already encode the house style, so no knobs:

- No template/tone configuration
- No platform beyond LinkedIn (no Twitter/Mastodon/dev.to)
- No scheduling
- No image/OG-card generation
- No auto-commit or auto-publish

Add any of these when there's a real want, not in anticipation.

## Files

```
.claude/skills/createpost/SKILL.md    the skill itself
.createpost/                           generated LinkedIn drafts (gitignored)
specs/2026-07-14-createpost-design.md  this document
```

`.gitignore` gains `.createpost/`.

## Testing

The skill is prose, not code, so the check is a real run. `~/Dev/vitals` is the natural
first target: it's a flagship project, it's public, and it has no post yet.

Acceptance:

- questions are grounded in the scan, not generic
- `npm run build` passes with the new post (proves slug, frontmatter, `<h1>`, links)
- `npm run linkcheck` passes (proves no dead URL entered the draft)
- the LinkedIn draft is on the clipboard
- **nothing is committed** — `git status` shows the new files unstaged
- no number appears in the draft that isn't traceable to the repo

Then a harder case: run it against **Corpus** (private repo) and confirm it links
`joaoblasques.com/corpus-docs/` rather than the 404ing repo URL.

## Notes for the implementer

- The repo's own `CLAUDE.md` and the global one still apply. Relevant here: **Corpus's
  knowledge base (`~/Dev/corpus/corpus/`) is never hand-written.** A post *about*
  Corpus is website content and fine; writing into Corpus's knowledge is not.
- Don't commit the vault (`~/Dev/second-brain`) from this session — that's a
  code-repo session, and vault writes belong to the brain session.
- `pbcopy` is macOS-only. It's present here; if the skill ever needs to run elsewhere,
  fall back to writing the file and printing the path rather than failing.
