import { describe, expect, it } from 'vitest'
import { fingerprintPluginConsent } from '../../shared/plugins/plugin-consent-fingerprint'
import { pluginManifestSchema } from '../../shared/plugins/plugin-manifest'
import { formatRoutePattern } from '../../shared/plugins/plugin-link-route-matching'
import type { ValidDiscoveredPlugin } from './plugin-discovery'
import { PluginLinkRouteRegistry } from './plugin-link-route-registry'

// Routes are inline manifest data, so unlike vm recipes these fixtures need no temp tree.
function routePlugin(
  id: string,
  routes: { hostname: string; destination?: 'orca-browser' | 'system-browser' }[]
): ValidDiscoveredPlugin {
  const manifest = pluginManifestSchema.parse({
    manifestVersion: 1,
    id,
    publisher: 'orca-samples',
    name: `Plugin ${id}`,
    version: '1.0.0',
    engines: { orca: '>=1.0.0' },
    pluginApi: 1,
    contributes: {
      linkRoutes: routes.map((route) => ({
        hostname: route.hostname,
        destination: route.destination ?? 'orca-browser'
      }))
    },
    capabilities: []
  })
  return {
    pluginKey: `orca-samples.${id}`,
    rootDir: `/nonexistent/${id}`,
    manifest,
    consentFingerprint: fingerprintPluginConsent(manifest),
    consentContentHash: null,
    contentHash: null,
    isDev: true
  }
}

const approveAll = () => true
const approveNone = () => false

function hostnames(registry: PluginLinkRouteRegistry): string[] {
  return registry.list().map((route) => formatRoutePattern(route.pattern))
}

describe('PluginLinkRouteRegistry', () => {
  it('publishes approved routes', () => {
    const registry = new PluginLinkRouteRegistry()
    registry.reconcile([routePlugin('a', [{ hostname: '*-devserver.test' }])], approveAll)
    expect(hostnames(registry)).toEqual(['*-devserver.test'])
  })

  it('publishes nothing for an unapproved plugin but still reports what it declares', () => {
    const registry = new PluginLinkRouteRegistry()
    const plugin = routePlugin('a', [{ hostname: '*-devserver.test' }])
    registry.reconcile([plugin], approveNone)

    expect(registry.list()).toEqual([])
    expect(registry.declared(plugin.pluginKey).map((entry) => entry.hostname)).toEqual([
      '*-devserver.test'
    ])
  })

  it('drops only the contested route and keeps the rest of each plugin working', () => {
    const registry = new PluginLinkRouteRegistry()
    registry.reconcile(
      [
        routePlugin('a', [{ hostname: '*-sharedhost.test' }, { hostname: '*-alpha-only.test' }]),
        routePlugin('b', [{ hostname: '*-sharedhost.test' }, { hostname: '*-bravo-only.test' }])
      ],
      approveAll
    )

    expect(hostnames(registry).toSorted()).toEqual(['*-alpha-only.test', '*-bravo-only.test'])
    expect(registry.conflicts('orca-samples.a')).toHaveLength(1)
    expect(registry.conflicts('orca-samples.b')).toHaveLength(1)
  })

  it('ranks routes deterministically regardless of discovery order', () => {
    const registry = new PluginLinkRouteRegistry()
    const plugins = [
      routePlugin('a', [{ hostname: '*-devserver.test' }]),
      routePlugin('b', [{ hostname: 'exact-devserver.test' }])
    ]
    registry.reconcile(plugins, approveAll)
    const forward = hostnames(registry)
    registry.reconcile(plugins.toReversed(), approveAll)

    expect(hostnames(registry)).toEqual(forward)
    expect(forward[0]).toBe('exact-devserver.test')
  })

  it('rebuilds wholesale, so a removed plugin leaves nothing behind', () => {
    const registry = new PluginLinkRouteRegistry()
    registry.reconcile([routePlugin('a', [{ hostname: '*-devserver.test' }])], approveAll)
    registry.reconcile([], approveAll)

    expect(registry.list()).toEqual([])
    expect(registry.declared('orca-samples.a')).toEqual([])
  })

  it('is idempotent', () => {
    const registry = new PluginLinkRouteRegistry()
    const plugins = [routePlugin('a', [{ hostname: '*-devserver.test' }])]
    registry.reconcile(plugins, approveAll)
    const first = hostnames(registry)
    registry.reconcile(plugins, approveAll)

    expect(hostnames(registry)).toEqual(first)
  })
})
