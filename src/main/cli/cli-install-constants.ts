// LOCAL ONLY (lucacri/local-only): installing the CLI from this fork would
// otherwise overwrite the installed Orca's own /usr/local/bin/orca symlink.
export const DEFAULT_MAC_COMMAND_PATH = '/usr/local/bin/beluga'
export const DEV_COMMAND_NAME = 'orca-dev'
export const LEGACY_LINUX_COMMAND_NAME = 'orca'
export const DEV_LAUNCHER_DIR = ['cli', 'bin'] as const
export const WINDOWS_PATH_WRITE_TIMEOUT_MS = 5_000
