import { describe, expect, it } from 'vitest'
import { getRepoCommandKindForLinkedItemType } from '../../../../shared/repo-command-kind'
import {
  buildTrustedComposerIssueCommand,
  resolveLinkedOnlyTemplatePrompt
} from '@/lib/composer-issue-command'

describe('quick create with a linked review', () => {
  const linked = {
    provider: 'gitlab' as const,
    type: 'mr' as const,
    number: 3,
    title: 't',
    url: 'https://gitlab.example.com/g/p/-/merge_requests/3'
  }

  it('gives a linked MR the review prompt and no shell issue command', () => {
    const kind = getRepoCommandKindForLinkedItemType(linked.type)
    expect(kind).toBe('review')
    expect(
      resolveLinkedOnlyTemplatePrompt({
        trustDecision: 'run',
        note: '',
        kind,
        number: linked.number,
        artifactUrl: linked.url,
        template: ''
      })
    ).toBe('Review https://gitlab.example.com/g/p/-/merge_requests/3')

    // The shell runner stays issue-only: submitLinkedIssueNumber is null for an MR pick.
    expect(
      buildTrustedComposerIssueCommand({
        enabled: true,
        provider: 'gitlab',
        issueNumber: null,
        template: 'Complete {{artifact_url}}',
        artifactUrl: linked.url,
        trustDecision: 'run'
      })
    ).toBeUndefined()
  })

  it('gives a Linear item nothing — the provider gate still holds', () => {
    expect(
      buildTrustedComposerIssueCommand({
        enabled: true,
        provider: 'linear',
        issueNumber: 3,
        template: 'Complete {{artifact_url}}',
        artifactUrl: 'https://linear.app/x/issue/STA-3',
        trustDecision: 'run'
      })
    ).toBeUndefined()
  })
})
