// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { activateAndRevealWorkspace, activateAndRevealWorktree } from '@/lib/worktree-activation'
import { openDetectedFilePath } from './terminal-link-handlers'
import {
  createTerminalLinkTestDoubles,
  mountTerminalHost
} from './terminal-link-handlers-test-fixtures'
import {
  createDeferred,
  flushAsyncWork,
  flushDoubleRaf,
  installTerminalLinkTestEnvironment,
  setPlatform
} from './terminal-link-handlers-test-harness'

const findWorkspaceFileRouteMock = vi.hoisted(() => vi.fn())
const doubles = createTerminalLinkTestDoubles()
const {
  storeState,
  deps,
  openFileMock,
  openFilePathMock,
  createBrowserTabMock,
  setPendingEditorRevealMock,
  setMarkdownViewModeMock,
  createEmptySplitGroupMock,
  statMock
} = doubles

vi.mock('@/store', () => ({
  useAppStore: {
    getState: () => storeState
  }
}))

vi.mock('@/lib/language-detect', () => ({
  detectLanguage: (filePath: string) => (filePath.endsWith('.md') ? 'markdown' : 'plaintext')
}))

vi.mock('@/lib/worktree-activation', () => ({
  activateAndRevealWorkspace: vi.fn(),
  activateAndRevealWorktree: vi.fn()
}))

vi.mock('@/lib/connection-context', () => ({
  getConnectionId: vi.fn(() => null)
}))

vi.mock('@/lib/runtime-workspace-file-route', () => ({
  findWorkspaceFileRoute: findWorkspaceFileRouteMock
}))

installTerminalLinkTestEnvironment(doubles)

describe('handleOscLink', () => {
  it('opens local .html file paths in Orca browser tabs with the platform modifier', async () => {
    setPlatform('Macintosh')

    openDetectedFilePath('/tmp/report.html', null, null, deps)

    // openDetectedFilePath is async (fire-and-forget), so flush the microtask queue
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(openFileMock).not.toHaveBeenCalled()
    expect(setPendingEditorRevealMock).not.toHaveBeenCalled()
    expect(createBrowserTabMock).toHaveBeenCalledWith(
      'wt-1',
      'file:///tmp/report.html',
      expect.objectContaining({ title: 'report.html', activate: true })
    )
    expect(openFilePathMock).not.toHaveBeenCalled()
    // Why: the browser tab is the surface — activation must not re-seed a shell into a
    // workspace whose last terminal the user closed.
    expect(activateAndRevealWorktree).toHaveBeenCalledWith('wt-1', {
      providesInitialSurface: true
    })
  })

  it('also opens local .htm paths in Orca browser tabs with the platform modifier', async () => {
    setPlatform('Macintosh')

    openDetectedFilePath('/tmp/legacy.HTM', null, null, deps)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(openFileMock).not.toHaveBeenCalled()
    expect(setPendingEditorRevealMock).not.toHaveBeenCalled()
    expect(createBrowserTabMock).toHaveBeenCalledWith(
      'wt-1',
      'file:///tmp/legacy.HTM',
      expect.objectContaining({ title: 'legacy.HTM' })
    )
    expect(openFilePathMock).not.toHaveBeenCalled()
  })

  it('opens local file paths in Orca and reveals default column 1 with the platform modifier', async () => {
    setPlatform('Macintosh')

    openDetectedFilePath('/tmp/src/main.ts', 42, null, deps)
    await flushAsyncWork()
    await flushDoubleRaf()

    expect(openFileMock).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: '/tmp/src/main.ts' }),
      { forceContentReload: true }
    )
    expect(setPendingEditorRevealMock).toHaveBeenNthCalledWith(1, null)
    expect(setPendingEditorRevealMock).toHaveBeenNthCalledWith(2, {
      filePath: '/tmp/src/main.ts',
      fileId: '/tmp/src/main.ts',
      line: 42,
      column: 1,
      matchLength: 0
    })
    expect(openFilePathMock).not.toHaveBeenCalled()
    // Why: the editor file is the surface — the cross-worktree jump must not add a shell.
    expect(activateAndRevealWorkspace).toHaveBeenCalledWith('wt-1', {
      providesInitialSurface: true
    })
  })

  it('opens a sibling folder-workspace path under its owning host and workspace', async () => {
    const filePath = '/sibling/docs/SKILL.md'
    storeState.openFiles = [{ filePath, worktreeId: 'folder:notes' }]
    findWorkspaceFileRouteMock.mockReturnValueOnce({
      worktreeId: 'folder:notes',
      relativePath: 'docs/SKILL.md',
      executionHostId: 'local'
    })
    openFileMock.mockImplementationOnce(() => {
      storeState.activeFileIdByWorktree['folder:notes'] = 'owned-skill'
    })

    openDetectedFilePath(filePath, 12, null, deps)
    await flushAsyncWork()
    await flushDoubleRaf()

    expect(activateAndRevealWorkspace).toHaveBeenCalledWith('folder:notes', {
      providesInitialSurface: true,
      executionHostId: 'local'
    })
    expect(openFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath,
        relativePath: 'docs/SKILL.md',
        worktreeId: 'folder:notes'
      }),
      { forceContentReload: true }
    )
    expect(setPendingEditorRevealMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ fileId: 'owned-skill' })
    )
  })

  it('leaves ordinary external ownership lookup to the editor loader', async () => {
    const filePath = '/external/docs/readme.md'

    openDetectedFilePath(filePath, null, null, deps)
    await flushAsyncWork()

    expect(findWorkspaceFileRouteMock).not.toHaveBeenCalled()
    expect(openFileMock).toHaveBeenCalledWith(
      expect.objectContaining({ filePath, worktreeId: 'wt-1' }),
      { forceContentReload: true }
    )
  })

  it('preserves explicit column for Orca opens from :line:column links', async () => {
    setPlatform('Macintosh')

    openDetectedFilePath('/tmp/src/main.ts', 42, 7, deps)
    await flushAsyncWork()
    await flushDoubleRaf()

    expect(setPendingEditorRevealMock).toHaveBeenNthCalledWith(1, null)
    expect(setPendingEditorRevealMock).toHaveBeenNthCalledWith(2, {
      filePath: '/tmp/src/main.ts',
      fileId: '/tmp/src/main.ts',
      line: 42,
      column: 7,
      matchLength: 0
    })
    expect(openFilePathMock).not.toHaveBeenCalled()
  })

  it('opens terminal markdown line links in source mode so Monaco can reveal the line', async () => {
    setPlatform('Macintosh')
    const filePath = '/tmp/docs/terminal-scroll-intent-architecture.md'
    const fileId = 'editor:wt-1:runtime-1:terminal-scroll-intent-architecture.md'
    openFileMock.mockImplementationOnce(() => {
      storeState.activeFileIdByWorktree['wt-1'] = fileId
    })

    openDetectedFilePath(filePath, 230, null, deps)
    await flushAsyncWork()
    await flushDoubleRaf()

    expect(setMarkdownViewModeMock).toHaveBeenCalledWith(fileId, 'source')
    expect(setPendingEditorRevealMock).toHaveBeenLastCalledWith({
      filePath,
      fileId,
      line: 230,
      column: 1,
      matchLength: 0
    })
  })

  it('scopes non-Markdown line reveals to the owner-qualified editor tab', async () => {
    setPlatform('Macintosh')
    const filePath = '/tmp/src/main.ts'
    const fileId = 'editor:wt-1:runtime-1:main.ts'
    openFileMock.mockImplementationOnce(() => {
      storeState.activeFileIdByWorktree['wt-1'] = fileId
    })

    openDetectedFilePath(filePath, 42, 7, deps)
    await flushAsyncWork()
    await flushDoubleRaf()

    expect(setMarkdownViewModeMock).not.toHaveBeenCalled()
    expect(setPendingEditorRevealMock).toHaveBeenLastCalledWith({
      filePath,
      fileId,
      line: 42,
      column: 7,
      matchLength: 0
    })
  })

  it('uses the system default app for shift+cmd/ctrl-click file paths', async () => {
    setPlatform('Macintosh')

    openDetectedFilePath('/tmp/src/main.ts', 42, 7, {
      ...deps,
      openWithSystemDefault: true
    })
    await flushAsyncWork()

    expect(openFilePathMock).toHaveBeenCalledWith('/tmp/src/main.ts')
    expect(openFileMock).not.toHaveBeenCalled()
    expect(setPendingEditorRevealMock).not.toHaveBeenCalled()
  })

  it('falls back to Orca when shift+cmd/ctrl-click system default open fails', async () => {
    setPlatform('Macintosh')
    openFilePathMock.mockResolvedValueOnce(false)

    openDetectedFilePath('/tmp/src/main.ts', 42, 7, {
      ...deps,
      openWithSystemDefault: true
    })
    await flushAsyncWork()
    await flushDoubleRaf()

    expect(openFilePathMock).toHaveBeenCalledWith('/tmp/src/main.ts')
    expect(openFileMock).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: '/tmp/src/main.ts' }),
      { forceContentReload: true }
    )
    expect(setPendingEditorRevealMock).toHaveBeenNthCalledWith(1, null)
    expect(setPendingEditorRevealMock).toHaveBeenNthCalledWith(2, {
      filePath: '/tmp/src/main.ts',
      fileId: '/tmp/src/main.ts',
      line: 42,
      column: 7,
      matchLength: 0
    })
  })

  it('cancels a pending Monaco reveal frame when another file open starts', async () => {
    setPlatform('Macintosh')
    const cancelAnimationFrame = vi.fn()
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 42)
    )
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame)

    openDetectedFilePath('/tmp/src/main.ts', 42, null, deps)
    await flushAsyncWork()

    openDetectedFilePath('/tmp/src/other.ts', null, null, deps)

    expect(cancelAnimationFrame).toHaveBeenCalledWith(42)
    expect(setPendingEditorRevealMock).toHaveBeenCalledWith(null)
  })

  it('ignores stale async completion so latest local click wins for Orca open and reveal', async () => {
    setPlatform('Macintosh')
    const firstStat = createDeferred<{ isDirectory: boolean }>()
    const secondStat = createDeferred<{ isDirectory: boolean }>()
    statMock
      .mockImplementationOnce(() => firstStat.promise)
      .mockImplementationOnce(() => secondStat.promise)

    openDetectedFilePath('/tmp/src/first.ts', 10, 2, deps)
    openDetectedFilePath('/tmp/src/second.ts', 20, 3, deps)

    secondStat.resolve({ isDirectory: false })
    await flushAsyncWork()
    await flushDoubleRaf()

    firstStat.resolve({ isDirectory: false })
    await flushAsyncWork()
    await flushDoubleRaf()

    expect(openFilePathMock).not.toHaveBeenCalled()
    expect(openFileMock).toHaveBeenCalledTimes(1)
    expect(openFileMock).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: '/tmp/src/second.ts' }),
      { forceContentReload: true }
    )
    expect(setPendingEditorRevealMock).toHaveBeenNthCalledWith(1, null)
    expect(setPendingEditorRevealMock).toHaveBeenNthCalledWith(2, {
      filePath: '/tmp/src/second.ts',
      fileId: '/tmp/src/second.ts',
      line: 20,
      column: 3,
      matchLength: 0
    })
  })
})

describe('opening a file beside a capped lone terminal', () => {
  beforeEach(() => {
    createEmptySplitGroupMock.mockClear()
    openFileMock.mockClear()
    statMock.mockResolvedValue({ isDirectory: false })
    storeState.openFiles = []
    storeState.layoutByWorktree = { 'wt-1': { type: 'leaf', groupId: 'g1' } }
    storeState.activeGroupIdByWorktree = { 'wt-1': 'g1' }
    storeState.groupsByWorktree = { 'wt-1': [{ id: 'g1' }] }
    mountTerminalHost({ unsplit: true, hostWidth: 1600, paneWidth: 1100, panes: 1 })
  })

  it('opens the editor tab in a new right split when the cap leaves gutter', async () => {
    openDetectedFilePath('/tmp/src/a.ts', 12, 3, { ...deps, sourceTabId: 't1' })
    await flushAsyncWork()
    expect(createEmptySplitGroupMock).toHaveBeenCalledWith('wt-1', 'g1', 'right', {
      activate: false
    })
    expect(openFileMock).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: '/tmp/src/a.ts', mode: 'edit' }),
      expect.objectContaining({ targetGroupId: 'g2', forceContentReload: true })
    )
  })

  it('keeps the same-group behaviour when there is no gutter', async () => {
    mountTerminalHost({ unsplit: true, hostWidth: 1102, paneWidth: 1100, panes: 1 })
    openDetectedFilePath('/tmp/src/a.ts', null, null, { ...deps, sourceTabId: 't1' })
    await flushAsyncWork()
    expect(createEmptySplitGroupMock).not.toHaveBeenCalled()
    expect(openFileMock.mock.calls[0][1]).not.toHaveProperty('targetGroupId')
  })

  it('keeps the same-group behaviour with no source tab id', async () => {
    openDetectedFilePath('/tmp/src/a.ts', null, null, deps)
    await flushAsyncWork()
    expect(createEmptySplitGroupMock).not.toHaveBeenCalled()
  })

  it('never splits for a file routed to a different worktree', async () => {
    storeState.openFiles = [{ filePath: '/sibling/a.ts', worktreeId: 'wt-2' }]
    findWorkspaceFileRouteMock.mockReturnValueOnce({
      worktreeId: 'wt-2',
      relativePath: 'a.ts',
      executionHostId: 'local'
    })
    openDetectedFilePath('/sibling/a.ts', null, null, { ...deps, sourceTabId: 't1' })
    await flushAsyncWork()
    expect(createEmptySplitGroupMock).not.toHaveBeenCalled()
  })

  it('does not split on a layout that changed while the stat was in flight', async () => {
    const pendingStat = createDeferred<{ isDirectory: boolean }>()
    statMock.mockReturnValueOnce(pendingStat.promise)
    openDetectedFilePath('/tmp/src/a.ts', null, null, { ...deps, sourceTabId: 't1' })
    // The user split the tab area themselves while the file was being resolved.
    mountTerminalHost({ unsplit: false, hostWidth: 800, paneWidth: 800, panes: 1 })
    pendingStat.resolve({ isDirectory: false })
    await flushAsyncWork()
    expect(createEmptySplitGroupMock).not.toHaveBeenCalled()
  })
})
