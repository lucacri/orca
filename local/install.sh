#!/usr/bin/env bash
# Install the freshly built Orca.app into /Applications.
#
# Never delete the installed app before copying the new one: a failed copy over
# the hole you just made leaves you with no app at all — including the one you
# would use to investigate. Instead: stage beside the destination, verify, swap
# by rename, and keep the displaced bundle for a one-command rollback.
#
# Untracked on purpose (see .git/info/exclude). Never commit this folder.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$REPO/local/branches.sh"

SRC="$(find "$REPO/dist" -maxdepth 2 -name "Orca.app" -print -quit)"
DEST="/Applications/Orca.app"
STAGE="/Applications/.Orca.app.incoming"
PREVIOUS="/Applications/.Orca.app.previous"

if [[ -z "$SRC" ]]; then
  echo "error: no built Orca.app under $REPO/dist — run local/build.sh first." >&2
  exit 1
fi

if pgrep -x Orca >/dev/null; then
  echo "error: quit Orca before replacing it." >&2
  exit 1
fi

echo "==> Staging $SRC"
rm -rf "$STAGE"
cp -R "$SRC" "$STAGE"

echo "==> Verifying signature before it replaces anything"
codesign --verify --deep --strict "$STAGE"
spctl --assess --type execute "$STAGE" || echo "  (note: spctl rejects an un-notarized build; expected here)"

echo "==> Swapping"
rm -rf "$PREVIOUS"
[[ -e "$DEST" ]] && mv "$DEST" "$PREVIOUS"
mv "$STAGE" "$DEST"

echo "Installed $DEST"
if [[ -e "$PREVIOUS" ]]; then
  echo "Previous build kept at $PREVIOUS — roll back with:"
  echo "  rm -rf '$DEST' && mv '$PREVIOUS' '$DEST'"
fi
