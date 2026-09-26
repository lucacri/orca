import { net } from 'electron'
import type {
  CcflareAccount,
  CcflarePool,
  CcflareSnapshot,
  CcflareTotals,
  CcflareUsageWindow
} from '../../shared/ccflare-types'

export const CCFLARE_DEFAULT_URL = 'http://localhost:8085'

type Json = Record<string, unknown>

// Why: better-ccflare's API is unversioned, so every field is read defensively.
function isJson(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asObject(value: unknown): Json | null {
  return isJson(value) ? value : null
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

function parseWindow(value: unknown): CcflareUsageWindow | null {
  const window = asObject(value)
  const percent = num(window?.utilization)
  return percent === null ? null : { percent, resetsAt: str(window?.resets_at) }
}

export function parseCcflareAccounts(value: unknown): CcflareAccount[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((entry): CcflareAccount[] => {
    const account = asObject(entry)
    const name = str(account?.name)
    if (!account || !name) {
      return []
    }
    const usage = asObject(account.usageData)
    return [
      {
        name,
        paused: account.paused === true,
        rateLimitedUntil: str(account.rateLimitedUntil),
        lastUsed: str(account.lastUsed),
        fiveHour: parseWindow(usage?.five_hour),
        weekly: parseWindow(usage?.seven_day)
      }
    ]
  })
}

export function parseCcflarePool(health: unknown): CcflarePool | null {
  const pool = asObject(asObject(health)?.pool)
  const configured = num(pool?.configured)
  const routable = num(pool?.routable)
  if (configured === null || routable === null) {
    return null
  }
  return {
    configured,
    routable,
    rateLimited: num(pool?.rate_limited) ?? 0,
    nextAvailableAt: str(pool?.next_available_at)
  }
}

export function parseCcflareTotals(stats: unknown): CcflareTotals | null {
  const s = asObject(stats)
  const requests = num(s?.totalRequests)
  const costUsd = num(s?.totalCostUsd)
  const successRate = num(s?.successRate)
  if (requests === null || costUsd === null || successRate === null) {
    return null
  }
  return { requests, costUsd, successRate }
}

function describeFailure(error: unknown): string {
  if (error instanceof Error && error.name === 'TimeoutError') {
    return 'timed out'
  }
  return error instanceof Error ? error.message : 'unknown error'
}

async function getJson(url: string, requireOk = true): Promise<unknown> {
  const apiKey = process.env.ORCA_CCFLARE_API_KEY
  const res = await net.fetch(url, {
    headers: apiKey ? { 'x-api-key': apiKey } : undefined,
    signal: AbortSignal.timeout(3000)
  })
  if (requireOk && !res.ok) {
    throw new Error(
      res.status === 401 || res.status === 403
        ? `API key required (HTTP ${res.status}); set ORCA_CCFLARE_API_KEY`
        : `HTTP ${res.status}`
    )
  }
  return res.json()
}

export async function fetchCcflareSnapshot(
  baseUrl = process.env.ORCA_CCFLARE_URL || CCFLARE_DEFAULT_URL
): Promise<CcflareSnapshot> {
  const url = baseUrl.replace(/\/+$/, '')
  try {
    const [health, accounts, stats] = await Promise.all([
      // Why: /health answers 503 with the pool JSON when degraded; pool data is optional, accounts are not.
      getJson(`${url}/health`, false).catch(() => null),
      getJson(`${url}/api/accounts`),
      getJson(`${url}/api/stats`).catch(() => null)
    ])
    return {
      status: 'ok',
      url,
      pool: parseCcflarePool(health),
      accounts: parseCcflareAccounts(accounts),
      totals: parseCcflareTotals(stats)
    }
  } catch (error) {
    return { status: 'unreachable', url, reason: describeFailure(error) }
  }
}
