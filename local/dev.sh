#!/usr/bin/env bash
# Run upstream's own dev environment with your MR branches applied on top.
#
# No packaging and no signing — this is `pnpm dev` on an integrated tree. Use
# local/update.sh instead for the installed app, which is the normal path.
#
# Untracked on purpose (see .git/info/exclude). Never commit this folder.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
"$REPO/local/integrate.sh"

echo "==> Starting dev environment"
cd "$REPO"
exec pnpm dev
