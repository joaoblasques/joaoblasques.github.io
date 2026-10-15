#!/bin/zsh
# Weekly public-CV refresh. Called Fridays ~17:30 by launchd
# (com.jonas.branding.cv-refresh.plist). Runs /cv-refresh in this repo only —
# never touches the vault, never wired into its brain-review cascade.
#
# DRY_RUN=1 prints the command without invoking claude.
set -u
REPO="$HOME/Dev/joaoblasques.github.io"
# Locate the claude CLI (launchd/systemd have no shell PATH); survives reinstall layout changes.
CLAUDE=""
for c in "${CLAUDE_BIN:-}" "$HOME/.local/bin/claude" "$HOME/.claude/local/claude" \
         "$HOME/.claude/local/node_modules/.bin/claude" "$(command -v claude 2>/dev/null)"; do
  if [ -n "$c" ] && [ -x "$c" ]; then CLAUDE="$c"; break; fi
done
[ -n "$CLAUDE" ] || { echo "claude CLI not found" >&2; exit 1; }
cd "$REPO" || exit 1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] RUN /cv-refresh"
if [ -n "${DRY_RUN:-}" ]; then
  echo "  [dry-run] $CLAUDE -p --dangerously-skip-permissions \"/cv-refresh\""
else
  "$CLAUDE" -p --dangerously-skip-permissions "/cv-refresh"
fi
