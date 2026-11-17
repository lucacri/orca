import { translate } from '@/i18n/i18n'
import { getUsageHealthTone } from './usage/usage-health-tone'
import type { CcflareAccount, CcflarePool, CcflareSnapshot } from '../../../../shared/ccflare-types'
import {
  getDisplayedUsagePercentage,
  type UsagePercentageDisplay
} from '../../../../shared/agent-usage/display/usage-percentage-display'

export type CcflareUsagePart = { label: string; used: number; shown: number }

export type CcflareStatusSummary = {
  /** Plain text for aria labels and tooltips. */
  label: string
  /** "2/3" when some accounts are not routable, else null. */
  pool: string | null
  parts: CcflareUsagePart[]
  warning: boolean
  activeAccount: CcflareAccount | null
}

export type CcflareUsageLevel = 'normal' | 'warning' | 'critical'

// Why: same thresholds as the other usage bars, always judged on usage.
export function ccflareUsageLevel(used: number): CcflareUsageLevel {
  const tone = getUsageHealthTone(used)
  return tone === 'urgent' ? 'critical' : tone === 'warning' ? 'warning' : 'normal'
}

function timeOf(iso: string | null): number {
  const ms = iso ? Date.parse(iso) : Number.NaN
  return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY
}

export function isCcflareAccountLimited(account: CcflareAccount, now = Date.now()): boolean {
  return timeOf(account.rateLimitedUntil) > now
}

export function isCcflareAccountExhausted(account: CcflareAccount): boolean {
  return (account.weekly?.percent ?? 0) >= 100
}

/** Pool problems worth a warning: unroutable, rate-limited or out of weekly usage. */
export function isCcflarePoolDegraded(pool: CcflarePool | null): boolean {
  return (
    pool !== null &&
    (pool.routable < pool.configured || pool.rateLimited > 0 || pool.usageExhausted > 0)
  )
}

/** The account ccflare routed to most recently — its session strategy sticks to one. */
export function pickActiveCcflareAccount(accounts: CcflareAccount[]): CcflareAccount | null {
  let active: CcflareAccount | null = null
  for (const account of accounts) {
    if (!active || timeOf(account.lastUsed) > timeOf(active.lastUsed)) {
      active = account
    }
  }
  return active
}

export function summarizeCcflare(
  snapshot: CcflareSnapshot | null,
  display: UsagePercentageDisplay
): CcflareStatusSummary {
  const empty = { pool: null, parts: [], activeAccount: null }
  if (!snapshot) {
    return { ...empty, label: '…', warning: false }
  }
  if (snapshot.status === 'unreachable') {
    return {
      ...empty,
      label: translate('components.status.ccflare.offline', 'offline'),
      warning: true
    }
  }
  if (snapshot.accounts.length === 0) {
    return {
      ...empty,
      label: translate('components.status.ccflare.noAccounts', 'no accounts'),
      warning: true
    }
  }
  const activeAccount = pickActiveCcflareAccount(snapshot.accounts)
  const { pool } = snapshot
  const poolText =
    pool && pool.routable < pool.configured ? `${pool.routable}/${pool.configured}` : null
  const parts: CcflareUsagePart[] = []
  if (activeAccount?.weekly) {
    const used = activeAccount.weekly.percent
    parts.push({
      label: translate('components.status.ccflare.weekShort', 'wk'),
      used,
      shown: getDisplayedUsagePercentage(used, display)
    })
  }
  const text = [
    poolText,
    activeAccount?.name,
    ...parts.map((part) => `${part.label} ${part.shown}%`)
  ]
    .filter(Boolean)
    .join(' · ')
  const warning =
    isCcflarePoolDegraded(pool) ||
    snapshot.accounts.some((account) => isCcflareAccountLimited(account))
  return { label: text || 'ok', pool: poolText, parts, warning, activeAccount }
}
