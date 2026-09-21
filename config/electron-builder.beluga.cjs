// LOCAL ONLY (lucacri/local-only) — never send upstream.
//
// A personal build signed with a different Developer ID cannot share
// com.stablyai.orca: macOS would treat two differently-signed bundles as one
// identity, so TCC grants stop matching and Squirrel refuses the bundle swap.
//
// This is an overlay, not a fork of the config: it re-exports upstream's object
// with only the identity keys replaced, so the upstream file stays byte-identical
// and can never conflict when rebasing onto main.
const base = require('./electron-builder.config.cjs')

// Not notarized by default. This is a personal build with one user, so the
// ticket buys only Gatekeeper acceptance for apps that arrive from elsewhere,
// which a locally built bundle never does.
//
// Upstream's config warns that without a ticket "every build reads as a
// different client", but that describes its own ad-hoc builds: with
// forceCodeSigning off the identity falls back to '-', which really has no
// stable designated requirement. A Developer ID signature does — identifier
// plus team, independent of the hash — so TCC grants survive a rebuild. The
// sibling lucode fork runs exactly this way on the same certificate.
//
// BELUGA_NOTARIZE=1 opts back in; it needs Apple credentials and ~10 minutes.
const notarize = process.env.BELUGA_NOTARIZE === '1' ? base.mac.notarize : false

module.exports = {
  ...base,
  // One machine, one architecture. Upstream's mac.target pins ['x64', 'arm64'],
  // which outranks --arm64 and demands x64 natives this build never ships.
  mac: {
    ...base.mac,
    notarize,
    target: base.mac.target.map((entry) => ({ ...entry, arch: ['arm64'] }))
  },
  appId: 'com.lucacri.beluga',
  productName: 'Beluga',
  // Own scheme so beluga:// links never steal the installed Orca's.
  protocols: [{ name: 'Beluga', schemes: ['beluga'] }]
}
