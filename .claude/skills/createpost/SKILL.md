---
name: createpost
description: Draft a website post, a LinkedIn post, and a LinkedIn Featured entry about one of João's projects. Use when the user says /createpost, "write a post about <project>", "post about this repo", or wants to announce a project on the site and LinkedIn. Drafts only — never publishes.
argument-hint: "[repo path, owner/repo, or nothing for cwd]"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion, WebFetch
---

# /createpost

Turn a project into three drafts: a post for joaoblasques.com, a LinkedIn post, and a
LinkedIn Featured/Projects entry. **You draft. The human reviews, edits and publishes.**

Design: `specs/2026-07-14-createpost-design.md`.

## Hard rules — these are not negotiable

Each one is here because it already went wrong on this site.

1. **Never invent a metric.** If the repo doesn't prove a number, it doesn't appear.
   No "5TB daily", no "+35% relevance", no "saved €2.1M". Unverifiable client metrics
   were removed from this site by hand; do not reintroduce the genre.
2. **Verify every link before you write it.** Check with
   `curl -s -o /dev/null -m 10 -L -w '%{http_code}'`. Four "projects" (`datastreampy`,
   `ml-monitor`, `data-quality-framework`, an NLP demo) were advertised for months
   while 404ing. Never again.
3. **Private repo → link the public destination, never the repo.** Check first:
   `gh api repos/joaoblasques/<repo> --jq .visibility`

   | Project | Repo | Link this instead |
   |---|---|---|
   | Vitals | public | `https://joaoblasques.com/vitals/` |
   | Corpus | **private** | `https://joaoblasques.com/corpus-docs/` |
   | Nora | **private** | `https://nora-bennett.com/` |

   No public destination? Say so and ask. Don't link a 404; don't silently drop it.
4. **Draft only.** No LinkedIn API, no driving a logged-in browser session. Same
   asymmetry as Nora: the machine drafts, the human sends.
5. **Never hand-edit `docs/`** — it's generated. Write `data/`, run `npm run build`.
6. **The GitHub handle is `joaoblasques`**, never `jonasblasques` (the nickname has
   been typo'd into a live link before).
7. **Never commit or push.** Leave everything staged for the human.

## Phase 1 — Scan (no questions yet)

Resolve the target: `$1` as a local path, or `owner/repo` (shallow-clone to a temp dir
if not local), or cwd if it's a git repo.

Read enough to write from fact:
- `README.md` — usually the best raw material; the project's own framing
- Repo tree, depth 3, ignoring `node_modules/`, `.git/`, build output
- `git log --oneline -30` — what's actually been happening
- `.github/workflows/*` — what's really tested and deployed
- `pyproject.toml` / `requirements.txt` / `package.json` — the real stack
- `gh api repos/<owner>/<repo> --jq '{visibility,description,language,homepage}'`

Decide the slug now (the LinkedIn post links to it):
- kebab-case, derived from the project; it need not equal the repo name
  (`mbta-on-time-lakehouse` → `mbta-otp-lakehouse`)
- **If `data/posts/<slug>.md` exists, STOP and ask.** Never overwrite a post.
- Confirm the slug with the user when the repo name is long or ambiguous.

## Phase 2 — Ask at most 3 questions

The scan gives you the *what*. Ask for the *why* and the war story — the things that
make a post worth reading and that no scan can reach. From the MBTA post:

> "The system caught its own bug." — the failure-monitor catching a real OOM
> "One deep project rather than a pile of toy demos." — the actual motivation

**Every question must be grounded in something you found.**

Good: *"I see `failure_monitor.py` with a retry path and issue-filing — did it ever
catch something real in production?"*

Bad: *"What was challenging about this project?"* — could be asked of any repo.

Use AskUserQuestion. Ask **at most 3**, in one message. If the user has nothing to
add, proceed — a flatter post is fine; a fabricated one is not.

## Phase 3 — Draft three artifacts

### Website post → `data/posts/<slug>.md` + an entry in `data/posts.json`

Read two or three existing project posts first (`data/posts/mbta-otp-lakehouse.md`,
`data/posts/customer-analytics-pipeline.md`) as the live template. The house style is
whatever they currently are, not what this file says they were.

The 11 posts are two genres — write the **project post**:

| Genre | Count | Length | Tags | Shape |
|---|---|---|---|---|
| **Project post** ← write this | 7 | 432–1,574w (median 638) | 8–9 | 7/7 open `## Project Overview`; 6/7 have `## Key Concepts` |
| Essay / intro | 4 | 177–251w | 2–3 | No template |

- Open `## Project Overview`, then `## Key Concepts`
- After that, **let the project dictate the sections** — only `## Architecture`
  recurs across posts; there is no checklist to fill
- ~450–950 words
- 8–9 tags. Reuse existing vocabulary from `posts.json` (42 tags exist; `data
  engineering`, `docker`, `bigquery`, `gcp` are the common ones) so tag pages
  aggregate instead of fragmenting
- The `.md` body has **no frontmatter** — metadata lives in `posts.json`
- `posts.json` entry: `slug`, `title`, `date` (YYYY-MM-DD), `description`, `tags`.
  Insert in date-descending order — the file is sorted newest-first.

### LinkedIn post → `.createpost/<slug>-linkedin.txt`

- Hook first. 150–250 words. Plain text — LinkedIn strips markdown.
- Link to the post on joaoblasques.com, not the raw repo: the site is the destination.
- ≤3 hashtags, only real ones. No hashtag spam.
- Copy to clipboard: `pbcopy < .createpost/<slug>-linkedin.txt`

### Featured entry → `.createpost/<slug>-linkedin-featured.md`

Title, one-paragraph description, link — shaped for pasting into LinkedIn's
Projects/Featured section.

## Phase 4 — Build, verify, stop

1. `npm run build` — fails loudly on a bad slug or malformed `posts.json` entry
2. `npm run linkcheck` — every external link in the draft must resolve
3. Tell the user: the three file paths, the preview path (`/post/<slug>/`), and that
   the LinkedIn text is on their clipboard
4. **STOP.** Do not commit. Do not push.
5. Ask once: *"Add this to Pinned (`repos.json`) and the Projects page too?"* On yes,
   make those edits and leave them uncommitted as well.

## Reminders

- The repo's `CLAUDE.md` still applies. Writing a post *about* Corpus is website
  content and fine; writing into Corpus's own knowledge base (`~/Dev/corpus/corpus/`)
  is forbidden — the corpus authors its own knowledge.
- `pbcopy` is macOS-only. Elsewhere, write the file and print the path.
