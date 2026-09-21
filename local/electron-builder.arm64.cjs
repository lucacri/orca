// Untracked build config for a personal Orca build (see .git/info/exclude).
//
// Keeps upstream's identity — same appId, same product name — so the result
// replaces the official install rather than living beside it. Nothing about the
// app is renamed, which is why this fork carries no patch to the source tree.
//
// Two keys change, both about how it is packaged, not what it is:
const base = require('../config/electron-builder.config.cjs')

// Not notarized. One user, built locally, so a ticket would only buy Gatekeeper
// acceptance for a bundle arriving from elsewhere — which this never does.
// ORCA_NOTARIZE=1 opts back in and then needs Apple credentials.
const notarize = process.env.ORCA_NOTARIZE === '1' ? base.mac.notarize : false

module.exports = {
  ...base,
  mac: {
    ...base.mac,
    notarize,
    // Why: upstream pins arch per target, and a target's own list outranks the
    // --arm64 flag, so packaging otherwise attempts an x64 slice and fails on
    // native variants a host-only `pnpm install` never fetches.
    target: base.mac.target.map((entry) => ({ ...entry, arch: ['arm64'] }))
  }
}
