import { useEffect } from 'react'
import { create } from 'zustand'
import type { NormalizedLinkRoute } from '../../../shared/plugins/plugin-link-route-matching'

// Approved, conflict-filtered, ranked route table. Read synchronously at link-click time via
// getState(), so it must already be populated before the first click — see
// ensurePluginLinkRoutesLoaded's mount owner. An empty table means "no routes", which is exactly
// today's behavior, so every failure here degrades to the pre-feature path rather than blocking.

type PluginLinkRouteState = {
  routes: NormalizedLinkRoute[]
  loaded: boolean
  fetchRoutes: () => Promise<void>
}

function isNormalizedLinkRoute(value: unknown): value is NormalizedLinkRoute {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<NormalizedLinkRoute>
  const pattern = candidate.pattern
  if (typeof pattern !== 'object' || pattern === null) {
    return false
  }
  const kind = (pattern as { kind?: unknown }).kind
  const hasHost =
    kind === 'exact'
      ? typeof (pattern as { host?: unknown }).host === 'string'
      : (kind === 'label' || kind === 'midlabel') &&
        typeof (pattern as { tail?: unknown }).tail === 'string'
  return (
    hasHost &&
    (candidate.destination === 'orca-browser' || candidate.destination === 'system-browser') &&
    typeof candidate.pluginKey === 'string' &&
    typeof candidate.index === 'number'
  )
}

let requestGeneration = 0
let changeSubscriptionStarted = false

export const usePluginLinkRouteStore = create<PluginLinkRouteState>()((set) => ({
  routes: [],
  loaded: false,
  fetchRoutes: async () => {
    const generation = ++requestGeneration
    const api = window.api?.plugins
    if (!api?.listLinkRoutes) {
      if (generation === requestGeneration) {
        set({ routes: [], loaded: true })
      }
      return
    }
    try {
      const response = await api.listLinkRoutes()
      const routes = Array.isArray(response) ? response.filter(isNormalizedLinkRoute) : []
      // Why: a non-array response and a rejected member are different upstream bugs; keep them distinguishable in the log.
      if (!Array.isArray(response)) {
        console.warn(`[plugins] Ignoring non-array link-route list (${typeof response})`)
      } else if (routes.length !== response.length) {
        console.warn(
          `[plugins] Ignoring ${response.length - routes.length} of ${response.length} malformed link routes`
        )
      }
      if (generation === requestGeneration) {
        set({ routes, loaded: true })
      }
    } catch {
      if (generation === requestGeneration) {
        set({ routes: [], loaded: true })
      }
    }
  }
}))

export function ensurePluginLinkRoutesLoaded(): void {
  const state = usePluginLinkRouteStore.getState()
  if (!state.loaded) {
    void state.fetchRoutes()
  }
  if (!changeSubscriptionStarted && window.api?.plugins?.onChanged) {
    changeSubscriptionStarted = true
    // Unsubscribe deliberately discarded: this is a process-lifetime subscription, and the guard
    // above is what keeps StrictMode's double-mount from registering two IPC listeners.
    window.api.plugins.onChanged((event) => {
      if (event?.contentPacksChanged ?? true) {
        void usePluginLinkRouteStore.getState().fetchRoutes()
      }
    })
  }
}

/** Synchronous read for the click path. Returns an empty table until the first fetch resolves. */
export function getPluginLinkRoutes(): readonly NormalizedLinkRoute[] {
  return usePluginLinkRouteStore.getState().routes
}

export function usePluginLinkRoutes(): NormalizedLinkRoute[] {
  const routes = usePluginLinkRouteStore((state) => state.routes)
  useEffect(() => ensurePluginLinkRoutesLoaded(), [])
  return routes
}
