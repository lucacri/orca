// @vitest-environment happy-dom

import { act, type ReactNode } from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Why: Radix tooltips need a provider the dialog does not own, and the menu's
// portal needs real layout. Stand-ins keep these tests on provider selection.
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children?: ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
  TooltipTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>
}))

vi.mock('@/components/ui/dropdown-menu', async () => {
  const React = await import('react')
  const SelectContext = React.createContext<(value: string) => void>(() => {})
  const Passthrough = ({ children }: { children?: ReactNode }) => <>{children}</>
  return {
    DropdownMenu: Passthrough,
    DropdownMenuTrigger: Passthrough,
    DropdownMenuContent: Passthrough,
    DropdownMenuRadioGroup: ({
      value,
      onValueChange,
      children
    }: {
      value: string
      onValueChange: (value: string) => void
      children?: ReactNode
    }) => (
      <SelectContext.Provider value={onValueChange}>
        <div data-selected={value}>{children}</div>
      </SelectContext.Provider>
    ),
    DropdownMenuRadioItem: ({ value, children }: { value: string; children?: ReactNode }) => {
      const onSelect = React.useContext(SelectContext)
      return (
        <button type="button" role="menuitemradio" onClick={() => onSelect(value)}>
          {children}
        </button>
      )
    }
  }
})

import {
  cleanupDialogTest,
  fetchLinearIssue,
  issueInput,
  makeEligibility,
  openDialog,
  openIssueButton,
  openUrl,
  providerChip,
  resetDialogTestState,
  saveButton,
  updateWorktreeMeta
} from './worktree-meta-dialog-test-fixtures'

describe('WorktreeMetaDialog GitLab review fields', () => {
  beforeEach(resetDialogTestState)
  afterEach(cleanupDialogTest)

  it('shows a linked GitLab MR from the plain sidebar entry point, with no provider hint', async () => {
    openDialog({ worktree: { linkedGitLabMR: 77 } })
    const input = screen.getByPlaceholderText('MR ! or GitLab URL')

    expect(screen.getByText('GitLab MR')).toBeTruthy()
    expect(input instanceof HTMLInputElement && input.value).toBe('77')
    fireEvent.change(input, { target: { value: '' } })
    await act(async () => fireEvent.click(saveButton()))

    await waitFor(() => expect(updateWorktreeMeta).toHaveBeenCalledTimes(1))
    expect(updateWorktreeMeta.mock.calls[0]?.[1]).toEqual({ linkedGitLabMR: null })
  })

  it('never rewrites an untouched GitLab MR on a comment-only save', async () => {
    openDialog({ worktree: { linkedGitLabMR: 77 } })
    fireEvent.change(screen.getByPlaceholderText('Notes about this worktree...'), {
      target: { value: 'new note' }
    })
    await act(async () => fireEvent.click(saveButton()))

    await waitFor(() => expect(updateWorktreeMeta).toHaveBeenCalledTimes(1))
    expect(updateWorktreeMeta.mock.calls[0]?.[1]).toEqual({ comment: 'new note' })
  })

  // Why: the Checks panel's GitLab path on a workspace that also carries a stale
  // linkedPR. The baseline must come from linkedGitLabMR, not the display winner.
  it('never rewrites an untouched GitLab MR when a stale GitHub PR is also stored', async () => {
    openDialog({
      worktree: { linkedGitLabMR: 77, linkedPR: 5 },
      modalReviewProvider: 'gitlab',
      modalCurrentReview: 77
    })
    fireEvent.change(screen.getByPlaceholderText('Notes about this worktree...'), {
      target: { value: 'new note' }
    })
    await act(async () => fireEvent.click(saveButton()))

    await waitFor(() => expect(updateWorktreeMeta).toHaveBeenCalledTimes(1))
    expect(updateWorktreeMeta.mock.calls[0]?.[1]).toEqual({ comment: 'new note' })
  })

  it('aims an empty review field at GitLab when the repo is GitLab', async () => {
    openDialog({ detectProvider: () => Promise.resolve(makeEligibility('gitlab')) })
    expect(screen.queryByText('GH PR')).toBeNull()
    await waitFor(() => expect(screen.getByText('GitLab MR')).toBeTruthy())
  })

  it('renders an inert review field, not a GitHub one, while the provider is unknown', () => {
    openDialog({ detectProvider: () => new Promise(() => {}) })
    expect(screen.queryByText('GH PR')).toBeNull()
    const input = screen.getByLabelText('Review link')
    expect(input instanceof HTMLInputElement && input.disabled).toBe(true)
  })

  it('shows a Bitbucket PR read-only rather than mislabelling it GitHub', () => {
    openDialog({ worktree: { linkedBitbucketPR: 9 } })
    const input = screen.getByLabelText('Bitbucket PR')
    expect(input instanceof HTMLInputElement && input.value).toBe('9')
    expect(input instanceof HTMLInputElement && input.disabled).toBe(true)
  })

  it('seeds the chip and value from a GitLab issue link', () => {
    openDialog({ worktree: { linkedGitLabIssue: 43 } })
    expect(providerChip().textContent).toContain('GitLab')
    expect(issueInput().value).toBe('43')
  })

  it('warns that saving a GitHub issue unlinks the stored GitLab one', () => {
    openDialog({ worktree: { linkedGitLabIssue: 43 } })
    fireEvent.change(issueInput(), { target: { value: 'https://github.com/o/r/issues/5' } })
    expect(screen.getByRole('status').textContent).toContain('GitLab #43')
  })

  it('offers GitLab in the provider chooser and saves through linkedGitLabIssue', async () => {
    openDialog({ worktree: { linkedIssue: 42 } })
    fireEvent.click(providerChip())
    fireEvent.click(screen.getByRole('menuitemradio', { name: /GitLab/ }))
    fireEvent.change(issueInput(), { target: { value: '#43' } })
    await act(async () => fireEvent.click(saveButton()))

    await waitFor(() => expect(updateWorktreeMeta).toHaveBeenCalledTimes(1))
    expect(updateWorktreeMeta.mock.calls[0]?.[1]).toEqual({
      linkedGitLabIssue: 43,
      linkedIssue: null
    })
  })

  it('auto-selects GitLab from a pasted self-hosted issue URL', () => {
    openDialog()
    fireEvent.change(issueInput(), {
      target: { value: 'https://gitlab.critel.li/g/p/-/issues/43' }
    })
    expect(providerChip().textContent).toContain('GitLab')
  })

  it('opens a GitLab issue from its creation-time linkedWorkItem url', () => {
    openDialog({
      worktree: {
        linkedGitLabIssue: 43,
        linkedWorkItem: {
          provider: 'gitlab',
          type: 'issue',
          number: 43,
          title: 'Thing',
          url: 'https://gitlab.critel.li/g/p/-/issues/43'
        }
      }
    })
    expect(openIssueButton().disabled).toBe(false)
    fireEvent.click(openIssueButton())
    expect(openUrl).toHaveBeenCalledWith('https://gitlab.critel.li/g/p/-/issues/43')
    expect(fetchLinearIssue).not.toHaveBeenCalled()
  })

  it('opens a pasted GitLab issue URL directly', () => {
    openDialog()
    fireEvent.change(issueInput(), { target: { value: 'https://gitlab.com/g/p/-/issues/3' } })
    fireEvent.click(openIssueButton())
    expect(openUrl).toHaveBeenCalledWith('https://gitlab.com/g/p/-/issues/3')
  })

  it('disables the arrow for a bare GitLab number with no stored url', () => {
    openDialog({ worktree: { linkedGitLabIssue: 43 } })
    expect(openIssueButton().disabled).toBe(true)
  })

  // Why: parseGitLabIssueOrMRLink accepts any scheme, and this path hands its
  // input straight to shell.openUrl.
  it('never opens a non-http GitLab-shaped URL', () => {
    openDialog()
    fireEvent.change(issueInput(), {
      target: { value: 'ftp://gitlab.critel.li/g/p/-/issues/3' }
    })
    expect(openIssueButton().disabled).toBe(true)
  })

  it.each([
    { label: 'a different number', overrides: { number: 99 } },
    { label: 'a merge request', overrides: { type: 'mr' as const } },
    { label: 'another provider', overrides: { provider: 'github' as const } }
  ])('disables the arrow when the stored item is $label', ({ overrides }) => {
    openDialog({
      worktree: {
        linkedGitLabIssue: 43,
        linkedWorkItem: {
          provider: 'gitlab',
          type: 'issue',
          number: 43,
          title: 'Thing',
          url: 'https://gitlab.critel.li/g/p/-/issues/43',
          ...overrides
        }
      }
    })
    expect(openIssueButton().disabled).toBe(true)
  })

  it('does not open the creation-time url for the same number in another project', () => {
    openDialog({
      worktree: {
        linkedGitLabIssue: 43,
        linkedWorkItem: {
          provider: 'gitlab',
          type: 'issue',
          number: 43,
          title: 'Thing',
          url: 'https://gitlab.critel.li/g/p/-/issues/43'
        }
      }
    })
    fireEvent.change(issueInput(), {
      target: { value: 'https://gitlab.critel.li/other/proj/-/issues/43' }
    })
    fireEvent.click(openIssueButton())
    expect(openUrl).toHaveBeenCalledWith('https://gitlab.critel.li/other/proj/-/issues/43')
  })
})
