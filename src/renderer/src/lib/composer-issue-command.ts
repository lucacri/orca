import type { WorktreeCreationRequest } from '@/lib/pending-worktree-creation'
import {
  canUseIssueCommandForLinkedItemProvider,
  renderIssueCommandTemplate
} from '@/lib/new-workspace'
import {
  DEFAULT_REPO_COMMAND_TEMPLATE,
  type RepoCommandKind
} from '../../../shared/repo-command-kind'
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

// Why: an untouched note means the template *is* the agent prompt, so the caller suppresses the
// shell issue-command split. Callers gate on whether a linked-only template applies at all.
export function resolveLinkedOnlyTemplatePrompt(input: {
  trustDecision: 'run' | 'skip'
  note: string
  kind: RepoCommandKind
  number: number | null
  artifactUrl: string | null
  template: string
}): string {
  const template = input.template.trim()
  // Why: the trust gate guards repository-supplied text only — an absent template leaves the
  // built-in default, a local constant that is never worth denying.
  if (
    (template && input.trustDecision !== 'run') ||
    input.note.trim() ||
    input.artifactUrl === null
  ) {
    return ''
  }
  // Why: a legacy issue template's {{issue}} is meaningless without a number; a review template
  // leans on {{artifact_url}}, and a PR picked by URL can arrive without one.
  if (input.kind === 'issue' && input.number === null) {
    return ''
  }
  return renderIssueCommandTemplate(template || DEFAULT_REPO_COMMAND_TEMPLATE[input.kind], {
    issueNumber: input.number,
    artifactUrl: input.artifactUrl
  })
}
