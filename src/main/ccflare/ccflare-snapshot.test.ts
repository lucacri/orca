import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ net: { fetch: vi.fn() } }))

import { parseCcflareAccounts, parseCcflarePool, parseCcflareTotals } from './ccflare-snapshot'

describe('ccflare snapshot parsing', () => {
  it('reads weekly and per-model limits and skips malformed accounts', () => {
    const accounts = parseCcflareAccounts([
      {
        name: 'mine',
        paused: false,
        rateLimitedUntil: null,
        lastUsed: '2026-09-26T03:23:23.557Z',
        usageData: {
          five_hour: null,
          seven_day: { utilization: 3, resets_at: null },
          limits: [
            { kind: 'weekly_all', percent: 48, resets_at: '2026-11-20T12:00:00Z', scope: null },
            {
              kind: 'weekly_scoped',
              percent: 5,
              resets_at: null,
              scope: { model: { display_name: 'Fable' } }
            },
            { kind: 'weekly_scoped', percent: 1, scope: null },
            { kind: 'session', percent: 9 }
          ]
        }
      },
      {
        name: 'old',
        usageData: { five_hour: { utilization: 2 }, seven_day: { utilization: 7 } }
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
        weekly: { percent: 48, resetsAt: '2026-11-20T12:00:00Z' },
        modelLimits: [{ model: 'Fable', percent: 5, resetsAt: null }]
      },
      {
        name: 'old',
        paused: false,
        rateLimitedUntil: null,
        lastUsed: null,
        weekly: { percent: 7, resetsAt: null },
        modelLimits: []
      },
      {
        name: 'nano',
        paused: false,
        rateLimitedUntil: null,
        lastUsed: null,
        weekly: null,
        modelLimits: []
      }
    ])
    expect(parseCcflareAccounts({ error: 'x' })).toEqual([])
  })

  it('reads pool and totals, null when shape is unknown', () => {
    expect(
      parseCcflarePool({
        pool: { configured: 3, routable: 2, rate_limited: 1, usage_exhausted: 1 }
      })
    ).toEqual({
      configured: 3,
      routable: 2,
      rateLimited: 1,
      usageExhausted: 1,
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
