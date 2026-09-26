export type CcflareUsageWindow = {
  percent: number
  resetsAt: string | null
}

export type CcflareAccount = {
  name: string
  paused: boolean
  rateLimitedUntil: string | null
  lastUsed: string | null
  fiveHour: CcflareUsageWindow | null
  weekly: CcflareUsageWindow | null
}

export type CcflarePool = {
  configured: number
  routable: number
  rateLimited: number
  nextAvailableAt: string | null
}

export type CcflareTotals = {
  requests: number
  costUsd: number
  successRate: number
}

export type CcflareSnapshot =
  | { status: 'unreachable'; url: string; reason: string }
  | {
      status: 'ok'
      url: string
      pool: CcflarePool | null
      accounts: CcflareAccount[]
      totals: CcflareTotals | null
    }
