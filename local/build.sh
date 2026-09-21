#!/usr/bin/env bash
# Build and sign $APP_NAME.app from this tree: upstream main plus the branches in
# local/branches.sh. Defaults to a personal Orca that replaces the official one.
#
# Untracked on purpose (see .git/info/exclude). Never commit this folder.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$REPO/local/branches.sh"
source "$REPO/local/app.sh"
cd "$REPO"

if ! security find-identity -v -p codesigning | grep -qF "$SIGNING_IDENTITY"; then
  echo "error: signing identity not in keychain: $SIGNING_IDENTITY" >&2
  echo "Available:" >&2
  security find-identity -v -p codesigning >&2
  exit 1
fi

"$REPO/local/integrate.sh" ${EXTRA_BRANCHES[@]+"${EXTRA_BRANCHES[@]}"}

echo "==> Building $APP_NAME, signed with your Developer ID (not notarized)"
export ORCA_MAC_RELEASE=1
# electron-builder rejects the "Developer ID Application:" prefix; codesign takes either.
export CSC_NAME="${SIGNING_IDENTITY#Developer ID Application: }"
pnpm run build:desktop
pnpm run build:computer-macos
pnpm run build:keyboard-layout-macos
pnpm run build:notification-status-macos
pnpm run ensure:electron-runtime
npx electron-builder --config "$BUILDER_CONFIG" --mac --arm64

echo
echo "==> Built:"
find "$REPO/dist" -maxdepth 2 -name "$APP_NAME.app" -print
echo
echo "Install it with:  local/install.sh"
