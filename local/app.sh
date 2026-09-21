# Which app the build/install/update scripts act on. Override per run:
#   APP_NAME=Beluga local/build.sh
#
#   Orca   — the default. Upstream's own identity, built by you, replacing the
#            official install. No source patches at all; the update card still
#            appears and is how you learn a release is out.
#   Beluga — the legacy side-by-side fork. Renames the app so it can coexist
#            with an official Orca. Needs lucacri/local-only merged in.
APP_NAME="${APP_NAME:-Orca}"

# The Developer ID in your login keychain. `security find-identity -v -p codesigning`
# lists what is available.
SIGNING_IDENTITY="${SIGNING_IDENTITY:-Developer ID Application: John Homyk (CY7L2E94J3)}"

case "$APP_NAME" in
  Orca)
    BUILDER_CONFIG="local/electron-builder.arm64.cjs"
    EXTRA_BRANCHES=()
    ;;
  Beluga)
    BUILDER_CONFIG="config/electron-builder.beluga.cjs"
    EXTRA_BRANCHES=("${BELUGA_ONLY_BRANCHES[@]}")
    ;;
  *)
    echo "error: unknown APP_NAME '$APP_NAME' (expected Orca or Beluga)" >&2
    exit 1
    ;;
esac
