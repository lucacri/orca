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
