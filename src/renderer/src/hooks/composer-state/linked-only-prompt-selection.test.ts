import { describe, expect, it } from 'vitest'
import {
  resolveLinkedOnlyTemplateText,
  resolveTrustedStartupPrompt
} from './full-submit-source-preparation'

const results = {
  issue: {
    source: 'shared',
    localContent: null,
    sharedContent: 'Fix it',
    effectiveContent: 'Fix it',
    localFilePath: ''
  },
  review: {
    source: 'shared',
    localContent: null,
    sharedContent: 'Review it',
    effectiveContent: 'Review it',
    localFilePath: ''
  }
} as const

describe('resolveLinkedOnlyTemplateText', () => {
  it('picks the review template for a merge request', () => {
    expect(resolveLinkedOnlyTemplateText(results, 'review')).toBe('Review it')
  })

  it('picks the issue template for an issue', () => {
    expect(resolveLinkedOnlyTemplateText(results, 'issue')).toBe('Fix it')
  })

  // Guards the Smart-paste case: a PR resolved at submit time must never fall through
  // to the issue template that happens to be loaded.
  it('never returns the issue template for the review kind', () => {
    expect(resolveLinkedOnlyTemplateText({ issue: results.issue }, 'review')).toBe('')
  })

  it('returns empty when the read failed, so the caller uses the built-in default', () => {
    expect(
      resolveLinkedOnlyTemplateText(
        {
          review: {
            source: 'none',
            localContent: null,
            sharedContent: null,
            effectiveContent: null,
            localFilePath: ''
          }
        },
        'review'
      )
    ).toBe('')
  })
})

describe('resolveTrustedStartupPrompt', () => {
  const args = { templatePrompt: 'Review https://x/pull/1', plainPrompt: 'https://x/pull/1' }

  it('uses the template when it was trusted', () => {
    expect(
      resolveTrustedStartupPrompt({ ...args, applyTemplate: true, trustDecision: 'run' })
    ).toBe('Review https://x/pull/1')
  })

  // The trust hole: an unconfirmed shared orca.yaml template must not reach the agent. With no
  // execution host id the confirm block never runs, so the decision stays at its default-deny
  // 'skip' and the template is dropped. This is the case the old code got wrong.
  it('drops the template when trust was not granted', () => {
    expect(
      resolveTrustedStartupPrompt({ ...args, applyTemplate: true, trustDecision: 'skip' })
    ).toBe('https://x/pull/1')
  })

  it('leaves the ordinary prompt alone when no template applies', () => {
    expect(
      resolveTrustedStartupPrompt({ ...args, applyTemplate: false, trustDecision: 'run' })
    ).toBe('https://x/pull/1')
  })
})
