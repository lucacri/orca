# This is Luca's fork of Orca — read this before hunting for "my changes"

Every worktree under this directory belongs to a **personal fork** of
`stablyai/orca`. That has one consequence worth internalising before you search
anything:

> **`upstream/main` does not contain Luca's work.** If he refers to a feature he
> built and you cannot find it, the overwhelmingly likely reason is that it lives
> on a branch this worktree was not created from — not that it was never built,
> and not that he misremembered.

Do not conclude a feature is absent until you have checked the branches below.

## Remotes

| Remote | Points at |
| --- | --- |
| `origin` | `lucacri/orca` — the fork. Every branch of his lives here. |
| `upstream` | `stablyai/orca` — the real project. Compare against this. |

**`origin/main` is not a mirror of upstream.** It is upstream plus every branch
below, rebuilt on each app build. Worktrees are created from it, which is why
this one already contains his features — but it also means a new branch here
carries all of them.

## His changes

Each branch is one open pull request against upstream. This list goes stale as
they merge, so regenerate it rather than trusting it:

```
gh pr list --repo stablyai/orca --author lucacri --state open
git branch -r --list 'origin/lucacri/*'
```

As of 2026-09-21:

| Branch | PR | What it is |
| --- | --- | --- |
| `lucacri/terminal-size` | #21477 | Caps and centers a tab holding one unsplit terminal |
| `lucacri/own-bundle-id` | #22052 | Reads macOS app identity from the running bundle |
| `lucacri/sqlite-builtin` | #22051 | Treats `node:sqlite` as a builtin in the packaging guard |
| `lucacri/swift-multiarch` | #22050 | Builds the macOS computer-use helper as one multi-arch binary |
| `lucacri/local-only` | — | Never upstreamed. Old side-by-side rename, kept for history. |

## Opening a pull request from here

Never push this branch to a PR as-is: its diff against upstream would include
every other unmerged feature. Run `orca-mr` first. It replays only the commits
written on this branch onto `upstream/main`, so the pull request shows one
change. It refuses, loudly, if those commits do not stand alone — which means
the work genuinely depends on another unmerged branch and that is worth saying
in the PR rather than hiding.

## Finding what a branch actually changed

```
git log --oneline upstream/main..origin/lucacri/<branch>
git diff upstream/main...origin/lucacri/<branch>
```

Use `upstream/main`, not `main` — `origin/main` is the fork's copy and drifts.

## If the code he means is not in this worktree

Say so plainly and ask, rather than searching further or rebuilding it from
scratch. A branch built on an unmerged branch of his is a deliberate choice with
a real cost — the pull request stacks on another unmerged one — so it is his
call, not yours. The options are to branch from that branch, or to merge it in.

## Where the app gets built

Not here. `~/orca/workspaces/orca/beluga` holds the build tooling in an
untracked `local/` directory, and the throwaway `lucacri/daily` branch. Never
edit features there. A new branch reaches the built app by being pushed to the
fork and added to `local/branches.sh`; see `local/UPSTREAM-SYNC.md`.
