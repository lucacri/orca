import { describe, expect, it } from 'vitest'

import { isVisibleReviewRefreshEnabled } from './use-visible-review-refresh'

describe('isVisibleReviewRefreshEnabled', () => {
  it('refreshes new-style cards when only the PR property is visible', () => {
    expect(isVisibleReviewRefreshEnabled('none', true, ['pr'])).toBe(true)
    expect(isVisibleReviewRefreshEnabled('none', true, ['status'])).toBe(true)
    expect(isVisibleReviewRefreshEnabled('none', true, ['ci'])).toBe(false)
    expect(isVisibleReviewRefreshEnabled('none', false, ['ci'])).toBe(true)
    expect(isVisibleReviewRefreshEnabled('pr-status', true, [])).toBe(true)
  })
})
