import { useAppStore } from '../../store'
import type { StatusBarItem } from '../../../../shared/ui-chrome-types'
import { isStatusBarItemAvailable } from './status-bar-agent-gating'
import { isPairedWebClientWindow } from '@/lib/desktop-window-chrome'

/** Keep CLI toggles visible until detection proves their agent missing. */
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
