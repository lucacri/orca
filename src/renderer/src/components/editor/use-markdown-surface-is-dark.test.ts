import { describe, expect, it } from 'vitest'
import { resolveMarkdownSurfaceIsDark } from './use-markdown-surface-is-dark'

describe('resolveMarkdownSurfaceIsDark', () => {
  it('follows the app theme when not forced light', () => {
    expect(resolveMarkdownSurfaceIsDark('dark', false, false)).toBe(true)
    expect(resolveMarkdownSurfaceIsDark('light', true, false)).toBe(false)
    expect(resolveMarkdownSurfaceIsDark('system', true, false)).toBe(true)
    expect(resolveMarkdownSurfaceIsDark('system', false, false)).toBe(false)
    expect(resolveMarkdownSurfaceIsDark(undefined, true, false)).toBe(false)
  })

  it('is light whenever forced light', () => {
    expect(resolveMarkdownSurfaceIsDark('dark', true, true)).toBe(false)
    expect(resolveMarkdownSurfaceIsDark('system', true, true)).toBe(false)
  })
})
