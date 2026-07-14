# /createpost Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A repo-scoped `/createpost` skill that turns a project into three reviewed drafts — a website post, a LinkedIn post, and a LinkedIn Featured entry — without committing or publishing anything.

**Architecture:** The deliverable is mostly prose (`SKILL.md`), but it depends on `data/posts.json` being written correctly by a machine. Task 1 hardens the build against malformed data (a real bug found while planning), Task 2 adds a helper that writes the entry safely, Task 3 writes the skill itself, Task 4 is a live acceptance run. Tasks 1–2 are testable code; 3–4 are prose plus a real invocation.

**Tech Stack:** Node 22 (build/check scripts, no deps beyond `marked`), Bash + `gh` CLI, macOS `pbcopy`.

> **Plan location note:** the skill's default is `docs/superpowers/plans/`, but `docs/` **is the published website** here (GitHub Pages serves `main:/docs`). Plans and specs live under `specs/` instead. Same reason the spec does.

## Global Constraints

Copied from `specs/2026-07-14-createpost-design.md`. Every task inherits these:

- **Never invent a metric.** No number in a draft unless the repo proves it.
- **Verify every link before writing it** (`curl -o /dev/null -w '%{http_code}'` or `gh api`).
- **Private repo → link the public destination, never the repo.** Vitals → `https://joaoblasques.com/vitals/`; Corpus (private) → `https://joaoblasques.com/corpus-docs/`; Nora (private) → `https://nora-bennett.com/`.
- **Draft only; the human posts.** No LinkedIn API, no driving a logged-in session.
- **Never hand-edit `docs/`.** It is generated. Write `data/`, run `npm run build`.
- **GitHub handle is `joaoblasques`**, never `jonasblasques`.
- Node scripts stay dependency-free beyond `marked` (build-time only).
- Post genre = *project post*: opens `## Project Overview`, then `## Key Concepts`, then project-specific sections; ~450–950 words; 8–9 tags reusing existing vocabulary.

---

### Task 1: Fail loudly on malformed post data

**Why:** Found while planning. Inserting an entry missing `tags` into `data/posts.json` makes `build.js` die with a raw `TypeError: Cannot read properties of undefined (reading 'slice')` — and because `docs/` still holds the previous run's output, `node check.js` afterwards prints **"✓ all checks passed"**. A green check over a crashed build is the worst possible signal, and `/createpost` writing `posts.json` programmatically makes it far likelier to fire.

**Files:**
- Modify: `build.js` (add validation immediately after the `posts` are loaded, ~line 50)
- Test: `test-posts-validation.js` (new, repo root — matches the existing flat script layout)

**Interfaces:**
- Produces: `validatePosts(posts)` in `build.js` — takes the parsed array, throws `Error` with a human-readable message naming the offending slug and field. Called before any rendering.

- [ ] **Step 1: Write the failing test**

Create `test-posts-validation.js`:

```javascript
#!/usr/bin/env node
// Guards the data contract /createpost writes to. Run: node test-posts-validation.js
const assert = require('assert');
const { validatePosts } = require('./build-lib');

const valid = [{ slug: 'a', title: 'A', date: '2026-01-01', description: 'd', tags: ['x'] }];

// happy path
assert.doesNotThrow(() => validatePosts(valid), 'valid post should pass');

// each required field, missing
for (const field of ['slug', 'title', 'date', 'description', 'tags']) {
  const bad = [{ ...valid[0] }];
  delete bad[0][field];
  assert.throws(() => validatePosts(bad), new RegExp(field),
    `missing "${field}" must throw and name the field`);
}

// tags must be a non-empty array, not a string
assert.throws(() => validatePosts([{ ...valid[0], tags: 'x' }]), /tags/, 'string tags must throw');
assert.throws(() => validatePosts([{ ...valid[0], tags: [] }]), /tags/, 'empty tags must throw');

// date must be YYYY-MM-DD — a bad date silently breaks sort order and the RSS pubDate
assert.throws(() => validatePosts([{ ...valid[0], date: '14-07-2026' }]), /date/, 'bad date format must throw');

// duplicate slugs would overwrite each other's page
assert.throws(() => validatePosts([valid[0], valid[0]]), /duplicate/i, 'duplicate slug must throw');

// the error must name the offending slug, so the message is actionable
try { validatePosts([{ slug: 'oops', title: 'T', date: '2026-01-01', description: 'd' }]); }
catch (e) { assert.ok(e.message.includes('oops'), 'error must name the slug'); }

console.log('✓ posts.json validation: all cases pass');
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node test-posts-validation.js`
Expected: FAIL — `Cannot find module './build-lib'`

- [ ] **Step 3: Create `build-lib.js` with the minimal implementation**

`validatePosts` lives in its own file so the test can require it without executing the build. Create `build-lib.js`:

```javascript
// Shared helpers for build.js and its tests.

const REQUIRED = ['slug', 'title', 'date', 'description', 'tags'];

// The data contract for data/posts.json. /createpost writes this file
// programmatically, so a malformed entry must fail here with a readable message
// rather than as a TypeError deep inside a render function.
function validatePosts(posts) {
  if (!Array.isArray(posts)) throw new Error('posts.json must be an array');

  const seen = new Set();
  for (const [i, p] of posts.entries()) {
    const id = p && p.slug ? `"${p.slug}"` : `entry #${i}`;

    for (const field of REQUIRED) {
      if (p[field] === undefined || p[field] === null) {
        throw new Error(`posts.json: ${id} is missing required field "${field}"`);
      }
    }
    if (typeof p.slug !== 'string' || !/^[a-zA-Z0-9-]+$/.test(p.slug)) {
      throw new Error(`posts.json: ${id} has an invalid "slug" (letters, numbers and hyphens only)`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) {
      throw new Error(`posts.json: ${id} has an invalid "date" — want YYYY-MM-DD, got "${p.date}"`);
    }
    if (!Array.isArray(p.tags) || p.tags.length === 0) {
      throw new Error(`posts.json: ${id} needs "tags" to be a non-empty array`);
    }
    if (seen.has(p.slug)) throw new Error(`posts.json: duplicate slug ${id}`);
    seen.add(p.slug);
  }
  return posts;
}

module.exports = { validatePosts };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node test-posts-validation.js`
Expected: `✓ posts.json validation: all cases pass`

- [ ] **Step 5: Wire it into `build.js`**

In `build.js`, require the helper alongside the other requires near the top:

```javascript
const { validatePosts } = require('./build-lib');
```

Then find this line (~line 50):

```javascript
const posts = readJSON('data/posts.json');
```

and change it to:

```javascript
const posts = validatePosts(readJSON('data/posts.json'));
```

- [ ] **Step 6: Also fail the check when the build didn't run**

The second half of the bug: `check.js` validated a stale `docs/`. Add this to `check.js` immediately after the `const OUT = ...` line:

```javascript
// build.js writes docs/ fresh each run. If it crashed, docs/ holds the PREVIOUS
// run's output and every check below would pass while describing a build that
// never happened. Refuse to validate output older than the data it came from.
const newestData = ['data/posts.json', 'data/profile.json', 'data/repos.json']
  .map((f) => fs.statSync(path.join(__dirname, f)).mtimeMs)
  .reduce((a, b) => Math.max(a, b), 0);
if (!fs.existsSync(path.join(OUT, 'index.html'))) {
  console.log('\n✗ docs/index.html missing — run `node build.js` first\n');
  process.exit(1);
}
if (fs.statSync(path.join(OUT, 'index.html')).mtimeMs < newestData) {
  console.log('\n✗ docs/ is older than data/ — the build did not run or it failed. Re-run `node build.js`.\n');
  process.exit(1);
}
```

- [ ] **Step 7: Verify both halves of the bug are closed**

Run this exact reproduction:

```bash
cp data/posts.json /tmp/pb.json
node -e 'const p=require("./data/posts.json");p.unshift({slug:"x",title:"X",date:"2026-07-14"});require("fs").writeFileSync("data/posts.json",JSON.stringify(p,null,2))'
node build.js; echo "build exit: $?"
node check.js; echo "check exit: $?"
cp /tmp/pb.json data/posts.json && rm -rf docs && npm run build
```

Expected:
- `build.js` prints `posts.json: "x" is missing required field "description"` and exits non-zero (NOT a TypeError stack)
- `check.js` prints `docs/ is older than data/` and exits **1** (NOT "✓ all checks passed")
- the final `npm run build` prints `✓ all checks passed`

- [ ] **Step 8: Commit**

```bash
git add build-lib.js test-posts-validation.js build.js check.js
git commit -m "Fail loudly on malformed posts.json

A post entry missing tags crashed build.js with a raw TypeError, and check.js
then reported '✓ all checks passed' because it was validating the previous
run's stale docs/. A green check over a crashed build is the worst signal
available.

validatePosts() now enforces the data contract with actionable messages, and
check.js refuses to validate output older than the data it came from.

Found while planning /createpost, which writes posts.json programmatically and
so makes this failure much likelier."
```

---

### Task 2: Add the `npm test` entry point

**Files:**
- Modify: `package.json` (the `scripts` block)

**Interfaces:**
- Consumes: `test-posts-validation.js` from Task 1.
- Produces: `npm test` runs both the data-contract test and `check.js`.

- [ ] **Step 1: Update the scripts block**

`npm test` currently only runs `check.js`, which needs a built `docs/`. Make it run the unit test too. In `package.json`, replace:

```json
    "test": "node check.js",
```

with:

```json
    "test": "node test-posts-validation.js && node check.js",
```

- [ ] **Step 2: Verify**

Run: `npm test`
Expected: `✓ posts.json validation: all cases pass` followed by `✓ all checks passed`

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "npm test runs the data-contract test too"
```

---

### Task 3: Write the skill

**Files:**
- Create: `.claude/skills/createpost/SKILL.md`
- Modify: `.gitignore` (add `.createpost/`)

**Interfaces:**
- Consumes: `validatePosts` behaviour from Task 1 (the skill relies on `npm run build` failing loudly on a bad entry it writes).
- Produces: the `/createpost` command.

- [ ] **Step 1: Add the gitignore entry**

Append to `.gitignore`, after the `node_modules/` line:

```
# /createpost LinkedIn drafts — local only, never published
.createpost/
```

- [ ] **Step 2: Write `.claude/skills/createpost/SKILL.md`**

```markdown
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
```

- [ ] **Step 3: Verify the skill is registered**

Run: `ls -la .claude/skills/createpost/SKILL.md && head -5 .claude/skills/createpost/SKILL.md`
Expected: the file exists and the frontmatter shows `name: createpost`.

- [ ] **Step 4: Verify `.createpost/` is ignored**

```bash
mkdir -p .createpost && touch .createpost/probe.txt
git status --porcelain .createpost
rm -rf .createpost
```

Expected: **no output** from `git status` (the directory is ignored).

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/createpost/SKILL.md .gitignore
git commit -m "Add /createpost skill

Drafts a website post, a LinkedIn post, and a LinkedIn Featured entry from a
repo. Scans first, asks at most 3 grounded questions, drafts, builds, stops
before commit.

Hard rules encode what already went wrong on this site: no invented metrics,
verify every link, private repos link their public docs site, drafts only."
```

---

### Task 4: Acceptance run against a real project

**Why:** The skill is prose. The only meaningful test is running it.

**Files:** none created directly — this exercises Task 3.

- [ ] **Step 1: Run it against Vitals**

`~/Dev/vitals` is the natural first target: flagship, public, and it has no post yet.

Run: `/createpost ~/Dev/vitals`

- [ ] **Step 2: Check the acceptance criteria**

- [ ] questions were grounded in the scan, not generic
- [ ] `npm run build` passed with the new post
- [ ] `npm run linkcheck` passed
- [ ] the LinkedIn draft is on the clipboard (`pbpaste | head -3`)
- [ ] `git status` shows the new files **unstaged and uncommitted**
- [ ] no number in the draft is untraceable to the repo
- [ ] the post reads like the existing project posts, not like generic AI prose

- [ ] **Step 3: Check the hard case — a private repo**

Run: `/createpost ~/Dev/corpus`

Expected: the drafts link `https://joaoblasques.com/corpus-docs/`, **never**
`https://github.com/joaoblasques/corpus` (private → 404 for every reader).

Verify: `grep -r "github.com/joaoblasques/corpus" .createpost/ data/posts/` returns nothing.

- [ ] **Step 4: Decide on the drafts**

The drafts are the user's to accept, edit, or discard. Do not commit them as part of
implementing this plan — that would violate the skill's own rule 7.

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Invocation (path / slug / cwd) | 3, Phase 1 |
| Phase 1 scan | 3 |
| Phase 2 ≤3 grounded questions | 3 |
| Phase 3 three artifacts | 3 |
| Phase 4 build, verify, stop | 3 |
| Slug rules incl. no-overwrite | 3, Phase 1 |
| Hard rules 1–6 | 3 (verbatim in SKILL.md) |
| `.gitignore` gains `.createpost/` | 3, Step 1 |
| Testing / acceptance | 4 |
| Two post genres, 7 project posts | 3, Phase 3 |
| Private repo mapping | 3, rule 3; verified in 4, Step 3 |

Not in the spec, added by this plan: **Task 1** (malformed-data hardening). Justified —
found by reproducing the failure while planning, and `/createpost` writing `posts.json`
programmatically is precisely what makes it likely.

**Placeholder scan:** none. Every code step contains the actual code; every command has
its expected output.

**Type consistency:** `validatePosts(posts)` is defined in Task 1 (`build-lib.js`),
consumed in Task 1 Step 5 (`build.js`) and Task 1 Step 1 (the test). The required-field
list (`slug`, `title`, `date`, `description`, `tags`) matches the actual `posts.json`
shape, verified against the live file.
