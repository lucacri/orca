import type { WorktreeCreationRequest } from '@/lib/pending-worktree-creation'
import {
  canUseIssueCommandForLinkedItemProvider,
  renderIssueCommandTemplate,
  DEFAULT_ISSUE_COMMAND_TEMPLATE
} from '@/lib/new-workspace'
import type { FolderWorkspaceLinkedTask } from '../../../shared/folder-workspace-types'

type ComposerIssueCommandInput = {
  enabled: boolean
  provider: FolderWorkspaceLinkedTask['provider'] | null
  issueNumber: number | null
  template: string
  artifactUrl: string | null
}

export function shouldPrepareComposerIssueCommand(input: ComposerIssueCommandInput): boolean {
  return (
    input.enabled &&
    canUseIssueCommandForLinkedItemProvider(input.provider) &&
    input.issueNumber !== null &&
    input.template.trim().length > 0
  )
}

export function buildTrustedComposerIssueCommand(
  input: ComposerIssueCommandInput & { trustDecision: 'run' | 'skip' }
): WorktreeCreationRequest['issueCommand'] | undefined {
  if (input.trustDecision !== 'run' || !shouldPrepareComposerIssueCommand(input)) {
    return undefined
  }
  return {
    command: renderIssueCommandTemplate(input.template.trim(), {
      issueNumber: input.issueNumber,
      artifactUrl: input.artifactUrl
    })
  }
}

// Why: issues only — a merge request keeps the plain linked-URL draft. An untouched note means the template *is* the agent prompt, so the shell split is suppressed.
export function resolveLinkedOnlyTemplatePrompt(input: {
  trustDecision: 'run' | 'skip'
  note: string
  issueNumber: number | null
  artifactUrl: string | null
  template: string
}): string {
  if (
    input.trustDecision !== 'run' ||
    input.note.trim() ||
    input.artifactUrl === null ||
    input.issueNumber === null
  ) {
    return ''
  }
  return renderIssueCommandTemplate(input.template.trim() || DEFAULT_ISSUE_COMMAND_TEMPLATE, {
    issueNumber: input.issueNumber,
    artifactUrl: input.artifactUrl
  })
}
