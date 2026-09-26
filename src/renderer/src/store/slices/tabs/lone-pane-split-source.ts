import { resolveRightSplitTargetGroupId } from '@/lib/right-split-target-group'
import { FLOATING_TERMINAL_WORKTREE_ID } from '../../../../../shared/constants'
import type {
  Tab,
  TabContentType,
  TabGroup,
  TabGroupLayoutNode
} from '../../../../../shared/tab-types'

/** Every map is optional: partial harness stores and pre-hydration state reach this predicate. */
type LonePaneState = {
  layoutByWorktree?: Record<string, TabGroupLayoutNode | undefined>
  groupsByWorktree?: Record<string, TabGroup[] | undefined>
  unifiedTabsByWorktree?: Record<string, Tab[] | undefined>
}

/** The one group a worktree's tab area is showing, when the next pane should open beside it.
 *  null once the area is split (the ceiling of two), while the lone group is still empty
 *  (nothing to sit beside), and for the floating panel, which never renders a split layout. */
export function findLonePaneSourceGroupId(
  state: LonePaneState,
  worktreeId: string,
  requestedGroupId?: string
): string | null {
  if (worktreeId === FLOATING_TERMINAL_WORKTREE_ID) {
    return null
  }
  const layout = state.layoutByWorktree?.[worktreeId]
  const groups = state.groupsByWorktree?.[worktreeId] ?? []
  const loneGroupId = layout
    ? layout.type === 'leaf'
      ? layout.groupId
      : null
    : groups.length === 1
      ? (groups[0]?.id ?? null)
      : null
  if (loneGroupId === null || !groups.some((group) => group.id === loneGroupId)) {
    return null
  }
  // Why: a caller naming some other group has placement intent of its own; only "put it where I'm looking" is redirected.
  if (requestedGroupId !== undefined && requestedGroupId !== loneGroupId) {
    return null
  }
  // Why unified tabs, not tabOrder: an orphaned runtime terminal sits in tabOrder but renders nothing.
  return (state.unifiedTabsByWorktree?.[worktreeId] ?? []).some(
    (tab) => tab.groupId === loneGroupId
  )
    ? loneGroupId
    : null
}

type BesideGroupState = LonePaneState & Parameters<typeof resolveRightSplitTargetGroupId>[0]

/** The group the next pane opens in when the tab area shows exactly one — null otherwise.
 *  Always unfocused and untracked: a host snapshot reads an activated empty group as a pane,
 *  and the user did not split anything, so pane-split discovery must not fire. */
export function resolveLonePaneBesideGroupId(
  state: BesideGroupState,
  worktreeId: string,
  requestedGroupId?: string,
  contentType?: TabContentType
): string | null {
  const loneGroupId = findLonePaneSourceGroupId(state, worktreeId, requestedGroupId)
  // Why: a browser joins a lone pane already showing a browser as another tab, not a split.
  return loneGroupId === null ||
    (contentType === 'browser' && loneGroupShowsBrowser(state, worktreeId, loneGroupId))
    ? null
    : resolveRightSplitTargetGroupId(state, worktreeId, loneGroupId, {
        activate: false,
        recordInteraction: false
      })
}

function loneGroupShowsBrowser(state: LonePaneState, worktreeId: string, groupId: string): boolean {
  const activeTabId = state.groupsByWorktree?.[worktreeId]?.find(
    (g) => g.id === groupId
  )?.activeTabId
  return (state.unifiedTabsByWorktree?.[worktreeId] ?? []).some(
    (tab) => tab.id === activeTabId && tab.contentType === 'browser'
  )
}
