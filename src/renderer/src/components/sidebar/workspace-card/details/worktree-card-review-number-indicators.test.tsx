import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { getWorktreeCardDetails } from '../../../../../../shared/worktree/row-display/card-properties'
import type { WorktreeCardController } from '../controller/use-worktree-card-controller'
import { renderWorktreeCardIndicators } from './worktree-card-details-items'

function makeCard(overrides: Partial<WorktreeCardController> = {}): WorktreeCardController {
  return {
    worktree: {
      id: 'repo-1::/repo/worktrees/review-number',
      repoId: 'repo-1',
      path: '/repo/worktrees/review-number',
      displayName: 'Show review number',
      branch: 'feature/review-number',
      head: 'abc123',
      isBare: false,
      isMainWorktree: false,
      comment: '',
      linkedIssue: null,
      linkedPR: 456,
      linkedLinearIssue: null,
      isArchived: false,
      isUnread: false,
      isPinned: false,
      sortOrder: 0,
      lastActivityAt: 1
    },
    newCardStyle: true,
    compactCards: false,
    isFolder: false,
    branch: 'feature/review-number',
    visibleCardTitle: 'Show review number',
    cardProps: ['pr'],
    cardDetails: getWorktreeCardDetails(['pr'], {
      compactWorktreeCards: false,
      newCardStyle: true
    }),
    workspacePorts: [],
    hasDetails: true,
    hasPorts: false,
    showStatus: false,
    showInlineAgentList: false,
    showLineageChildChip: false,
    showIdentityInNewCard: false,
    showDeleteQuickAction: false,
    metaReview: {
      provider: 'github',
      number: 456,
      title: 'Show review number',
      state: 'open',
      status: 'success',
      url: 'https://github.com/acme/orca/pull/456'
    },
    ...overrides
  } as WorktreeCardController
}

describe('worktree card review number indicators', () => {
  it('renders the selected review link in the card indicators', () => {
    const markup = renderToStaticMarkup(<>{renderWorktreeCardIndicators(makeCard())}</>)

    expect(markup).toContain('data-worktree-review-number=""')
    expect(markup).toContain('href="https://github.com/acme/orca/pull/456"')
    expect(markup).toContain('aria-label="Linked PR #456"')
    expect(markup).toContain('>#456</a>')
  })

  it('keeps the review number out of the card when the property is hidden', () => {
    const markup = renderToStaticMarkup(
      <>{renderWorktreeCardIndicators(makeCard({ hasDetails: false, metaReview: null }))}</>
    )

    expect(markup).not.toContain('data-worktree-review-number')
    expect(markup).not.toContain('#456')
  })
})
