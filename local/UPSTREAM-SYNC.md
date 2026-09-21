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

`local/branches.sh` holds two lists. `BRANCHES` is the merge requests, applied to
every build. `BELUGA_ONLY_BRANCHES` is the old side-by-side rename, applied only
when you ask for it with `APP_NAME=Beluga`. That work stays on
`lucacri/local-only` and is kept rebased, so returning to it is one command
rather than an archaeology exercise.

## The three scripts

| Script | What it does |
| --- | --- |
| `local/sync-upstream.sh` | Rebases every branch onto the newest `origin/main`. Reports what conflicts. Changes no files. |
| `local/build.sh` | Integrates, then builds and signs the app. |
| `local/install.sh` | Swaps it into `/Applications`, keeping the old one for rollback. |
| `local/update.sh` | All of the above, quitting and reopening the app around the swap. |
| `local/dev.sh` | Optional: `pnpm dev` instead of a packaged app. Not the daily path. |

`local/app.sh` picks which app the three build scripts act on. Default `Orca`
replaces the official install. `APP_NAME=Beluga local/build.sh` builds the old
side-by-side fork instead.

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
