import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ net: { fetch: vi.fn() } }))

import { parseCcflareAccounts, parseCcflarePool, parseCcflareTotals } from './ccflare-snapshot'

describe('ccflare snapshot parsing', () => {
  it('reads 5h and weekly windows and skips malformed accounts', () => {
    const accounts = parseCcflareAccounts([
      {
        name: 'mine',
        paused: false,
        rateLimitedUntil: null,
        lastUsed: '2026-09-26T03:23:23.557Z',
        usageData: {
          five_hour: { utilization: 2, resets_at: '2026-09-26T07:59:59Z' },
          seven_day: { utilization: 3, resets_at: null }
        }
      },
      { name: 'nano', usageData: { limits: { daily: 1 } } },
      { noName: true },
      'junk'
    ])
    expect(accounts).toEqual([
      {
        name: 'mine',
        paused: false,
        rateLimitedUntil: null,
        lastUsed: '2026-09-26T03:23:23.557Z',
        fiveHour: { percent: 2, resetsAt: '2026-09-26T07:59:59Z' },
        weekly: { percent: 3, resetsAt: null }
      },
      {
        name: 'nano',
        paused: false,
        rateLimitedUntil: null,
        lastUsed: null,
        fiveHour: null,
        weekly: null
      }
    ])
    expect(parseCcflareAccounts({ error: 'x' })).toEqual([])
  })

  it('reads pool and totals, null when shape is unknown', () => {
    expect(
      parseCcflarePool({
        pool: { configured: 3, routable: 2, rate_limited: 1 }
      })
    ).toEqual({
      configured: 3,
      routable: 2,
      rateLimited: 1,
      nextAvailableAt: null
    })
    expect(parseCcflarePool({ status: 'ok' })).toBeNull()
    expect(
      parseCcflareTotals({
        totalRequests: 10,
        totalCostUsd: 1.5,
        successRate: 99
      })
    ).toEqual({
      requests: 10,
      costUsd: 1.5,
      successRate: 99
    })
    expect(parseCcflareTotals(null)).toBeNull()
    // A renamed field hides the totals instead of showing a fake $0.00.
    expect(parseCcflareTotals({ totalRequests: 10, successRate: 99 })).toBeNull()
  })
})
