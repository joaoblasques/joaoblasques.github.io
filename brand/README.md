# brand/

Everything related to João's external/professional image that isn't part of the
website build itself: LinkedIn drafts, generated logos, and other brand assets.

This is tracked in git (public, like the rest of this repo) — nothing sensitive
belongs here.

## Layout

```
brand/
├── linkedin/
│   ├── posts/<slug>.txt        LinkedIn post body, one file per project
│   └── featured/<slug>.md      LinkedIn Featured/Projects entry (title, description, link)
└── logos/<project>/            Generated logo images for a project
```

`<slug>` matches the corresponding website post's slug in `data/posts/<slug>.md`,
so a LinkedIn draft and its website write-up are easy to find side by side.

## How this gets populated

- `/createpost` writes the `linkedin/posts/` and `linkedin/featured/` drafts.
- `/postlinkedin` reads those drafts to fill in LinkedIn's UI (never publishes).
- Logo images are generated ad hoc (see `.claude/skills/` for how one was built
  for Vitals: extracting the real SVG/CSS from the live site and rendering it
  with `cairosvg`, rather than screenshotting or guessing at a design).
