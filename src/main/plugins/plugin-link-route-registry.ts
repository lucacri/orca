import {
  normalizeRoutePattern,
  rankLinkRoutes,
  type LinkRouteDestination,
  type NormalizedLinkRoute
} from '../../shared/plugins/plugin-link-route-matching'
import {
  isInvalidDiscoveredPlugin,
  type DiscoveredPlugin,
  type ValidDiscoveredPlugin
} from './plugin-discovery'
import { routePatternViolatesSuffixPolicy } from './plugin-link-route-suffix-policy'

export type PluginLinkRouteRegistration = {
  pluginKey: string
  pluginName: string
  hostname: string
  destination: LinkRouteDestination
  description?: string
  /** Set when another approved plugin claims the same hostname, so this route is not published. */
  conflict?: string
}

/**
 * Two distinct views, deliberately not one:
 *  - `declared` is what a plugin asks for, rendered at consent time before approval;
 *  - `list` is approved and conflict-filtered, and is the only set matching ever sees.
 *
 * Route conflicts are reported through `conflicts()`, never through an activation error. The
 * content-pack registry treats an activation error as fatal and drops the whole plugin, which would
 * let a newly installed plugin disable an approved plugin's unrelated routes.
 */
export class PluginLinkRouteRegistry {
  private active: NormalizedLinkRoute[] = []
  private activeRegistrations: PluginLinkRouteRegistration[] = []
  private readonly declaredByPlugin = new Map<string, PluginLinkRouteRegistration[]>()

  /** Approved, conflict-filtered and ranked. First match wins. */
  list(): readonly NormalizedLinkRoute[] {
    return this.active
  }

  listRegistrations(): readonly PluginLinkRouteRegistration[] {
    return this.activeRegistrations
  }

  /** Everything the plugin declares, approved or not. For the consent dialog. */
  declared(pluginKey: string): readonly PluginLinkRouteRegistration[] {
    return this.declaredByPlugin.get(pluginKey) ?? []
  }

  /** Non-fatal, per-route diagnostics. Never promoted to an activation error. */
  conflicts(pluginKey: string): readonly string[] {
    return (this.declaredByPlugin.get(pluginKey) ?? []).flatMap((route) =>
      route.conflict ? [route.conflict] : []
    )
  }

  reconcile(
    discovered: readonly DiscoveredPlugin[],
    isApproved: (plugin: ValidDiscoveredPlugin) => boolean
  ): void {
    this.declaredByPlugin.clear()

    const candidates = discovered.filter(
      (plugin): plugin is ValidDiscoveredPlugin =>
        !isInvalidDiscoveredPlugin(plugin) && plugin.manifest.contributes.linkRoutes.length > 0
    )

    const approvedRoutes: {
      route: NormalizedLinkRoute
      registration: PluginLinkRouteRegistration
    }[] = []
    for (const plugin of candidates) {
      const registrations: PluginLinkRouteRegistration[] = []
      const approved = isApproved(plugin)
      for (const [index, contribution] of plugin.manifest.contributes.linkRoutes.entries()) {
        const registration: PluginLinkRouteRegistration = {
          pluginKey: plugin.pluginKey,
          pluginName: plugin.manifest.name,
          hostname: contribution.hostname,
          destination: contribution.destination,
          description: contribution.description
        }
        registrations.push(registration)
        const pattern = normalizeRoutePattern(contribution.hostname)
        // Discovery rejects these before publication; belt and braces so a future caller that skips
        // validation cannot install an unchecked pattern.
        if (!approved || !pattern || routePatternViolatesSuffixPolicy(pattern)) {
          continue
        }
        approvedRoutes.push({
          route: {
            pattern,
            destination: contribution.destination,
            pluginKey: plugin.pluginKey,
            index
          },
          registration
        })
      }
      this.declaredByPlugin.set(plugin.pluginKey, registrations)
    }

    const owners = new Map<string, Set<string>>()
    for (const { registration } of approvedRoutes) {
      const hostOwners = owners.get(registration.hostname) ?? new Set<string>()
      hostOwners.add(registration.pluginKey)
      owners.set(registration.hostname, hostOwners)
    }
    const contestedHostnames = new Set<string>()
    for (const [hostname, hostOwners] of owners) {
      if (hostOwners.size > 1) {
        contestedHostnames.add(hostname)
      }
    }
    // Annotate in place so a conflict is always read from the route it belongs to, never by index.
    for (const registrations of this.declaredByPlugin.values()) {
      for (const registration of registrations) {
        if (contestedHostnames.has(registration.hostname)) {
          registration.conflict = `also contributed by another plugin, so this route is not active`
        }
      }
    }

    const surviving = approvedRoutes.filter(
      ({ registration }) => !contestedHostnames.has(registration.hostname)
    )
    this.active = rankLinkRoutes(surviving.map(({ route }) => route))
    this.activeRegistrations = surviving.map(({ registration }) => registration)
  }
}
