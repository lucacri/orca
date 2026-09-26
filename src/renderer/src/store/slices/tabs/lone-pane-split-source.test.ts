import { describe, expect, it, vi } from 'vitest'
import { FLOATING_TERMINAL_WORKTREE_ID } from '../../../../../shared/constants'
import type { Tab, TabGroup } from '../../../../../shared/tab-types'
import { findLonePaneSourceGroupId, resolveLonePaneBesideGroupId } from './lone-pane-split-source'

const WT = 'repo::/wt'

function tab(id: string, groupId: string, worktreeId = WT): Tab {
  return {
    id,
    entityId: id,
    groupId,
    worktreeId,
    contentType: 'terminal',
    label: id,
    customLabel: null,
    color: null,
    sortOrder: 0,
    createdAt: 0
  }
}

function group(id: string, worktreeId = WT): TabGroup {
  return { id, worktreeId, activeTabId: null, tabOrder: [] }
}

const horizontalSplit = {
  type: 'split' as const,
  direction: 'horizontal' as const,
  ratio: 0.5,
  first: { type: 'leaf' as const, groupId: 'g1' },
  second: { type: 'leaf' as const, groupId: 'g2' }
}

const oneLeaf = {
  layoutByWorktree: { [WT]: { type: 'leaf' as const, groupId: 'g1' } },
  groupsByWorktree: { [WT]: [group('g1')] },
  unifiedTabsByWorktree: { [WT]: [tab('t1', 'g1')] },
  activeGroupIdByWorktree: { [WT]: 'g1' }
}

const twoPanes = {
  ...oneLeaf,
  groupsByWorktree: { [WT]: [group('g1'), group('g2')] },
  unifiedTabsByWorktree: { [WT]: [tab('t1', 'g1'), tab('t2', 'g2')] }
}

describe('findLonePaneSourceGroupId', () => {
  it('names the only group when the tab area shows one pane', () => {
    expect(findLonePaneSourceGroupId(oneLeaf, WT)).toBe('g1')
  })

  it('still names it when the lone pane holds several tabs', () => {
    expect(
      findLonePaneSourceGroupId(
        { ...oneLeaf, unifiedTabsByWorktree: { [WT]: [tab('t1', 'g1'), tab('t2', 'g1')] } },
        WT
      )
    ).toBe('g1')
  })

  it('redirects when the caller named the lone group itself', () => {
    expect(findLonePaneSourceGroupId(oneLeaf, WT, 'g1')).toBe('g1')
  })

  it('leaves a caller that named some other group alone', () => {
    // Why: resolveEditorOpenTargetGroupId always names a group; only "where I'm looking" is redirected.
    expect(findLonePaneSourceGroupId(oneLeaf, WT, 'gElsewhere')).toBeNull()
  })

  it('is null once the tab area is split, the ceiling of two', () => {
    expect(
      findLonePaneSourceGroupId({ ...twoPanes, layoutByWorktree: { [WT]: horizontalSplit } }, WT)
    ).toBeNull()
  })

  it('is null for a vertical split too', () => {
    expect(
      findLonePaneSourceGroupId(
        {
          ...twoPanes,
          layoutByWorktree: { [WT]: { ...horizontalSplit, direction: 'vertical' as const } }
        },
        WT
      )
    ).toBeNull()
  })

  it('is null when the only group shows nothing yet', () => {
    expect(
      findLonePaneSourceGroupId({ ...oneLeaf, unifiedTabsByWorktree: { [WT]: [] } }, WT)
    ).toBeNull()
  })

  it('does not count an orphaned runtime terminal that has no unified tab', () => {
    // createTab sweeps such rows; a split beside one would leave an empty left pane.
    expect(
      findLonePaneSourceGroupId(
        {
          ...oneLeaf,
          groupsByWorktree: { [WT]: [{ ...group('g1'), tabOrder: ['orphan'] }] },
          unifiedTabsByWorktree: { [WT]: [] }
        },
        WT
      )
    ).toBeNull()
  })

  it('falls back to the single group when no layout has been recorded', () => {
    expect(findLonePaneSourceGroupId({ ...oneLeaf, layoutByWorktree: {} }, WT)).toBe('g1')
  })

  it('is null for a worktree with no groups at all', () => {
    expect(
      findLonePaneSourceGroupId(
        {
          layoutByWorktree: {},
          groupsByWorktree: {},
          unifiedTabsByWorktree: {}
        },
        WT
      )
    ).toBeNull()
  })

  it('is null when the leaf names a group that no longer exists', () => {
    expect(findLonePaneSourceGroupId({ ...oneLeaf, groupsByWorktree: { [WT]: [] } }, WT)).toBeNull()
  })

  it('is null for the floating panel, which renders no split layout', () => {
    const fw = FLOATING_TERMINAL_WORKTREE_ID
    expect(
      findLonePaneSourceGroupId(
        {
          layoutByWorktree: { [fw]: { type: 'leaf', groupId: 'fg' } },
          groupsByWorktree: { [fw]: [group('fg', fw)] },
          unifiedTabsByWorktree: { [fw]: [tab('t1', 'fg', fw)] }
        },
        fw
      )
    ).toBeNull()
  })
})

describe('resolveLonePaneBesideGroupId', () => {
  it('mints the right-hand group unfocused and silently', () => {
    // Why unfocused: a host snapshot reads an activated empty group as a terminal pane.
    // Why silent: the user did not split anything, so pane-split discovery must not fire.
    const createEmptySplitGroup = vi.fn(() => 'gNew')
    expect(resolveLonePaneBesideGroupId({ ...oneLeaf, createEmptySplitGroup }, WT)).toBe('gNew')
    expect(createEmptySplitGroup).toHaveBeenCalledWith(WT, 'g1', 'right', {
      activate: false,
      recordInteraction: false
    })
  })

  it('mints nothing when the area is already split', () => {
    const createEmptySplitGroup = vi.fn(() => 'gNew')
    expect(
      resolveLonePaneBesideGroupId(
        { ...twoPanes, layoutByWorktree: { [WT]: horizontalSplit }, createEmptySplitGroup },
        WT
      )
    ).toBeNull()
    expect(createEmptySplitGroup).not.toHaveBeenCalled()
  })

  describe('a browser opening into a lone browser pane', () => {
    const loneBrowser = {
      ...oneLeaf,
      groupsByWorktree: { [WT]: [{ ...group('g1'), activeTabId: 'b1' }] },
      unifiedTabsByWorktree: { [WT]: [{ ...tab('b1', 'g1'), contentType: 'browser' as const }] }
    }

    it('joins it as a tab instead of splitting', () => {
      const createEmptySplitGroup = vi.fn(() => 'gNew')
      expect(
        resolveLonePaneBesideGroupId({ ...loneBrowser, createEmptySplitGroup }, WT, 'g1', 'browser')
      ).toBeNull()
      expect(createEmptySplitGroup).not.toHaveBeenCalled()
    })

    it('still opens a terminal beside it', () => {
      const createEmptySplitGroup = vi.fn(() => 'gNew')
      expect(
        resolveLonePaneBesideGroupId(
          { ...loneBrowser, createEmptySplitGroup },
          WT,
          'g1',
          'terminal'
        )
      ).toBe('gNew')
    })

    it('still opens beside a lone pane whose browser is hidden behind another tab', () => {
      const createEmptySplitGroup = vi.fn(() => 'gNew')
      const hidden = {
        ...loneBrowser,
        groupsByWorktree: { [WT]: [{ ...group('g1'), activeTabId: 't1' }] },
        unifiedTabsByWorktree: {
          [WT]: [{ ...tab('b1', 'g1'), contentType: 'browser' as const }, tab('t1', 'g1')]
        }
      }
      expect(
        resolveLonePaneBesideGroupId({ ...hidden, createEmptySplitGroup }, WT, undefined, 'browser')
      ).toBe('gNew')
    })
  })
})
