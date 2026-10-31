import { describe, expect, it } from 'vitest'
import type { RuntimeWorktreePsSummary } from '../../shared/runtime-types'
import { attachRuntimeWorktreeAgentRows } from './runtime-worktree-agent-rows'
import type { RuntimeWorktreeAgentSource } from './runtime-worktree-agent-source'

const WORKTREE_ID = 'repo-1::/workspace/app'
const PARENT = 'tab-1:11111111-1111-4111-8111-111111111111'

function source(paneKey: string): RuntimeWorktreeAgentSource {
  return {
    paneKey,
    tabId: 'tab-1',
    worktreeId: WORKTREE_ID,
    connectionId: null,
    state: 'done',
    agentType: 'claude',
    prompt: '',
    lastAssistantMessage: null,
    toolName: null,
    toolInput: null,
    interrupted: false,
    stateStartedAt: 1,
    updatedAt: 1
  }
}

describe('worktree ps agent row question', () => {
  it('passes the full question JSON through to the row', () => {
    const summaries = new Map([[WORKTREE_ID, { worktreeId: WORKTREE_ID, agents: [] } as unknown as RuntimeWorktreePsSummary]])
    attachRuntimeWorktreeAgentRows({
      summaries,
      terminalTitleEvidenceByWorktreeId: new Map(),
      rowSources: new Map([[PARENT, { ...source(PARENT), state: 'blocked', interactivePrompt: '{"questions":[]}' }]]),
      orchestrationByPaneKey: null,
      getSummary: (id) => summaries.get(id) ?? null
    })
    expect(summaries.get(WORKTREE_ID)?.agents[0]?.interactivePrompt).toBe('{"questions":[]}')
  })
})
