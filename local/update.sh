#!/usr/bin/env bash
# One command: pull upstream, rebuild Orca, install it, leave the app as it
# found it.
#
# Untracked on purpose (see .git/info/exclude). Never commit this folder.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$REPO/local/branches.sh"

# Why build first: a failed build must never leave you without the app you would
# use to investigate it. Nothing outside the repo is touched until a bundle exists.
"$REPO/local/build.sh"

# Why probe here and not before the build: the build takes minutes, and opening
# the app during one would strand the install on its own running-app refusal.
reopen=false
if pgrep -x Orca >/dev/null; then
  echo "==> Quitting Orca"
  reopen=true
  osascript -e "tell application \"Orca\" to quit" || true
  for _ in $(seq 1 30); do
    pgrep -x Orca >/dev/null || break
    sleep 0.5
  done
  if pgrep -x Orca >/dev/null; then
    echo "error: Orca still running after 15s. Quit it, then run:" >&2
    echo "  local/install.sh" >&2
    exit 1
  fi
fi

"$REPO/local/install.sh"

if [[ "$reopen" == true ]]; then
  echo "==> Reopening Orca"
  open -a "/Applications/Orca.app"
fi
