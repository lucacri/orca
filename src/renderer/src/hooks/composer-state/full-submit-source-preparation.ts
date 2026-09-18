import type { ComposerModel } from './composer-model'

type FullSubmitSourcePreparationInput = Pick<
  ComposerModel,
  | 'agentPrompt'
  | 'attachmentPaths'
  | 'baseBranch'
  | 'branchNameOverride'
  | 'compareBaseRef'
  | 'effectiveLinkedPR'
  | 'decisions'
  | 'enableIssueAutomation'
  | 'fallbackCreatureName'
  | 'hasLoadedIssueCommand'
  | 'issueCommandTemplate'
  | 'currentRepoCommands'
  | 'lastAutoNameRef'
  | 'linkedGitLabMR'
  | 'linkedWorkItem'
  | 'name'
  | 'parsedLinkedIssueNumber'
  | 'pushTarget'
  | 'workspaceSeedName'
>

import { useCallback } from 'react'
import {
  getLinkedWorkItemWorkspaceName,
  getLinkedWorkItemProvider,
  canUseIssueCommandForLinkedItemProvider,
  renderIssueCommandTemplate,
  buildAgentPromptWithContext
} from '@/lib/new-workspace'
import {
  DEFAULT_REPO_COMMAND_TEMPLATE,
  getRepoCommandKindForLinkedItemType,
  type RepoCommandKind
} from '../../../../shared/repo-command-kind'
import type { IssueCommandReadResult } from '@/runtime/runtime-hooks-client'

import { getLinkedWorkItemPromptContext } from '@/lib/linked-work-item-context'
import type { PendingSmartGitHubSubmitResolution } from './source-selection-decisions'

// Why: the submit-time linked item can differ from component state (Smart paste / PR start point),
// so the template is chosen from the pair held in state, by the kind of the item being submitted.
export function resolveLinkedOnlyTemplateText(
  results: Partial<Record<RepoCommandKind, IssueCommandReadResult>> | null,
  kind: RepoCommandKind
): string {
  return results?.[kind]?.effectiveContent?.trim() ?? ''
}

// Why: the template becomes the agent's draft prompt, so untrusted shared content is dropped
// here rather than anywhere downstream.
export function resolveTrustedStartupPrompt(input: {
  applyTemplate: boolean
  trustDecision: 'run' | 'skip'
  templatePrompt: string
  plainPrompt: string
}): string {
  return input.applyTemplate && input.trustDecision === 'run'
    ? input.templatePrompt
    : input.plainPrompt
}

export function useFullSubmitSourcePreparation(input: FullSubmitSourcePreparationInput) {
  const {
    agentPrompt,
    attachmentPaths,
    baseBranch,
    branchNameOverride,
    compareBaseRef,
    decisions,
    effectiveLinkedPR,
    enableIssueAutomation,
    fallbackCreatureName,
    hasLoadedIssueCommand,
    issueCommandTemplate,
    currentRepoCommands,
    lastAutoNameRef,
    linkedGitLabMR,
    linkedWorkItem,
    name,
    parsedLinkedIssueNumber,
    pushTarget,
    workspaceSeedName
  } = input
  const { isExplicitWorkspaceNameInput, resolveSmartGitHubCreateNames } = decisions

  const prepareFullSubmitSource = useCallback(
    (smartGitHubResolution: PendingSmartGitHubSubmitResolution) => {
      const submitLinkedWorkItem =
        smartGitHubResolution.kind === 'none'
          ? linkedWorkItem
          : smartGitHubResolution.linkedWorkItem

      const submitLinkedIssueNumber =
        smartGitHubResolution.kind === 'none'
          ? parsedLinkedIssueNumber
          : smartGitHubResolution.linkedIssueNumber

      const submitLinkedPR =
        smartGitHubResolution.kind === 'none' ? effectiveLinkedPR : smartGitHubResolution.linkedPR

      const submitTitleName = submitLinkedWorkItem
        ? getLinkedWorkItemWorkspaceName(submitLinkedWorkItem)
        : null

      const nameIsAutoManaged = !isExplicitWorkspaceNameInput({
        name,
        lastAutoName: lastAutoNameRef.current
      })

      const smartGitHubCreateNames =
        smartGitHubResolution.kind === 'none'
          ? { workspaceName: workspaceSeedName, displayName: undefined }
          : resolveSmartGitHubCreateNames({
              resolutionKind: smartGitHubResolution.kind,
              smartWorkspaceName: smartGitHubResolution.workspaceName,
              smartDisplayName: smartGitHubResolution.displayName,
              fallbackWorkspaceName: workspaceSeedName,
              nameIsAutoManaged
            })

      const workspaceName =
        smartGitHubResolution.kind === 'none'
          ? nameIsAutoManaged && submitTitleName
            ? submitTitleName.seedName
            : workspaceSeedName
          : smartGitHubCreateNames.workspaceName

      if (!workspaceName) {
        return null
      }

      // Why: only a name Orca generated may be retired — the creature pool contains ordinary words
      // ("orca", "runner", "molly") a user can type deliberately and expect to reuse.
      // The identity check is what a linked PR/issue seed makes necessary here; mobile's blank-create
      // path (NewWorktreeModal, `nameWasGenerated: !trimmedName`) has no other seed, so it can't
      // share this expression. Same rule, two submit paths — change both together.
      const nameWasGenerated = !name.trim() && workspaceName === fallbackCreatureName

      const submitBaseBranch =
        smartGitHubResolution.kind === 'pr-start-point'
          ? smartGitHubResolution.baseBranch
          : smartGitHubResolution.kind === 'metadata-only' &&
              (effectiveLinkedPR !== null || linkedGitLabMR !== null)
            ? undefined
            : baseBranch

      const submitCompareBaseRef =
        smartGitHubResolution.kind === 'pr-start-point'
          ? smartGitHubResolution.compareBaseRef
          : smartGitHubResolution.kind === 'none'
            ? compareBaseRef
            : undefined

      const submitPushTarget =
        smartGitHubResolution.kind === 'pr-start-point'
          ? smartGitHubResolution.pushTarget
          : smartGitHubResolution.kind === 'none'
            ? pushTarget
            : undefined

      const submitBranchNameOverride =
        smartGitHubResolution.kind === 'pr-start-point'
          ? smartGitHubResolution.branchNameOverride
          : smartGitHubResolution.kind === 'none'
            ? branchNameOverride
            : undefined

      const submitLinkedWorkItemProvider = submitLinkedWorkItem
        ? getLinkedWorkItemProvider(submitLinkedWorkItem)
        : null

      const submitShouldApplyLinkedOnlyTemplate =
        enableIssueAutomation &&
        !agentPrompt.trim() &&
        Boolean(submitLinkedWorkItem) &&
        hasLoadedIssueCommand &&
        canUseIssueCommandForLinkedItemProvider(submitLinkedWorkItemProvider)

      const submitCommandKind = getRepoCommandKindForLinkedItemType(submitLinkedWorkItem?.type)

      const submitLinkedOnlyTemplatePrompt =
        submitShouldApplyLinkedOnlyTemplate && submitLinkedWorkItem
          ? renderIssueCommandTemplate(
              resolveLinkedOnlyTemplateText(currentRepoCommands, submitCommandKind) ||
                DEFAULT_REPO_COMMAND_TEMPLATE[submitCommandKind],
              { issueNumber: submitLinkedWorkItem.number, artifactUrl: submitLinkedWorkItem.url }
            )
          : ''

      const linkedPromptContext = getLinkedWorkItemPromptContext(submitLinkedWorkItem)

      const submitStartupPromptWithoutTemplate = buildAgentPromptWithContext(
        agentPrompt,
        attachmentPaths,
        linkedPromptContext.linkedUrls,
        linkedPromptContext.linkedContextBlocks
      )

      const submitStartupPromptWithTemplate = submitShouldApplyLinkedOnlyTemplate
        ? buildAgentPromptWithContext(
            submitLinkedOnlyTemplatePrompt,
            attachmentPaths,
            [],
            linkedPromptContext.linkedContextBlocks
          )
        : submitStartupPromptWithoutTemplate

      const submitShouldRunIssueAutomation =
        enableIssueAutomation &&
        canUseIssueCommandForLinkedItemProvider(submitLinkedWorkItemProvider) &&
        submitLinkedIssueNumber !== null &&
        issueCommandTemplate.length > 0 &&
        !submitShouldApplyLinkedOnlyTemplate

      return {
        submitLinkedWorkItem,
        submitLinkedIssueNumber,
        submitLinkedPR,
        submitTitleName,
        nameIsAutoManaged,
        smartGitHubCreateNames,
        workspaceName,
        nameWasGenerated,
        submitBaseBranch,
        submitCompareBaseRef,
        submitPushTarget,
        submitBranchNameOverride,
        submitLinkedWorkItemProvider,
        submitCommandKind,
        submitShouldApplyLinkedOnlyTemplate,
        submitStartupPromptWithoutTemplate,
        submitStartupPromptWithTemplate,
        submitStartupPrompt: submitStartupPromptWithTemplate,
        submitShouldRunIssueAutomation
      }
    },
    [
      agentPrompt,
      attachmentPaths,
      baseBranch,
      branchNameOverride,
      effectiveLinkedPR,
      enableIssueAutomation,
      fallbackCreatureName,
      hasLoadedIssueCommand,
      issueCommandTemplate,
      currentRepoCommands,
      linkedGitLabMR,
      linkedWorkItem,
      isExplicitWorkspaceNameInput,
      name,
      parsedLinkedIssueNumber,
      pushTarget,
      resolveSmartGitHubCreateNames,
      workspaceSeedName,
      compareBaseRef,
      lastAutoNameRef
    ]
  )

  return {
    prepareFullSubmitSource
  }
}
