#!/usr/bin/env bash
# The one command. Sync your branches with upstream, then rebuild and reinstall
# the app. Symlinked onto PATH as `orca-update`, so it runs from any directory.
#
# Untracked on purpose (see .git/info/exclude). Never commit this folder.
set -euo pipefail

REPO="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/.." && pwd)"

# Why this can stop the run: sync exits non-zero when a branch would not rebase
# onto the new upstream. Building anyway would merge the same conflict into the
# throwaway integration branch, where resolving it never reaches the merge request.
"$REPO/local/sync-upstream.sh"

"$REPO/local/update.sh"
