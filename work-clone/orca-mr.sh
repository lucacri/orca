#!/usr/bin/env bash
# Turn a branch built on the fork's integrated main into a clean pull request.
#
# New worktrees start from the fork's main, which carries every unmerged feature.
# That is what you want while building, and exactly what you do not want in a
# pull request — the diff would include all of it. This replays only the commits
# you actually wrote onto upstream/main, so the PR shows your change alone.
#
# Usage: orca-mr [branch]   (defaults to the current branch)
set -euo pipefail

# Why no cd to a fixed root: branches live in worktrees, and checking one out
# from the clone root fails with "already used by worktree". This runs wherever
# you are, which is the worktree that holds the branch.
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "error: run this from inside the fork checkout or one of its worktrees." >&2
  exit 1
fi
if ! git remote get-url upstream >/dev/null 2>&1; then
  echo "error: no 'upstream' remote here — is this the fork clone?" >&2
  exit 1
fi

BRANCH="${1:-$(git branch --show-current)}"
if [[ -z "$BRANCH" ]]; then
  echo "error: no branch given and HEAD is detached." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "error: commit or clear your changes first." >&2
  exit 1
fi

git fetch -q upstream main
git fetch -q origin main

# Where this branch left the integrated main. Everything after it is yours;
# everything before it is upstream plus the other unmerged features.
FORK_POINT="$(git merge-base "$BRANCH" origin/main)"
MINE="$(git rev-list --count "$FORK_POINT..$BRANCH")"

if [[ "$MINE" == "0" ]]; then
  echo "error: $BRANCH has no commits of its own yet." >&2
  exit 1
fi

echo "==> Replaying $MINE commit(s) from $BRANCH onto upstream/main"
git log --oneline "$FORK_POINT..$BRANCH" | sed 's/^/    /'

[[ "$(git branch --show-current)" == "$BRANCH" ]] || git checkout -q "$BRANCH"
if ! git -c core.hooksPath=/dev/null rebase --onto upstream/main "$FORK_POINT" "$BRANCH"; then
  git rebase --abort
  echo >&2
  echo "error: your commits conflict with upstream/main on their own." >&2
  echo "They likely depend on another unmerged feature. Either rebase onto that" >&2
  echo "branch and say so in the PR, or resolve by hand." >&2
  exit 1
fi

echo "==> Diff against upstream/main is now:"
git diff --stat upstream/main..."$BRANCH" | tail -5

echo
echo "Push and open the PR with:"
echo "  git push -u --force-with-lease origin $BRANCH"
echo "  gh pr create --repo stablyai/orca --base main --head lucacri:$BRANCH"
