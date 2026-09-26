import type { Tab, TabGroup, TabGroupLayoutNode } from '../../../shared/tab-types'
import { getEffectiveLayoutForWorktree } from '@/components/terminal/split-group-mount'
import { collectLayoutGroupIds } from '@/runtime/web-session-tabs-sync/tab-group-layout-tree'

// Only the fields read here, so the link router's partial test stores type-check.
type LinkTab = Pick<Tab, 'id'> & Partial<Pick<Tab, 'groupId' | 'contentType' | 'lastFocusedAt'>>

/** Optional maps: the link router's injected accessor and test stubs reach this before hydration. */
export type VisibleBrowserLinkState = {
  layoutByWorktree?: Record<string, TabGroupLayoutNode | undefined>
  groupsByWorktree?: Record<string, readonly Pick<TabGroup, 'id' | 'activeTabId'>[]>
  unifiedTabsByWorktree?: Record<string, readonly LinkTab[]>
  activeGroupIdByWorktree?: Record<string, string | undefined>
}

export type BrowserLinkPlacement = { targetGroupId: string }

/** The on-screen group whose active tab is a browser: focused group first, else most recently focused. */
export function findVisibleBrowserLinkTarget(
  state: VisibleBrowserLinkState,
  worktreeId: string
): BrowserLinkPlacement | undefined {
  const focusedGroupId = state.activeGroupIdByWorktree?.[worktreeId]
  const layout = getEffectiveLayoutForWorktree(
    worktreeId,
    state.layoutByWorktree ?? {},
    state.groupsByWorktree ?? {},
    state.activeGroupIdByWorktree ?? {}
  )
  const groups = state.groupsByWorktree?.[worktreeId] ?? []
  const tabsById = new Map((state.unifiedTabsByWorktree?.[worktreeId] ?? []).map((t) => [t.id, t]))
  let best: { groupId: string; lastFocusedAt: number } | undefined
  for (const groupId of collectLayoutGroupIds(layout)) {
    const group = groups.find((g) => g.id === groupId)
    const tab = group?.activeTabId ? tabsById.get(group.activeTabId) : undefined
    // Why tolerate a missing groupId: partial link-router states omit it; a mismatched one is stale.
    if (!tab || (tab.groupId ?? groupId) !== groupId || tab.contentType !== 'browser') {
      continue
    }
    if (groupId === focusedGroupId) {
      return { targetGroupId: groupId }
    }
    const lastFocusedAt = tab.lastFocusedAt ?? 0
    if (!best || lastFocusedAt > best.lastFocusedAt) {
      best = { groupId, lastFocusedAt }
    }
  }
  return best ? { targetGroupId: best.groupId } : undefined
}
