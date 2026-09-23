import { useAppStore } from '@/store'
import { useDocumentDarkTheme } from '@/hooks/use-document-dark-theme'

export function resolveMarkdownSurfaceIsDark(documentDark: boolean, forceLight: boolean): boolean {
  return documentDark && !forceLight
}

export function useMarkdownSurfaceForceLight(): boolean {
  return useAppStore((s) => s.settings?.markdownPreviewLightBackground === true)
}

/** Effective theme of the markdown preview / rich editor surface (drives markdown-dark and Mermaid). */
export function useMarkdownSurfaceIsDark(): boolean {
  return resolveMarkdownSurfaceIsDark(useDocumentDarkTheme(), useMarkdownSurfaceForceLight())
}
