import { translate } from '@/i18n/i18n'
import type { CcflareAccount, CcflareSnapshot } from '../../../../shared/ccflare-types'
import {
  getDisplayedUsagePercentage,
  type UsagePercentageDisplay
} from '../../../../shared/usage-percentage-display'

export type CcflareStatusSummary = {
  label: string
  warning: boolean
  activeAccount: CcflareAccount | null
}

function timeOf(iso: string | null): number {
  const ms = iso ? Date.parse(iso) : Number.NaN
  return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY
}

export function isCcflareAccountLimited(account: CcflareAccount, now = Date.now()): boolean {
  return timeOf(account.rateLimitedUntil) > now
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
  display: UsagePercentageDisplay,
  compact = false
): CcflareStatusSummary {
  if (!snapshot) {
    return { label: '…', warning: false, activeAccount: null }
  }
  if (snapshot.status === 'unreachable') {
    return {
      label: translate('components.status.ccflare.offline', 'offline'),
      warning: true,
      activeAccount: null
    }
  }
  if (snapshot.accounts.length === 0) {
    return {
      label: translate('components.status.ccflare.noAccounts', 'no accounts'),
      warning: true,
      activeAccount: null
    }
  }
  const activeAccount = pickActiveCcflareAccount(snapshot.accounts)
  const parts: string[] = []
  const { pool } = snapshot
  if (pool && pool.routable < pool.configured) {
    parts.push(`${pool.routable}/${pool.configured}`)
  }
  if (activeAccount?.fiveHour) {
    parts.push(`5h ${getDisplayedUsagePercentage(activeAccount.fiveHour.percent, display)}%`)
  }
  if (activeAccount?.weekly && !compact) {
    parts.push(`wk ${getDisplayedUsagePercentage(activeAccount.weekly.percent, display)}%`)
  }
  const warning =
    (pool !== null && (pool.routable < pool.configured || pool.rateLimited > 0)) ||
    snapshot.accounts.some((account) => isCcflareAccountLimited(account))
  return { label: parts.join(' · ') || 'ok', warning, activeAccount }
}
