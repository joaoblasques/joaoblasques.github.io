# joaoblasques.com

Personal site — plain HTML + CSS + JS. No framework, no Hugo, no theme submodule.

Served by GitHub Pages from **`main` → `/docs`**. GitHub runs no build: `docs/` is
committed HTML, so whatever is in there is what's live.

## Editing the site

Everything the site shows comes from `data/`. You should never need to touch HTML.

| To change… | Edit | Then |
|---|---|---|
| A blog post | `data/posts/<slug>.md` | `npm run build` |
| Add a post | new `data/posts/<slug>.md` + an entry in `data/posts.json` | `npm run build` |
| Name, bio, links, location | `data/profile.json` | `npm run build` |
| Pinned repos | `data/repos.json` | `npm run build` |
| Projects / Skills / About | `data/pages/<name>.md` | `npm run build` |
| The README on the homepage | `data/pages/readme.md` | `npm run build` |

```sh
npm install        # once — installs marked (build-time only)
npm run build      # regenerate docs/ and run checks
npm run serve      # build + preview at http://localhost:8080
git add -A && git commit && git push    # this is the deploy
```

A post entry in `data/posts.json`:

```json
{
  "slug": "my-post",
  "title": "My Post",
  "date": "2026-07-14",
  "description": "One-line summary, shown in lists and search results.",
  "tags": ["data engineering", "dbt"]
}
```

The `slug` must match the filename in `data/posts/`. Tag pages are generated
automatically from the `tags` you use.

## Contribution heatmap

`data/contributions.json` is a snapshot of real GitHub contribution data. Refresh it
whenever you want current numbers (needs `gh` authenticated):

```sh
npm run refresh    # re-fetch + rebuild + check
```

It's a committed snapshot, not a live API call, so the page stays fast and works
offline. It goes stale until you re-run it — that's the trade.

## Checks

`npm run build` runs `check.js` afterwards. It fails the build if:

- any URL the old Hugo site served would now 404 (guards search rankings)
- `CNAME` is missing or wrong (guards the custom domain)
- a page has zero or multiple `<h1>`, or is missing `<title>`/canonical
- post bodies aren't in the served HTML (guards the SEO reason we build at all)
- the heatmap data is empty or malformed

Run standalone with `npm test`.

### Link checking

`check.js` is offline and instant, so it only covers *internal* links. External links
(GitHub repos, docs sites) need the network, so they're a separate on-demand run:

```sh
npm run linkcheck    # pings every external link; non-zero exit if any are dead
```

Worth running before a deploy, or after editing links. It separates genuinely dead
links from ones pointing at pages that exist in this build but aren't merged to the
live site yet — the latter are expected and reported apart. LinkedIn is skipped
(it returns 999 to any non-browser request).

This exists because four "projects" advertised on the old site — `datastreampy`,
`ml-monitor`, `data-quality-framework`, and an NLP demo — had 404'd for a long time
without anyone noticing.

## Layout

```
build.js       generates docs/ from data/
check.js       post-build assertions
lib/layout.js  page shell: header, nav, sidebar, footer
lib/icons.js   octicon paths
assets/        styles.css, app.js (theme toggle + search), img/
data/          all content — JSON + Markdown
docs/          GENERATED. Never hand-edit; build.js overwrites it.
```

Theme: one stylesheet, CSS custom properties, `data-theme` on `<html>`, persisted to
`localStorage['jb-theme']`, defaults to `prefers-color-scheme`. An inline `<head>`
script applies it before first paint so there's no flash.
