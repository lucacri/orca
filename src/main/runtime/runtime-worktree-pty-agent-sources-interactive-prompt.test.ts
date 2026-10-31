import { describe, expect, it } from 'vitest'
import type { AgentStatusIpcPayload } from '../../shared/agent-status-types'
import { collectRuntimeWorktreePtyAgentSources } from './runtime-worktree-pty-agent-sources'

const PANE = 'tab-1:11111111-1111-4111-8111-111111111111'
const QUESTION = JSON.stringify({ questions: [{ question: 'Ship it?', options: [{ label: 'Yes' }] }] })

function sourceFor(entry: Partial<AgentStatusIpcPayload>) {
  const [source] = collectRuntimeWorktreePtyAgentSources({
    hookSnapshots: [
      {
        state: 'blocked',
        prompt: '',
        paneKey: PANE,
        tabId: 'tab-1',
        worktreeId: 'repo-1::/workspace/app',
        connectionId: null,
        stateStartedAt: 1,
        receivedAt: 1,
        ...entry
      } as AgentStatusIpcPayload
    ],
    mirroredWorktreeIdByTabId: new Map(),
    connectedPtyEvidence: { tabIds: new Set(['tab-1']), paneKeys: new Set(), ptyIdByTerminalHandle: new Map() }
  })
  return source
}

describe('worktree ps interactive prompt', () => {
  it('carries the full question JSON a waiting agent asks', () => {
    expect(sourceFor({ interactivePrompt: QUESTION }).interactivePrompt).toBe(QUESTION)
  })

  it('omits the field when the agent asks nothing', () => {
    expect(sourceFor({}).interactivePrompt).toBeUndefined()
  })
})
