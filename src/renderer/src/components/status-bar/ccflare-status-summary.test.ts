import { describe, expect, it } from 'vitest'
import type { CcflareAccount } from '../../../../shared/ccflare-types'
import {
  ccflareUsageLevel,
  pickActiveCcflareAccount,
  summarizeCcflare
} from './ccflare-status-summary'

const account = (
  name: string,
  lastUsed: string | null,
  five: number,
  rateLimitedUntil: string | null = null
): CcflareAccount => ({
  name,
  paused: false,
  rateLimitedUntil,
  lastUsed,
  fiveHour: { percent: five, resetsAt: null },
  weekly: { percent: 10, resetsAt: null }
})

const pool = { configured: 2, routable: 2, rateLimited: 0, nextAvailableAt: null }

describe('summarizeCcflare', () => {
  it('shows the most recently used account and hides a healthy pool count', () => {
    const summary = summarizeCcflare(
      {
        status: 'ok',
        url: 'u',
        pool,
        accounts: [
          account('a', '2026-09-25T00:00:00Z', 40),
          account('b', '2026-09-26T00:00:00Z', 4)
        ],
        totals: null
      },
      'used'
    )
    expect(summary.label).toBe('b · 5h 4% · wk 10%')
    expect(summary.activeAccount?.name).toBe('b')
    expect(summary.warning).toBe(false)
  })

  it('honors the remaining display and drops the weekly part when compact', () => {
    const snapshot = {
      status: 'ok' as const,
      url: 'u',
      pool,
      accounts: [account('a', null, 4)],
      totals: null
    }
    expect(summarizeCcflare(snapshot, 'remaining').label).toBe('a · 5h 96% · wk 90%')
    expect(summarizeCcflare(snapshot, 'used', true).label).toBe('a · 5h 4%')
  })

  it('compares lastUsed as time, not text', () => {
    // Same instant family, different formats: string compare would pick 'a'.
    const picked = pickActiveCcflareAccount([
      account('a', '2026-09-26T00:00:00Z', 1),
      account('b', '2026-09-26T00:00:00.500Z', 1)
    ])
    expect(picked?.name).toBe('b')
  })

  it('ignores rate limits that already expired', () => {
    const summary = summarizeCcflare(
      {
        status: 'ok',
        url: 'u',
        pool,
        accounts: [account('a', null, 1, '2000-01-01T00:00:00Z')],
        totals: null
      },
      'used'
    )
    expect(summary.warning).toBe(false)
  })

  it('warns when degraded, empty, or down', () => {
    expect(
      summarizeCcflare(
        {
          status: 'ok',
          url: 'u',
          pool: { configured: 3, routable: 1, rateLimited: 2, nextAvailableAt: null },
          accounts: [account('a', null, 1)],
          totals: null
        },
        'used'
      )
    ).toMatchObject({ label: '1/3 · a · 5h 1% · wk 10%', warning: true })
    expect(
      summarizeCcflare({ status: 'ok', url: 'u', pool, accounts: [], totals: null }, 'used')
    ).toMatchObject({ label: 'no accounts', warning: true })
    expect(
      summarizeCcflare({ status: 'unreachable', url: 'u', reason: 'timed out' }, 'used')
    ).toMatchObject({ label: 'offline', warning: true })
  })

  it('colors usage with the same 60/80 thresholds as the other usage bars', () => {
    expect([59, 60, 79, 80].map(ccflareUsageLevel)).toEqual([
      'normal',
      'warning',
      'warning',
      'critical'
    ])
  })
})
