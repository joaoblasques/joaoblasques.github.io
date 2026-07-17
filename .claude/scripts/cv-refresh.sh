#!/bin/zsh
# Weekly public-CV refresh. Called Fridays ~17:30 by launchd
# (com.jonas.branding.cv-refresh.plist). Runs /cv-refresh in this repo only —
# never touches the vault, never wired into its brain-review cascade.
#
# DRY_RUN=1 prints the command without invoking claude.
set -u
REPO="$HOME/Dev/joaoblasques.github.io"
CLAUDE="$HOME/.claude/local/node_modules/.bin/claude"
cd "$REPO" || exit 1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] RUN /cv-refresh"
if [ -n "${DRY_RUN:-}" ]; then
  echo "  [dry-run] $CLAUDE -p --dangerously-skip-permissions \"/cv-refresh\""
else
  "$CLAUDE" -p --dangerously-skip-permissions "/cv-refresh"
fi
