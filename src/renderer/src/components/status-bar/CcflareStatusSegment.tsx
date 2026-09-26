import { useCallback, useEffect, useRef, useState } from 'react'
import { Gauge } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import type { CcflareSnapshot } from '../../../../shared/ccflare-types'
import { STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS } from './status-bar-context-menu-policy'
import { ccflareUsageLevel, summarizeCcflare } from './ccflare-status-summary'
import { CcflarePopoverContent } from './ccflare-popover-content'

// Why: a local proxy answers in ~25ms, so a fast refresh while the popover is open is cheap.
const IDLE_POLL_MS = 60_000
const OPEN_POLL_MS = 2_000

const LEVEL_TEXT = { normal: '', warning: 'text-status-warning', critical: 'text-destructive' }

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
  const [fetchedAt, setFetchedAt] = useState(0)
  const [open, setOpen] = useState(false)
  const latestRequest = useRef(0)
  const mounted = useRef(true)

  const refresh = useCallback((): void => {
    const request = ++latestRequest.current
    void window.api.ccflare
      .getSnapshot()
      .then((next) => {
        // Why: focus, interval and open refreshes can overlap; never let an older reply win.
        if (mounted.current && request === latestRequest.current) {
          setSnapshot(next)
          setFetchedAt(Date.now())
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    mounted.current = true
    refresh()
    window.addEventListener('focus', refresh)
    return () => {
      mounted.current = false
      window.removeEventListener('focus', refresh)
    }
  }, [refresh])

  useEffect(() => {
    if (open) {
      refresh()
    }
    const timer = setInterval(
      () => {
        // Why: skip background polling while Orca is not focused; an open popover is always visible.
        if (open || document.hasFocus()) {
          refresh()
        }
      },
      open ? OPEN_POLL_MS : IDLE_POLL_MS
    )
    return () => clearInterval(timer)
  }, [open, refresh])

  const summary = summarizeCcflare(snapshot, display, compact)
  const ariaLabel = translate('components.status.ccflare.ariaLabel', 'better-ccflare: {{status}}', {
    status: summary.label
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              {...STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums transition-colors hover:bg-accent/70 hover:text-foreground',
                summary.parts.length === 0 && summary.warning && 'text-status-warning'
              )}
              aria-label={ariaLabel}
            >
              <Gauge className="size-3" />
              {iconOnly ? null : summary.parts.length === 0 ? (
                <span>{summary.label}</span>
              ) : (
                <>
                  {summary.pool ? (
                    <>
                      <span className="text-status-warning">{summary.pool}</span>
                      <span className="font-normal opacity-50">·</span>
                    </>
                  ) : null}
                  {summary.parts.map((part) => (
                    <span key={part.label} className="inline-flex gap-1">
                      <span className="font-normal">{part.label}</span>
                      <span className={LEVEL_TEXT[ccflareUsageLevel(part.used)]}>
                        {part.shown}%
                      </span>
                    </span>
                  ))}
                  {display === 'remaining' ? (
                    <span className="font-normal">
                      {translate('components.status.ccflare.modeLeft', 'left')}
                    </span>
                  ) : null}
                </>
              )}
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
        className="w-[368px]"
      >
        <div className="p-1 text-xs">
          <CcflarePopoverContent
            snapshot={snapshot}
            summary={summary}
            display={display}
            now={fetchedAt}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
