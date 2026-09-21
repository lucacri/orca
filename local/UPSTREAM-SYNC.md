# Keeping this fork on top of upstream

This tree is **upstream's code plus a few branches**, each of which is a merge
request waiting on the maintainers. Nothing here is a product of its own. When an
MR lands upstream, delete its line from `local/branches.sh` and it stops being
yours to carry.

The daily driver is **your own build of Orca, replacing the official install**.
It keeps upstream's identity — same name, same bundle id — so nothing in the
source tree is renamed and the fork carries **no patches to upstream code at
all**, only the four MR branches. The official update card still appears; that is
deliberate, and it is how you learn a release is out. It can never overwrite your
build: `autoDownload` is off, and the signature differs, so the swap is refused.

`local/branches.sh` lists the merge requests applied to every build. The old
side-by-side rename is retired; that work survives on `lucacri/local-only` on the
fork if it is ever wanted again, but nothing local depends on it.

## Two checkouts, two jobs

| Checkout | Job |
| --- | --- |
| `~/Sites/dev-tools/my-orca/lucacri` | **Where you write code.** Clone of your fork: `origin` is `lucacri/orca`, `upstream` is `stablyai/orca`. Make a worktree per change here. |
| `~/Sites/dev-tools/my-orca/build` | **Where the app gets built.** Holds the throwaway `lucacri/daily` and the untracked `local/` tooling. Never edit features here — `integrate.sh` rebuilds `daily` from scratch every run and refuses a dirty tree. |

The build worktree belongs to the **original** clone, whose `origin` is
upstream. It must stay that way: in the fork clone `origin` is the integrated
branch, so `integrate.sh` rebuilding `daily` from `origin/main` would feed on its
own output.

They are separate clones, so a branch made in one is invisible to the other
until it goes through the fork. `integrate.sh` merges `fork/<branch>`, not the
local branch, which means **pushing from the work clone is all that is needed**
— nothing has to be checked out or created in the build clone. A purely local
branch still works as a fallback, so a quick experiment does not have to be
published before you can build it.

### Adding a change

1. Create the worktree in Orca as usual. It comes off the fork's `main`, which
   `integrate.sh` republishes on every build as upstream plus every branch in
   `BRANCHES` — so the new worktree already contains all of them.
2. Commit your work.
3. `orca-mr` — replays only your commits onto `upstream/main` so the pull
   request shows one change, then prints the push and `gh pr create` lines.
4. Add `lucacri/<name>` to `local/branches.sh` in the build clone.
5. `orca-update`.

Step 4 is the one people forget; without it the build never carries the change.

The cost of step 1 giving you everything is step 3 being required. Skipping it
opens a pull request whose diff contains every other unmerged feature.

## The three scripts

| Script | What it does |
| --- | --- |
| `local/sync-upstream.sh` | Rebases every branch onto the newest `origin/main`. Reports what conflicts. Changes no files. |
| `local/build.sh` | Integrates, then builds and signs the app. |
| `local/install.sh` | Swaps it into `/Applications`, keeping the old one for rollback. |
| `local/update.sh` | All of the above, quitting and reopening the app around the swap. |
| `local/dev.sh` | Optional: `pnpm dev` instead of a packaged app. Not the daily path. |

The app is built unrenamed, with upstream's own identity, and replaces the
official install. `local/electron-builder.arm64.cjs` narrows packaging to arm64
and skips notarization; nothing else about the build differs from upstream.

`local/integrate.sh` is the shared middle step: it rebuilds `lucacri/daily` as
`origin/main` with every branch merged on top. It is disposable and recreated
from scratch every run, so never commit to it — commit to the MR branch.

## Routine update

```
local/sync-upstream.sh     # exits non-zero if a branch needs a human
local/dev.sh               # or local/build-beluga.sh
```

## When a branch conflicts

**Resolve it on the branch, never in `lucacri/daily`.** A fix made during
integration is thrown away by the next run and never reaches the merge request.

```
git checkout <branch>
git rebase origin/main
# resolve, then:
git rebase --continue
git push --force-with-lease
```

If the branch is checked out in another worktree, `sync-upstream.sh` prints which
one and rebases it there. Git refuses to check out the same branch twice, and a
loop that ignores that silently skips the branch — which is why the script looks
the worktree up rather than assuming.

## For an agent doing this unattended

1. Run `local/sync-upstream.sh`. Exit 0 means every branch is current; stop
   worrying about conflicts and integrate.
2. On a non-zero exit it names each blocked branch and the conflicting files.
   Resolve on that branch, one at a time.
3. Before resolving, read `LOCAL-ONLY.md` if `lucacri/local-only` is the branch
   in question. Each entry there explains what the patch is for and what upstream
   change would break it — that is the intended conflict resolution. That branch
   is not in the dev path, so a conflict there never blocks `local/dev.sh`; it
   only matters if you go back to building the packaged app.
4. Ask whether upstream has simply absorbed the change. If the MR landed, delete
   its line from `local/branches.sh` instead of resolving anything.
5. Never resolve a conflict by dropping the fork's side without saying so. Two of
   the branches fix real upstream bugs; silently losing them looks like a clean
   build and behaves like a broken one.
