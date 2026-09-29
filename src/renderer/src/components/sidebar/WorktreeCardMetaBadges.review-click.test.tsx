// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { WorktreeCardMetaBadges } from './WorktreeCardMetaBadges'

describe('WorktreeCardMetaBadges review number click', () => {
  it('opens the review in Orca instead of following the link', () => {
    const onOpenReviewInBrowser = vi.fn()
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => {
      root.render(
        <WorktreeCardMetaBadges
          issue={null}
          linearIssue={null}
          review={{
            provider: 'gitlab',
            number: 77,
            title: 'MR',
            state: 'open',
            url: 'https://gitlab.example.com/acme/orca/-/merge_requests/77',
            status: 'pending'
          }}
          comment={null}
          onOpenReviewInBrowser={onOpenReviewInBrowser}
        />
      )
    })

    const link = container.querySelector('a[data-worktree-review-number]')
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    act(() => {
      link?.dispatchEvent(event)
    })

    expect(onOpenReviewInBrowser).toHaveBeenCalledWith(
      'https://gitlab.example.com/acme/orca/-/merge_requests/77'
    )
    expect(event.defaultPrevented).toBe(true)
    act(() => root.unmount())
  })
})
