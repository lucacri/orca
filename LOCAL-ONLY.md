# Local-only patches (branch `lucacri/local-only`)

**Never open a PR from this branch.** It exists only to make a personal build of
this repo run as a separate app alongside an installed Orca.

Kept as a ledger because these are the only places this fork deviates from
upstream, so they are the only places a rebase onto `main` can conflict. When
one does, read the entry before resolving.

## 1. `config/electron-builder.beluga.cjs` (new file)

Re-exports upstream's electron-builder config with three keys replaced: `appId`
(`com.lucacri.beluga`), `productName` (`Beluga`), and the URL scheme.

Deliberately an overlay rather than an edit, so `config/electron-builder.config.cjs`
stays byte-identical to upstream and can never conflict. **A new file cannot
conflict.** If upstream restructures that config's exports, this is where it
breaks — check that the base still exports a plain object.

Signs with a Developer ID from the login keychain and does **not** notarize.
One user, built locally, so the ticket would only buy Gatekeeper acceptance for
a bundle arriving from elsewhere. TCC grants still persist because a Developer ID
signature's designated requirement is identifier + team, not the hash — which is
also why upstream's "no stable identity without a ticket" warning does not apply
here: that describes its own ad-hoc (`-`) builds. `BELUGA_NOTARIZE=1` opts back
in, and then needs Apple credentials.

Why rename at all: macOS keys permissions on code-signing identity. Two bundles
sharing `com.stablyai.orca` with different signatures fight over one TCC and
LaunchServices identity, grants stop matching, and Squirrel refuses bundle swaps.
A distinct identity also gives the fork its own profile directory and instance
lock, so both apps can be installed at once.

## 2. `src/main/updater/updater-setup.ts` (+8 lines)

Returns early unless `app.getName() === 'Orca'`.

The update feed is hardcoded to `stablyai/orca` and compares versions only. There
is no setting, env var or build flag to disable checks. Without this, the fork is
offered official releases, which then fail to install against a different
signature — a recurring error card every 24h, on wake, and on window focus.

Conflict risk: low but real, since it sits just after the `is.dev` guards at the
top of `setupAutoUpdater`. If upstream reworks those guards, re-apply the check
immediately after them and before `getAutoUpdater()`.

## 3. `src/main/cli/cli-install-constants.ts` (+2 lines)

`DEFAULT_MAC_COMMAND_PATH` points at `/usr/local/bin/beluga`.

Both apps otherwise install the same `/usr/local/bin/orca` symlink, so using the
CLI installer in the fork would silently repoint your real `orca` command at this
build. Rarely-touched constants file; conflict risk is very low.

## Rule of thumb

Rename user-visible identity only — product name, bundle id, URL scheme, CLI name.
Never rename internal identifiers (module names, IPC channel strings, store keys,
event names): every one of those is a permanent merge conflict you inflicted on
yourself, for no user-visible gain.
