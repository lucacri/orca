import { useAppStore } from '@/store'
import { useSystemPrefersDark } from '../terminal-pane/use-system-prefers-dark'
import type { GlobalSettings } from '../../../../shared/global-settings-types'

export function resolveMarkdownSurfaceIsDark(
  theme: GlobalSettings['theme'] | undefined,
  systemPrefersDark: boolean,
  forceLight: boolean
): boolean {
  if (forceLight) {
    return false
  }
  return theme === 'dark' || (theme === 'system' && systemPrefersDark)
}

export function useMarkdownSurfaceForceLight(): boolean {
  return useAppStore((s) => s.settings?.markdownPreviewLightBackground === true)
}

/** Effective theme of the markdown preview / rich editor surface (drives markdown-dark and Mermaid). */
export function useMarkdownSurfaceIsDark(): boolean {
  const theme = useAppStore((s) => s.settings?.theme)
  const systemPrefersDark = useSystemPrefersDark()
  return resolveMarkdownSurfaceIsDark(theme, systemPrefersDark, useMarkdownSurfaceForceLight())
}
