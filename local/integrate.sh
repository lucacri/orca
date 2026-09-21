#!/usr/bin/env bash
# Rebuild lucacri/daily as: latest upstream main, with every branch in
# local/branches.sh merged on top. This is the branch you build or run.
#
# Extra branch names may be passed as arguments and are merged after the shared
# list — that is how build-beluga.sh adds its separate-app identity patches
# without a dev run ever seeing them.
#
# Merging (not rebasing) is deliberate here: daily is disposable and rebuilt from
# scratch each run, so its history does not matter, and a merge leaves the MR
# branches themselves untouched. local/sync-upstream.sh is what rebases those.
#
# Untracked on purpose (see .git/info/exclude). Never commit this folder.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$REPO/local/branches.sh"
cd "$REPO"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "error: $REPO has uncommitted changes. Commit or clear them first." >&2
  exit 1
fi

echo "==> Fetching upstream"
git fetch origin main

echo "==> Rebuilding lucacri/daily from origin/main"
git checkout -B lucacri/daily origin/main

for branch in "${BRANCHES[@]}" "$@"; do
  echo "==> Merging $branch"
  if ! git merge --no-edit "$branch"; then
    git merge --abort
    echo >&2
    echo "error: $branch conflicts with upstream." >&2
    echo "Resolve it ON THAT BRANCH so the fix reaches the MR too:" >&2
    echo "  local/sync-upstream.sh" >&2
    echo "See local/UPSTREAM-SYNC.md." >&2
    exit 1
  fi
done

echo "==> Installing dependencies"
pnpm install
