# The branches applied on top of upstream main. Sourced by every script in local/.
#
# Rebuilt from scratch on every integration, so a merged MR simply drops out of
# the list — delete the line and the next run no longer carries it.

# Applied to every run, dev and packaged alike. Each one is a merge request.
BRANCHES=(
  lucacri/swift-multiarch
  lucacri/sqlite-builtin
  lucacri/own-bundle-id
  lucacri/terminal-size
)

# Applied ONLY by local/build-beluga.sh. These rename the app into a separate
# side-by-side install; a dev run needs none of them and is actively harmed by
# them. Kept on its own branch so the history survives without touching the tree.
#
# Never send these upstream. See LOCAL-ONLY.md on that branch.
BELUGA_ONLY_BRANCHES=(
  lucacri/local-only
)
