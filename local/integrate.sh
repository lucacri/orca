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
# Why fork too: feature branches are written in the separate work clone and
# reach this one only through the fork. Merging fork/<branch> means a push from
# there is all it takes; nothing has to be checked out or created here.
if git remote get-url fork >/dev/null 2>&1; then
  # Why a failure here is tolerated: the fork carries upstream's whole branch set,
  # which contains refs differing only in case — a hard error on a case-insensitive
  # filesystem. Falling back to the refs already on disk only risks an older merge,
  # which the next successful fetch corrects; aborting would block every build.
  git fetch -q fork || echo "  (fork fetch incomplete — using fork refs already on disk)"
fi

echo "==> Rebuilding lucacri/daily from origin/main"
git checkout -B lucacri/daily origin/main

for branch in "${BRANCHES[@]}" "$@"; do
  # Prefer the fork's copy: it is what the work clone pushes and what CI and the
  # pull request see. A purely local branch still works, so a quick experiment
  # never has to be published before you can build it.
  if git rev-parse --verify -q "fork/$branch" >/dev/null; then
    ref="fork/$branch"
  elif git rev-parse --verify -q "$branch" >/dev/null; then
    ref="$branch"
  else
    echo "error: $branch exists neither on the fork nor locally." >&2
    echo "Push it from your work clone, or remove it from local/branches.sh." >&2
    exit 1
  fi

  echo "==> Merging $ref"
  if ! git merge --no-edit "$ref"; then
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
