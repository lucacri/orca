#!/usr/bin/env bash
# One-time copy of your Orca profile into Beluga's, so the fork opens with your
# settings, projects and worktrees instead of a blank slate.
#
# Run with BOTH apps quit. Untracked on purpose; never commit this folder.
set -euo pipefail

SRC="$HOME/Library/Application Support/orca"
DEST="$HOME/Library/Application Support/Beluga"

if pgrep -x Orca >/dev/null || pgrep -x Beluga >/dev/null; then
  echo "error: quit Orca and Beluga first — copying a live profile can capture" >&2
  echo "half-written state." >&2
  exit 1
fi

if [[ ! -d "$SRC" ]]; then
  echo "error: no profile at $SRC" >&2
  exit 1
fi

if [[ -e "$DEST" ]]; then
  echo "error: $DEST already exists. Remove it first if you really want to reseed." >&2
  exit 1
fi

# Excluded on purpose:
#   daemon/          live socket, token and pid of the OFFICIAL app's terminal
#                    daemon. Copying it would point Beluga at Orca's daemon and
#                    let one replace the other's sessions.
#   orca-runtime.json / agent-hooks/  RPC + hook discovery for whichever app is
#                    running; stale copies misdirect the CLI and agent hooks.
#   Singleton*       Chromium's instance lock, meaningless in a new profile.
#   speech-models/   1.2GB of redownloadable models; only needed if you dictate.
#   logs/ Cache/ GPUCache/  regenerate on their own, and 1.7GB copies slowly.
rsync -a \
  --exclude 'daemon/' \
  --exclude 'orca-runtime.json' \
  --exclude 'agent-hooks/' \
  --exclude 'Singleton*' \
  --exclude 'speech-models/' \
  --exclude 'logs/' \
  --exclude 'Cache/' \
  --exclude 'GPUCache/' \
  "$SRC/" "$DEST/"

echo "Seeded $DEST"
du -sh "$DEST"
echo
echo "Skipped speech models, caches and logs — Beluga regenerates or redownloads"
echo "them. Dictation will refetch its model on first use." 
