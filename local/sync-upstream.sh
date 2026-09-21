#!/usr/bin/env bash
# Rebase every branch in local/branches.sh onto the latest upstream main, push the
# result to your fork, and say plainly which ones a human still has to touch.
# Changes no worktree files.
#
# `origin` is upstream (stablyai) and `fork` is yours — backwards from the usual
# GitHub convention, but it means "origin/main" means what it says everywhere.
#
# Run this first, whenever upstream has moved. Integration (local/integrate.sh)
# merges these branches, so a branch left behind here is a conflict later.
#
# Untracked on purpose (see .git/info/exclude). Never commit this folder.

# Deliberately no -e: the point is to survey every branch, not stop at the first
# one that conflicts.
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$REPO/local/branches.sh"
cd "$REPO"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "error: $REPO has uncommitted changes. Commit or clear them first." >&2
  exit 1
fi

started_on="$(git branch --show-current)"
echo "==> Fetching upstream"
git fetch origin main || exit 1

# Why --force-with-lease and not --force: a rebase rewrites history the fork
# already has, so a plain push is refused; --force-with-lease still refuses if
# someone else moved the branch since you last fetched it.
push_to_fork() {
  local branch="$1"
  git remote get-url fork >/dev/null 2>&1 || return 0
  git push --force-with-lease -q fork "$branch:$branch" 2>/dev/null && return 0
  echo "    (push to fork failed — back this up before you lose it)"
}

blocked=()
# Beluga-only branches are rebased too, so switching back later stays painless.
for branch in "${BRANCHES[@]}" "${BELUGA_ONLY_BRANCHES[@]}"; do
  base="$(git merge-base "$branch" origin/main)"
  if [[ "$(git rev-list --count "$base"..origin/main)" == "0" ]]; then
    echo "  $branch: already current"
    push_to_fork "$branch"
    continue
  fi

  # A branch checked out in another worktree cannot be rebased from here; git
  # refuses the checkout, and a loop that ignores that silently skips the branch.
  host="$(git worktree list --porcelain | awk -v want="branch refs/heads/$branch" '
    /^worktree /{ wt = substr($0, 10) }
    $0 == want   { print wt; exit }
  ')"

  if [[ -n "$host" && "$host" != "$REPO" ]]; then
    echo "  $branch: rebasing in its own worktree ($host)"
    if git -C "$host" -c core.hooksPath=/dev/null rebase origin/main >/dev/null 2>&1; then
      echo "    ok"
      push_to_fork "$branch"
    else
      git -C "$host" rebase --abort >/dev/null 2>&1
      blocked+=("$branch (in $host)")
      echo "    CONFLICT"
    fi
    continue
  fi

  git checkout -q "$branch" 2>/dev/null || { blocked+=("$branch (cannot check out)"); continue; }
  if git -c core.hooksPath=/dev/null rebase origin/main >/dev/null 2>&1; then
    echo "  $branch: rebased"
    push_to_fork "$branch"
  else
    echo "  $branch: CONFLICT on:"
    git diff --name-only --diff-filter=U | sed 's/^/      /'
    git rebase --abort >/dev/null 2>&1
    blocked+=("$branch")
  fi
done

[[ -n "$started_on" ]] && git checkout -q "$started_on"

echo
if [[ ${#blocked[@]} -eq 0 ]]; then
  echo "All branches sit on top of origin/main. Safe to integrate."
  exit 0
fi

echo "Needs a human — resolve ON THE BRANCH so the fix reaches the MR too:"
for entry in "${blocked[@]}"; do
  echo "  $entry"
done
echo
echo "See local/UPSTREAM-SYNC.md for what to do with each one."
exit 1
