import { useEffect, useState } from 'react'
import { Gauge } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { formatResetDuration } from '../../../../shared/rate-limit-reset-format'
import {
  getDisplayedUsagePercentage,
  type UsagePercentageDisplay
} from '../../../../shared/usage-percentage-display'
import type {
  CcflareAccount,
  CcflareSnapshot,
  CcflareUsageWindow
} from '../../../../shared/ccflare-types'
import { STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS } from './status-bar-context-menu-policy'
import { isCcflareAccountLimited, summarizeCcflare } from './ccflare-status-summary'

const POLL_MS = 60_000

function windowText(
  label: string,
  window: CcflareUsageWindow | null,
  display: UsagePercentageDisplay
): string {
  if (!window) {
    return `${label} –`
  }
  const reset = window.resetsAt ? Date.parse(window.resetsAt) - Date.now() : Number.NaN
  const resetText = Number.isFinite(reset) ? ` (${formatResetDuration(reset)})` : ''
  return `${label} ${getDisplayedUsagePercentage(window.percent, display)}%${resetText}`
}

function AccountRow({
  account,
  active,
  display
}: {
  account: CcflareAccount
  active: boolean
  display: UsagePercentageDisplay
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className={cn('truncate', active && 'font-medium text-foreground')}>
        {account.name}
        {account.paused ? translate('components.status.ccflare.paused', ' · paused') : ''}
        {isCcflareAccountLimited(account)
          ? translate('components.status.ccflare.limited', ' · limited')
          : ''}
      </span>
      <span className="shrink-0 tabular-nums text-muted-foreground">
        {windowText('5h', account.fiveHour, display)} · {windowText('wk', account.weekly, display)}
      </span>
    </div>
  )
}

/** Status-bar summary of a local better-ccflare proxy: active account usage and pool health. */
export function CcflareStatusSegment({
  compact,
  iconOnly
}: {
  compact: boolean
  iconOnly: boolean
}): React.JSX.Element {
  const display = useAppStore((s) => s.usagePercentageDisplay)
  const [snapshot, setSnapshot] = useState<CcflareSnapshot | null>(null)

  useEffect(() => {
    let latestRequest = 0
    let mounted = true
    const refresh = (): void => {
      const request = ++latestRequest
      void window.api.ccflare
        .getSnapshot()
        .then((next) => {
          // Why: focus and interval refreshes can overlap; never let an older reply win.
          if (mounted && request === latestRequest) {
            setSnapshot(next)
          }
        })
        .catch(() => {})
    }
    refresh()
    const timer = setInterval(() => {
      if (document.hasFocus()) {
        refresh()
      }
    }, POLL_MS)
    window.addEventListener('focus', refresh)
    return () => {
      mounted = false
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const summary = summarizeCcflare(snapshot, display, compact)
  const ok = snapshot?.status === 'ok' ? snapshot : null
  const displayNote =
    display === 'used'
      ? translate('components.status.ccflare.showingUsed', 'Percentages show usage')
      : translate('components.status.ccflare.showingRemaining', 'Percentages show what is left')
  const ariaLabel = translate('components.status.ccflare.ariaLabel', 'better-ccflare: {{status}}', {
    status: summary.label
  })

  return (
    <Popover>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              {...STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground',
                summary.warning && 'text-status-warning'
              )}
              aria-label={ariaLabel}
            >
              <Gauge className="size-3" />
              {!iconOnly ? (
                <span className="text-[11px] font-medium tabular-nums">{summary.label}</span>
              ) : null}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          {ariaLabel}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        {...STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS}
        side="top"
        align="end"
        sideOffset={8}
        className="w-96"
      >
        <div className="text-xs">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="font-medium">
              {translate('components.status.ccflare.title', 'better-ccflare')}
            </span>
            <span className="truncate text-muted-foreground">{snapshot?.url}</span>
          </div>
          {snapshot?.status === 'unreachable' ? (
            <p className="text-muted-foreground">
              {translate(
                'components.status.ccflare.unreachable',
                'Not reachable: {{reason}}. Set ORCA_CCFLARE_URL to point elsewhere.',
                { reason: snapshot.reason }
              )}
            </p>
          ) : null}
          {ok ? (
            <div className="space-y-2">
              {ok.pool ? (
                <div className="text-muted-foreground">
                  {translate(
                    'components.status.ccflare.pool',
                    '{{routable}}/{{configured}} accounts routable',
                    { routable: ok.pool.routable, configured: ok.pool.configured }
                  )}
                  {ok.pool.rateLimited > 0
                    ? translate(
                        'components.status.ccflare.poolRateLimited',
                        ' · {{count}} rate-limited',
                        { count: ok.pool.rateLimited }
                      )
                    : ''}
                </div>
              ) : null}
              <div>
                {ok.accounts.map((account) => (
                  <AccountRow
                    key={account.name}
                    account={account}
                    active={account === summary.activeAccount}
                    display={display}
                  />
                ))}
                <div className="pt-1 text-muted-foreground">{displayNote}</div>
              </div>
              {ok.totals ? (
                <div className="border-t border-border pt-2 text-muted-foreground tabular-nums">
                  {translate(
                    'components.status.ccflare.totals',
                    'Last 24h: {{requests}} requests · ${{cost}} · {{success}}% success',
                    {
                      requests: ok.totals.requests.toLocaleString(),
                      cost: ok.totals.costUsd.toFixed(2),
                      success: ok.totals.successRate
                    }
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
