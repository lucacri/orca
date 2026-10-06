import { cleanup, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { useAppStore } from '@/store'
import type { FolderWorkspace } from '../../../../shared/folder-workspace-types'
import type { LinearIssue } from '../../../../shared/linear/issue-types'
import type { Repo } from '../../../../shared/repo-types'
import type { WorktreeMeta } from '../../../../shared/worktree/meta-types'
import type { WorktreeMetaUpdateOptions } from '@/store/slices/worktree-helpers'
import type { Worktree } from '../../../../shared/worktree/types'
import WorktreeMetaDialog from './WorktreeMetaDialog'
import { resetDetectedReviewProvidersForTest } from './use-worktree-review-provider'

export const REPO_ID = 'repo-1'
export const WORKTREE_ID = 'repo-1::/repo/worktrees/feature'

// Why: the review field's placeholder appears only after provider detection, so lookups await it.
export const IME_FIELDS = [
  {
    placeholder: 'Notes about this worktree...',
    value: '日本語',
    updates: { comment: '日本語' }
  },
  {
    placeholder: 'Custom display name...',
    value: '日本語の名前',
    updates: { displayName: '日本語の名前' }
  },
  {
    placeholder: 'Issue #, or a GitHub, GitLab or Linear URL',
    value: '42',
    updates: { linkedIssue: 42 }
  },
  { placeholder: 'PR # or GitHub URL', value: '43', updates: { linkedPR: 43 } },
  { placeholder: 'MR ! or GitLab URL', value: '!44', updates: { linkedGitLabMR: 44 } }
] as const

export const initialState = useAppStore.getInitialState()
export const updateWorktreeMeta =
  vi.fn<
    (
      id: string,
      updates: Partial<WorktreeMeta>,
      options?: WorktreeMetaUpdateOptions
    ) => Promise<{ ok: true } | { ok: false; error: string }>
  >()
export const fetchLinearIssue = vi.fn<(...args: never[]) => Promise<LinearIssue | null>>()
export type GetEligibility = ReturnType<
  typeof useAppStore.getState
>['getHostedReviewCreationEligibility']

/** Only `provider` is read by the review row; the rest satisfies the wire type. */
export function makeEligibility(
  provider: Awaited<ReturnType<GetEligibility>>['provider']
): Awaited<ReturnType<GetEligibility>> {
  return {
    provider,
    review: null,
    canCreate: true,
    blockedReason: null,
    nextAction: null,
    reviewLookupOutcome: 'not_found'
  }
}
export const openUrl = vi.fn<(url: string) => void>()

/** Only `url` is read by the open-issue path. */
export function makeLinearIssue(url: string): LinearIssue {
  return { url } as LinearIssue
}

export function makeRepo(id: string = REPO_ID, path: string = '/repo'): Repo {
  return { id, path, displayName: 'orca', badgeColor: '#999999', addedAt: 1 }
}

export function makeWorktree(overrides: Partial<Worktree> = {}): Worktree {
  return {
    id: WORKTREE_ID,
    repoId: REPO_ID,
    path: '/repo/worktrees/feature',
    displayName: 'Feature work',
    branch: 'feature',
    head: 'abc123',
    isBare: false,
    isMainWorktree: false,
    comment: 'existing note',
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 1,
    ...overrides
  }
}

export function makeFolderWorkspace(overrides: Partial<FolderWorkspace> = {}): FolderWorkspace {
  return {
    id: 'fw-1',
    projectGroupId: 'pg-1',
    name: 'Docs folder',
    folderPath: '/repo/docs',
    linkedTask: {
      provider: 'linear',
      type: 'issue',
      number: 901,
      title: 'Fix auth',
      url: 'https://linear.app/acme/issue/STA-901',
      linearIdentifier: 'STA-901'
    },
    comment: '',
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 1,
    createdAt: 1,
    updatedAt: 1,
    ...overrides
  }
}

export function openDialog(
  options: {
    worktree?: Partial<Worktree>
    worktreeId?: string
    folderWorkspace?: Partial<FolderWorkspace>
    /** Extra owners of the same workspace ID, which the index reads as ambiguous. */
    otherRepos?: { repoId: string; worktree?: Partial<Worktree> }[]
    modalRepoId?: string
    modalExecutionHostId?: string
    modalReviewProvider?: 'github' | 'gitlab'
    modalCurrentReview?: number
    modalSuppressHostedReviewRefresh?: boolean
    linearViewerOrganizationUrlKey?: string
    /** Resolves the review provider for a workspace with nothing linked. */
    detectProvider?: GetEligibility
  } = {}
): void {
  const worktree = makeWorktree(options.worktree)
  const otherRepos = options.otherRepos ?? []
  useAppStore.setState({
    repos: [makeRepo(), ...otherRepos.map((other) => makeRepo(other.repoId, `/${other.repoId}`))],
    worktreesByRepo: {
      [REPO_ID]: [worktree],
      ...Object.fromEntries(
        otherRepos.map((other) => [
          other.repoId,
          [makeWorktree({ repoId: other.repoId, ...other.worktree })]
        ])
      )
    },
    ...(options.folderWorkspace
      ? { folderWorkspaces: [makeFolderWorkspace(options.folderWorkspace)] }
      : {}),
    ...(options.linearViewerOrganizationUrlKey
      ? {
          linearStatus: {
            connected: true,
            viewer: {
              displayName: 'Viewer',
              email: null,
              organizationName: 'Active',
              organizationUrlKey: options.linearViewerOrganizationUrlKey
            }
          }
        }
      : {}),
    activeModal: 'edit-meta',
    modalData: {
      worktreeId: options.worktreeId ?? worktree.id,
      ...(options.modalRepoId ? { repoId: options.modalRepoId } : {}),
      ...(options.modalExecutionHostId ? { executionHostId: options.modalExecutionHostId } : {}),
      ...(options.modalReviewProvider ? { reviewProvider: options.modalReviewProvider } : {}),
      ...(options.modalCurrentReview ? { currentReview: options.modalCurrentReview } : {}),
      ...(options.modalSuppressHostedReviewRefresh ? { suppressHostedReviewRefresh: true } : {}),
      currentDisplayName: worktree.displayName,
      currentComment: worktree.comment,
      focus: 'comment'
    },
    updateWorktreeMeta,
    getHostedReviewCreationEligibility:
      options.detectProvider ?? (() => Promise.resolve(makeEligibility('github'))),
    fetchLinearIssue: fetchLinearIssue as unknown as ReturnType<
      typeof useAppStore.getState
    >['fetchLinearIssue']
  })
  render(<WorktreeMetaDialog />)
}

export function issueInput(): HTMLInputElement {
  return screen.getByPlaceholderText('Issue #, or a GitHub, GitLab or Linear URL')
}

export function providerChip(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Issue provider' })
}

export function saveButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Save' })
}

export function openIssueButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Open linked issue' })
}

export function resetDialogTestState(): void {
  useAppStore.setState(initialState, true)
  resetDetectedReviewProvidersForTest()
  updateWorktreeMeta.mockReset()
  updateWorktreeMeta.mockResolvedValue({ ok: true })
  fetchLinearIssue.mockReset()
  fetchLinearIssue.mockResolvedValue(null)
  openUrl.mockReset()
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { shell: { openUrl } }
  })
}

export function cleanupDialogTest(): void {
  cleanup()
  vi.restoreAllMocks()
  useAppStore.setState(initialState, true)
}
