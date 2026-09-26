import { useAppStore } from '../../store'
import type { StatusBarItem } from '../../../../shared/ui-chrome-types'
import { isStatusBarItemAvailable } from './status-bar-agent-gating'
import { isPairedWebClientWindow } from '@/lib/desktop-window-chrome'

/** Subscribes to detected-agent state and returns the toggles filtered to
 *  those whose underlying CLI is installed (or pre-detection). */
export function useAvailableStatusBarToggles<T extends { id: StatusBarItem }>(
  toggles: readonly T[]
): T[] {
  const detectedAgentIds = useAppStore((s) => s.detectedAgentIds)
  return toggles.filter(
    (t) =>
      isStatusBarItemAvailable(t.id, detectedAgentIds) &&
      // Why: ccflare is fetched by the desktop main process; a paired web client never renders it.
      !(t.id === 'ccflare' && isPairedWebClientWindow())
  )
}
