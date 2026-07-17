---
name: postlinkedin
description: Open LinkedIn and fill in the post compose box and Featured/Projects form with drafts already approved via /createpost. Use when the user says /postlinkedin <slug>, "post this to LinkedIn", or "add the Featured entry" after createpost has drafted them. Fills, never publishes — the human always clicks Post/Save.
argument-hint: "<slug>"
allowed-tools: Bash, Read, AskUserQuestion
---

# /postlinkedin

Takes drafts `/createpost` already wrote and approved, opens LinkedIn in the browser,
and types them into the real UI. **Fills only — never clicks Post or Save.** That click
is the one step that stays entirely yours, same asymmetry as Nora and as `/createpost`
Hard Rule 4.

This is the one narrow exception to "never drive a logged-in browser session" in this
repo. It exists because you explicitly asked for it, on the condition that the actual
publish action is never automated. Don't generalize it to any other action on any other
site.

## Hard rules

1. **Never click Post, Publish, Save, or any equivalent irreversible control.** Fill the
   fields, then stop and hand back to the human. No exceptions, no "just this once."
2. **Never touch login.** If LinkedIn isn't already logged in in the browser session,
   stop and tell the user to log in manually. Never enter credentials, never automate
   2FA, never touch a password field.
3. **Stop on the first broken selector — don't guess.** LinkedIn's UI changes. If a
   click target, button, or field can't be found after one reasonable attempt, stop
   immediately, tell the user exactly what step failed and what you tried, and fall
   back to: "here's the drafted text — paste it in yourself." Do not try three
   alternate selectors hoping one sticks; a wrong guess on a live social account (e.g.
   clicking the wrong button) is worse than asking.
4. **Read the drafts, don't write them.** If `brand/linkedin/posts/<slug>.txt` or
   `brand/linkedin/featured/<slug>.md` don't exist, stop and tell the user to run
   `/createpost` first. Never invent post text here.
5. **One dialog/alert risk area: LinkedIn sometimes shows an "unsaved changes" or
   discard-post confirm dialog.** Per the browser-automation guidance, never trigger or
   click through a JS confirm/alert blindly — if one appears, stop and tell the user.
6. **Type in short chunks and verify each one — don't trust a single long `type` call.**
   The browser's type action has been observed silently dropping characters and spaces
   on longer strings in LinkedIn's fields (a URL lost a letter mid-word; a ~450-word
   description had four separate corruptions — missing letters, missing spaces, words
   run together). Break any field longer than ~15 words into chunks, and after each
   chunk, move the cursor to jump to that chunk's boundary (Home/End, or click) and
   `zoom` on it to visually confirm every character landed — don't just glance at a
   full screenshot, the errors are easy to miss at normal size. Fix a corruption
   immediately (double-click the bad word, retype just that word) before typing the
   next chunk. Never click Post/Save/Add on text that hasn't been chunk-verified this
   way. This applies to every text field this skill fills — URL, title, description,
   and the main post body alike.
7. **Never click from a stale screenshot or a coordinate reused across steps.** The
   page can scroll or reflow between the moment a screenshot was taken and the moment
   the click fires — that's what sent a click meant for "Add section" into the profile
   photo editor instead, with a live Delete button one wrong click away. So: prefer
   `find` (element refs) over raw coordinates wherever it returns a match. When a raw
   coordinate click is unavoidable, take a **fresh** screenshot immediately beforehand
   — never reuse coordinates read off an earlier screenshot or an earlier turn — and
   visually confirm the target element is exactly where you're about to click before
   clicking. After every click that was meant to open something (a modal, a menu, a
   new section), take another screenshot and confirm you landed on the intended
   surface before typing or clicking again. If the landing surface doesn't match what
   was expected, stop per Rule 3 rather than clicking again to "correct" it.

## Phase 1 — Load the drafts

Resolve `<slug>` (the argument). Read both files:
- `brand/linkedin/posts/<slug>.txt` — the post body
- `brand/linkedin/featured/<slug>.md` — title, description, link (format from
  `/createpost` Phase 3: first line is the bold title, then a paragraph, then a bare
  URL on its own line)
- If a logo exists at `brand/logos/<project>/` (a square, stacked mark+wordmark image
  fits LinkedIn's Featured thumbnail best — a wide side-by-side image gets cropped),
  offer to upload it as the Featured entry's thumbnail in Phase 3.

If either is missing, stop and say so — don't partially proceed.

Show the user both drafts one more time in the chat and confirm: *"About to open
LinkedIn and fill these in — you'll review and click Post/Save yourself. Proceed?"*
This is a fresh confirmation each run; an earlier approval of the drafts' content is
not approval to open the browser.

## Phase 2 — Fill the main post

1. Load the Chrome browser tools if not already loaded (`tabs_context_mcp`,
   `navigate`, `computer`, `read_page`, `find`).
2. `tabs_context_mcp` first — reuse an existing LinkedIn tab only if the user's open
   tabs already show one; otherwise open a new tab.
3. Navigate to `https://www.linkedin.com/feed/`.
4. Check the page is actually logged in (a compose/"Start a post" entry point is
   visible). If it looks like a login page, **stop** — tell the user to log in
   manually and re-run the command.
5. Click "Start a post" (or equivalent — use `find`/`read_page` to locate it rather
   than a hardcoded coordinate, since layout shifts).
6. Click into the compose text area, type the contents of the `.txt` file.
7. Take a screenshot or read the page to confirm the text landed correctly (no
   truncation, no stray characters from markdown LinkedIn might auto-format).
8. **Stop.** Tell the user: "Post text is in the compose box on LinkedIn — review it,
   then click Post yourself." Do not click Post. Do not close the tab.

## Phase 3 — Fill the Featured entry

Ask the user once (unless they already said "both" for this run): *"Also fill in the
Featured/Projects entry now?"*

1. Navigate to the user's own profile (`https://www.linkedin.com/in/joaoblasques/`).
2. Find the Featured section. If it doesn't exist yet on the profile, the add-section
   flow is: "Add profile section" → "Recommended" → "Add featured" (LinkedIn's own
   nav, subject to change — use `find`/`read_page`, don't hardcode a path). Take a
   fresh screenshot right before clicking "Add section" (per Rule 6) — the button sits
   near the profile photo, and a stale coordinate can land on the photo editor instead,
   which has a live Delete control next to it.
3. Choose "Add a link" (not "Add a post" — this entry isn't tied to a specific feed
   post). Paste the URL from the featured draft's link line.
4. Once LinkedIn fetches the link preview, fill in the title and description fields
   with the drafted title/description if LinkedIn allows editing them (some link-preview
   flows only let you edit title, not body — fill what's editable, tell the user if a
   field couldn't be set so they can adjust manually).
5. If a logo image exists under `brand/logos/<project>/` and the user wants it used:
   the thumbnail's pencil-edit icon opens a native file picker that browser automation
   can't click through — instead, `find` the hidden `input[type=file]` element near the
   thumbnail, take a screenshot to confirm it's the right one, and use `upload_image`
   with that element's ref. Take a screenshot first with the `computer` tool (not a
   reused ID from an earlier turn — screenshot IDs don't survive a tab-group reset) so
   you have a fresh image to pass to `upload_image`, or read the file directly if the
   tool supports a file path.
6. **Stop before Save/Add.** Tell the user: "Featured entry is filled in — review and
   click Save yourself."

## Phase 4 — Reminders

- Never re-run Phase 2 or 3 automatically if the user reports the fill looked wrong —
  ask what specifically was off and fix that one thing, don't retry blind.
- This skill has no memory of whether a post was actually published. If asked "did we
  already post this," check LinkedIn's own activity feed by reading the page — don't
  guess from local files, since a filled-but-unposted draft leaves no local trace of
  success or failure.
- The Chrome extension's tab group can drop mid-task (observed: `tabs_context_mcp`
  suddenly returns "no tab group exists" with no warning, losing any unsaved form
  state in open tabs). If this happens, don't assume unsaved work survived — reload
  the relevant LinkedIn page and check its actual current state before redoing
  anything; LinkedIn sometimes autosaves further than expected, so verify rather than
  blindly retype.
