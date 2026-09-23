import { describe, expect, it } from 'vitest'
import { resolveMarkdownSurfaceIsDark } from './use-markdown-surface-is-dark'

describe('resolveMarkdownSurfaceIsDark', () => {
  it('follows the painted app theme when not forced light', () => {
    expect(resolveMarkdownSurfaceIsDark(true, false)).toBe(true)
    expect(resolveMarkdownSurfaceIsDark(false, false)).toBe(false)
  })

  it('is light whenever forced light', () => {
    expect(resolveMarkdownSurfaceIsDark(true, true)).toBe(false)
    expect(resolveMarkdownSurfaceIsDark(false, true)).toBe(false)
  })
})
