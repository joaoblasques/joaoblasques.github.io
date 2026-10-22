## Project Overview

[Terminal-Craft](https://joaoblasques.com/terminal-craft/) is a ten-lesson curriculum I built and
drilled on myself to fix a specific problem: **in heavy AI-coding work, the bottleneck is the
keyboard, not the model.**

Running several agents at once, reviewing long generated diffs, jumping around large files fast —
none of that is a model capability problem. It's terminal fluency, and it's fixable with tools that
have existed for decades, used properly. So I sat down and learned tmux and nvim on purpose, in
public, with the friction logged instead of edited out.

The result is [a site documenting all ten lessons](https://joaoblasques.com/terminal-craft/), three
living cheatsheets, and — the part I didn't plan — a repo that ended by deleting its own configs.

---

## Key Concepts

- **Every lesson opens with a floor question, not a command list.** A concrete situation from real
  AI-coding work ("wifi drops mid-session on a remote box running a long job — does tmux know you
  left?"), then the answer gets derived one step at a time rather than handed over. Where something
  genuinely can't be derived — raw keystroke conventions, new syntax — it's taught directly and
  flagged as such.
- **Blast radius decides the construct.** The most reused idea in the whole curriculum came from a
  detour in Lesson 3. Pane = same task, both things visible at once. Window = different task, shared
  blast radius is fine. Session = different enough that a crash in one must never touch the other.
  That's the same isolation principle I already apply to code repos, applied to the terminal: one
  session per project.
- **Macros are about consistency, not keystrokes.** The junior framing is "it saves typing" — true,
  but it doesn't explain why a macro beats doing it by hand. The real value is guaranteed identical
  execution on every repeat, so correctness doesn't quietly degrade on repeat nine of fifteen the
  way manual repetition does. That matters specifically for AI-code review, which often means the
  same fix applied uniformly everywhere it's needed.
- **Modern CLI tools add context, not polish.** One pattern, confirmed four separate times: a
  git-aware lister queries git per file because it was built to, and `ls` predates git entirely and
  has no way to ask. A gitignore-aware search skips `node_modules/`; `grep` has no concept of a
  gitignore file. A frecency-ranked jumper remembers what you use; `cd` has no memory at all. They
  aren't prettier — they can see things the tools they replace were built before.
- **Every lesson ended with a live drill.** Not read about, not discussed. Typed.

---

## Architecture

The project is three phases, ten lessons, and a deliberate refusal to build an IDE:

```
Phase 1 — tmux    Sessions, windows, panes · detach/reattach across real
                  disconnects · layouts for running agents side by side
Phase 2 — nvim    Motions, registers, macros · multi-file navigation ·
                  search/replace · basic LSP
Phase 3 — shell   History, aliases, functions, PATH · modern CLI tools ·
                  dotfiles as a real migration system
```

One hard constraint held throughout: **no plugin manager, no IDE rebuild.** Nine of the ten lessons
ran on a completely untouched baseline config. Lesson 7 was the only one that required real setup —
a language server, wired in for the first time, 44 lines. Editing fluency was the goal; recreating
VS Code inside a terminal was explicitly not.

---

## The lesson that broke the curriculum

Lesson 4 was motions, registers and macros. The first live attempt fell apart.

Not because macros are hard — because the curriculum had never taught **mode-switching or undo**,
both of which are more foundational than anything the lesson was about. A confusion cascade
followed: the terminal's own UI chrome was masking vim's mode indicator, and the actual signal
turned out to be cursor shape, not status text. Which produced a real, unglamorous moment of *"I
don't know how to undo this."*

It got resolved with one keystroke — `u`. The session paused there on purpose, and resumed later
with mode-switching and undo taught first, from zero.

I'm keeping that in the write-up because it's the most useful thing the project produced. A
curriculum that sequences macros before undo has a real defect, and the only way to find it was to
run the lesson live and fail at it. A tutorial that never breaks is usually a tutorial nobody
actually tried.

It wasn't the only one. In Lesson 3 a claim I'd made earlier — "4 preset layouts" — turned out to be
wrong when I checked `tmux list-keys` against the real config mid-drill. There are five. Corrected on
the spot rather than smoothed over.

---

## A clean type-check is not proof of correctness

The sharpest technical insight came from Lesson 7. With a language server finally running, I planted
a bug in the practice code to see it work. It was caught instantly.

The file's actual pre-existing bug — a parameter no caller ever passed — was invisible to the type
checker the entire time. It never flagged it once.

That's not a flaw in the tool. It's a different and harder problem than type-checking, and worth
knowing precisely when you're leaning on tooling to review code you didn't write yourself. The
silence of a checker tells you what it checked, not that the code is right.

---

## How it ended: the repo deleted its own configs

Terminal-Craft finished in a way I didn't design.

The `tmux.conf` and `nvim/init.lua` that the lessons had built up incrementally are no longer in the
repo. They moved to `~/.dotfiles`, which is now the single source of truth. The migration doc that
used to live here in full is now four lines pointing somewhere else — because that repo already had
a more mature bootstrap script than the one this project was starting to grow, and duplicating it
would have been the worse outcome.

What Lesson 10 genuinely added — tracking Mac App Store apps, which a package manager is
structurally blind to, and which surfaced 30 real apps including ones in daily use — got folded into
the dotfiles repo directly instead of being maintained twice.

So what's left here is the curriculum, the cheatsheets, and the friction log. Which is correct: this
was a **learning** repo, and it declined to quietly become a config repo. The learning stayed, the
artifacts went where they belonged.

---

## Takeaway

The curriculum is complete at 10/10, with one post-curriculum addition (netrw) whose hands-on drill I
still owe — it was done verbally, from a phone, and the site says so.

There's no fixed count beyond this. The next lesson only happens if a real gap surfaces from actually
using the tools, the same way Lesson 3's best idea came from a detour nobody planned. Until then the
work is reinforcement: use it, don't just remember it.

The broader point I'd make to anyone doing serious AI-assisted work: the leverage you're missing is
often not a better model or a better prompt. It's that you're reading a 400-line diff with arrow
keys.
