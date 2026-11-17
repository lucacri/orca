import { Fragment } from 'react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/class-names'
import { translate } from '@/i18n/i18n'
import { formatResetDuration } from '../../../../shared/agent-usage/rate-limits/rate-limit-reset-format'
import {
  getDisplayedUsagePercentage,
  type UsagePercentageDisplay
} from '../../../../shared/agent-usage/display/usage-percentage-display'
import type {
  CcflareAccount,
  CcflareSnapshot,
  CcflareUsageWindow
} from '../../../../shared/ccflare-types'
import { usageBarClass } from './usage/usage-health-tone'
import {
  ccflareUsageLevel,
  isCcflareAccountExhausted,
  isCcflareAccountLimited,
  isCcflarePoolDegraded,
  type CcflareStatusSummary
} from './ccflare-status-summary'

const LEVEL_TEXT = {
  normal: '',
  warning: 'text-status-warning',
  critical: 'text-destructive font-medium'
}

function UsageCells({
  window,
  display,
  now
}: {
  window: CcflareUsageWindow | null
  display: UsagePercentageDisplay
  now: number
}): React.JSX.Element {
  const used = window?.percent ?? 0
  const reset = window?.resetsAt ? Date.parse(window.resetsAt) - now : Number.NaN
  const hasReset = Number.isFinite(reset)
  return (
    <>
      {/* Why: the bar always shows usage (longer = more risk); only the number follows the used/left setting. */}
      <span className="h-[4px] w-6 overflow-hidden rounded-full bg-muted">
        <span
          className={cn('block h-full rounded-full', usageBarClass(used))}
          style={{ width: `${Math.min(100, Math.max(0, used))}%` }}
        />
      </span>
      <span
        className={cn(
          'text-right',
          window && (used > 0 || hasReset)
            ? LEVEL_TEXT[ccflareUsageLevel(used)]
            : 'text-muted-foreground'
        )}
      >
        {getDisplayedUsagePercentage(used, display)}%
      </span>
      <span className="text-[11px] text-muted-foreground">
        {hasReset ? formatResetDuration(reset) : '—'}
      </span>
    </>
  )
}

function AccountRow({
  account,
  active,
  models,
  display,
  now
}: {
  account: CcflareAccount
  active: boolean
  models: string[]
  display: UsagePercentageDisplay
  now: number
}): React.JSX.Element {
  const limited = isCcflareAccountLimited(account, now)
  const exhausted = isCcflareAccountExhausted(account)
  const tag = limited
    ? translate('components.status.ccflare.tagLimited', 'limited')
    : exhausted
      ? translate('components.status.ccflare.tagExhausted', 'out of usage')
      : account.paused
        ? translate('components.status.ccflare.tagPaused', 'paused')
        : null
  const state = limited
    ? translate('components.status.ccflare.stateLimited', 'rate-limited')
    : exhausted
      ? translate('components.status.ccflare.stateExhausted', 'weekly limit reached')
      : account.paused
        ? translate('components.status.ccflare.statePaused', 'paused')
        : active
          ? translate('components.status.ccflare.stateActive', 'in use')
          : translate('components.status.ccflare.stateIdle', 'idle')
  return (
    <>
      <span
        role="img"
        aria-label={state}
        title={state}
        className={cn(
          'size-1.5 rounded-full',
          limited || exhausted
            ? 'bg-destructive'
            : account.paused
              ? 'border-[1.5px] border-muted-foreground'
              : active
                ? 'bg-foreground'
                : 'bg-muted-foreground/40'
        )}
      />
      <span className={cn('flex min-w-0 items-center gap-1.5', active && 'font-medium')}>
        <span
          className={cn(
            'shrink-0 truncate',
            (account.paused || limited || exhausted) && 'text-muted-foreground'
          )}
        >
          {account.name}
        </span>
        {tag ? (
          <span
            className={cn(
              'min-w-0 truncate text-[11px] font-normal',
              limited || exhausted ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {tag}
          </span>
        ) : null}
      </span>
      <UsageCells window={account.weekly} display={display} now={now} />
      {models.map((model) => (
        <Fragment key={model}>
          <span />
          <UsageCells
            window={account.modelLimits.find((limit) => limit.model === model) ?? null}
            display={display}
            now={now}
          />
        </Fragment>
      ))}
    </>
  )
}

function DashboardLink({ url }: { url: string }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => void window.api.shell.openUrl(url)}
      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground focus-visible:outline-none"
    >
      <span>{translate('components.status.ccflare.openDashboard', 'Open dashboard')}</span>
      <span className="truncate">{url.replace(/^https?:\/\//, '')} ↗</span>
    </button>
  )
}

export function CcflarePopoverContent({
  snapshot,
  summary,
  display,
  now
}: {
  snapshot: CcflareSnapshot | null
  summary: CcflareStatusSummary
  display: UsagePercentageDisplay
  now: number
}): React.JSX.Element {
  const title = translate('components.status.ccflare.title', 'better-ccflare')
  if (!snapshot) {
    return <div className="px-2 py-1.5 font-semibold">{title}</div>
  }
  if (snapshot.status === 'unreachable') {
    return (
      <>
        <div className="px-2 py-1.5">
          <div className="font-semibold">{title}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-status-warning">
            <span className="size-1.5 rounded-full bg-status-warning" />
            {translate('components.status.ccflare.offlineTitle', 'Offline')}
          </div>
        </div>
        <Separator className="mx-2 my-1" />
        <p className="px-2 py-1.5 text-muted-foreground">
          {translate(
            'components.status.ccflare.unreachable',
            'Not reachable: {{reason}}. Set ORCA_CCFLARE_URL to point elsewhere.',
            { reason: snapshot.reason }
          )}
        </p>
        <Separator className="mx-2 my-1" />
        <DashboardLink url={snapshot.url} />
      </>
    )
  }
  const { pool, totals } = snapshot
  const degraded = isCcflarePoolDegraded(pool)
  // Why: one column per model cap, in first-seen order, so rows stay aligned even when an account lacks one.
  const models = [
    ...new Set(snapshot.accounts.flatMap((a) => a.modelLimits.map((limit) => limit.model)))
  ]
  const columns = ['24px 5ch 6ch', ...models.map(() => '0 24px 5ch 6ch')].join(' ')
  const mode =
    display === 'used'
      ? translate('components.status.ccflare.modeUsed', 'used')
      : translate('components.status.ccflare.modeLeft', 'left')
  return (
    <>
      <div className="px-2 py-1.5">
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground tabular-nums">
          <span
            className={cn(
              'size-1.5 shrink-0 rounded-full',
              pool && pool.rateLimited > 0
                ? 'bg-destructive'
                : degraded
                  ? 'bg-status-warning'
                  : 'bg-muted-foreground/40'
            )}
          />
          <span className="truncate">
            {pool ? (
              <span
                className={cn('font-medium', degraded ? 'text-status-warning' : 'text-foreground')}
              >
                {translate(
                  'components.status.ccflare.routable',
                  '{{routable}} of {{configured}} routable',
                  { routable: pool.routable, configured: pool.configured }
                )}
              </span>
            ) : null}
            {pool && pool.rateLimited > 0
              ? translate(
                  'components.status.ccflare.rateLimitedCount',
                  ' · {{count}} rate-limited',
                  {
                    count: pool.rateLimited
                  }
                )
              : ''}
            {pool && pool.usageExhausted > 0
              ? translate('components.status.ccflare.exhaustedCount', ' · {{count}} out of usage', {
                  count: pool.usageExhausted
                })
              : ''}
            {summary.activeAccount
              ? translate('components.status.ccflare.routingTo', ' · routing to {{name}}', {
                  name: summary.activeAccount.name
                })
              : ''}
          </span>
        </div>
      </div>
      <Separator className="mx-2 my-1" />
      <div className="px-2 py-1.5">
        {/* Why: one grid across all rows keeps every % and reset column aligned. */}
        <div
          className="grid grid-rows-[16px] auto-rows-[22px] items-center gap-x-1 whitespace-nowrap tabular-nums"
          style={{ gridTemplateColumns: `6px minmax(0,1fr) ${columns}` }}
        >
          <span />
          <span />
          <span className="col-span-3 text-[11px] text-muted-foreground">
            {translate('components.status.ccflare.weekMode', 'week {{mode}}', { mode })}
          </span>
          {models.map((model) => (
            <Fragment key={model}>
              <span />
              <span className="col-span-3 truncate text-[11px] text-muted-foreground">
                {translate('components.status.ccflare.modelWeekMode', '{{model}} week {{mode}}', {
                  model,
                  mode
                })}
              </span>
            </Fragment>
          ))}
          {snapshot.accounts.map((account) => (
            <AccountRow
              key={account.name}
              account={account}
              active={account === summary.activeAccount}
              models={models}
              display={display}
              now={now}
            />
          ))}
        </div>
      </div>
      {totals ? (
        <>
          <Separator className="mx-2 my-1" />
          <div className="flex gap-3 px-2 py-1.5 text-[11px] text-muted-foreground tabular-nums">
            <span>{translate('components.status.ccflare.last24h', 'Last 24h')}</span>
            <span className="flex-1" />
            <span>
              {translate('components.status.ccflare.requests', '{{value}} req', {
                value: totals.requests.toLocaleString()
              })}
            </span>
            <span>${totals.costUsd.toFixed(2)}</span>
            <span>
              {translate('components.status.ccflare.successRate', '{{value}}% ok', {
                value: totals.successRate
              })}
            </span>
          </div>
        </>
      ) : null}
      <Separator className="mx-2 my-1" />
      <DashboardLink url={snapshot.url} />
    </>
  )
}
