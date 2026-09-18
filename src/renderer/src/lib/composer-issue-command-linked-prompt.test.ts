import { describe, expect, it } from 'vitest'
import { resolveLinkedOnlyTemplatePrompt } from './composer-issue-command'

const base = {
  trustDecision: 'run' as const,
  note: '',
  issueNumber: 7,
  artifactUrl: 'https://gitlab.example.com/g/p/-/issues/7',
  template: ''
}

describe('resolveLinkedOnlyTemplatePrompt', () => {
  it('falls back to the default template when the repo sets none', () => {
    expect(resolveLinkedOnlyTemplatePrompt(base)).toBe(
      'Complete https://gitlab.example.com/g/p/-/issues/7'
    )
  })

  it('renders both tokens from a repo template', () => {
    expect(
      resolveLinkedOnlyTemplatePrompt({
        ...base,
        template: '  Fix #{{issue}} at {{artifact_url}}  '
      })
    ).toBe('Fix #7 at https://gitlab.example.com/g/p/-/issues/7')
  })

  it('leaves merge requests on the plain linked-URL draft', () => {
    expect(
      resolveLinkedOnlyTemplatePrompt({
        ...base,
        issueNumber: null,
        artifactUrl: 'https://gitlab.example.com/g/p/-/merge_requests/3'
      })
    ).toBe('')
  })

  it('defers to a typed note', () => {
    expect(resolveLinkedOnlyTemplatePrompt({ ...base, note: '  do the thing ' })).toBe('')
  })

  it('stays empty when the repo template is untrusted', () => {
    expect(resolveLinkedOnlyTemplatePrompt({ ...base, trustDecision: 'skip' })).toBe('')
  })

  it('stays empty without a linked item', () => {
    expect(resolveLinkedOnlyTemplatePrompt({ ...base, artifactUrl: null })).toBe('')
  })
})
