# Personal build tooling for this fork

These are the untracked `local/` scripts, kept here only as a backup. This branch
is **never merged into anything** and never checked out in a working tree that
builds the app.

## Why it lives on its own branch

`local/integrate.sh` runs `git checkout -B lucacri/daily origin/main`. If these
files were tracked on a branch that gets checked out, that command would delete
them mid-run — while `local/build.sh` is executing from that directory. They have
to stay untracked in the working tree to survive every checkout, so backing them
up means keeping them somewhere the build never visits.

## Restoring

```
git archive fork/lucacri/tooling local | tar -x -C /path/to/worktree
```

Then add `local/` to that repo's `.git/info/exclude`.

See `local/UPSTREAM-SYNC.md` for what the scripts do.
