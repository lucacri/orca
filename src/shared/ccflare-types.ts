export type CcflareUsageWindow = {
  percent: number
  resetsAt: string | null
}

export type CcflareAccount = {
  name: string
  paused: boolean
  rateLimitedUntil: string | null
  lastUsed: string | null
  weekly: CcflareUsageWindow | null
  /** Weekly caps that apply to one model only, e.g. a share of the weekly limit. */
  modelLimits: CcflareModelLimit[]
}

export type CcflareModelLimit = CcflareUsageWindow & { model: string }

export type CcflarePool = {
  configured: number
  routable: number
  rateLimited: number
  /** Accounts that hit their weekly usage cap. */
  usageExhausted: number
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
