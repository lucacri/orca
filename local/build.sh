#!/usr/bin/env bash
# Build and sign Orca.app from this tree: upstream main plus the branches in
# local/branches.sh. Defaults to a personal Orca that replaces the official one.
#
# Untracked on purpose (see .git/info/exclude). Never commit this folder.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$REPO/local/branches.sh"
cd "$REPO"

# The Developer ID in your login keychain. `security find-identity -v -p codesigning`
# lists what is available.
SIGNING_IDENTITY="${SIGNING_IDENTITY:-Developer ID Application: John Homyk (CY7L2E94J3)}"

if ! security find-identity -v -p codesigning | grep -qF "$SIGNING_IDENTITY"; then
  echo "error: signing identity not in keychain: $SIGNING_IDENTITY" >&2
  echo "Available:" >&2
  security find-identity -v -p codesigning >&2
  exit 1
fi

"$REPO/local/integrate.sh"

echo "==> Building Orca, signed with your Developer ID (not notarized)"
export ORCA_MAC_RELEASE=1
# electron-builder rejects the "Developer ID Application:" prefix; codesign takes either.
export CSC_NAME="${SIGNING_IDENTITY#Developer ID Application: }"
pnpm run build:desktop
pnpm run build:computer-macos
pnpm run build:keyboard-layout-macos
pnpm run build:notification-status-macos
pnpm run ensure:electron-runtime
npx electron-builder --config local/electron-builder.arm64.cjs --mac --arm64

echo
echo "==> Built:"
find "$REPO/dist" -maxdepth 2 -name "Orca.app" -print
echo
echo "Install it with:  local/install.sh"
