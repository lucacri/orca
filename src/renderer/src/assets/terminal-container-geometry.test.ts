import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const terminalCss = fs.readFileSync(new URL('./terminal.css', import.meta.url), 'utf8')

describe('terminal container geometry', () => {
  it('keeps the hidden link tooltip out of the fitted terminal height', () => {
    expect(terminalCss).toMatch(
      /\.xterm-container\s*{[^}]*height:\s*calc\(100% - var\(--pane-padding-y, 4px\)\);/s
    )
    expect(terminalCss).toMatch(
      /\.pane\[data-has-title\] \.xterm-container\s*{[^}]*height:\s*calc\(100% - var\(--orca-pane-title-height\)\);/s
    )
    expect(terminalCss).toMatch(
      /\.pane-link-tooltip\s*{[^}]*height:\s*var\(--orca-terminal-link-tooltip-height\);/s
    )
  })

  it('caps and centers an unsplit tab, and only while the pane is the only child', () => {
    expect(terminalCss).toMatch(
      /\[data-retained-pane-host\]\[data-tab-area-unsplit\]\s+\[data-terminal-tab-id\]:not\(\[data-terminal-chat-view\]\)\s*>\s*\.pane:only-child\s*{[^}]*max-width:\s*var\(--pane-single-max-width, 1100px\);[^}]*margin-inline:\s*auto;[^}]*border-inline:\s*var\(--pane-single-edge-width, 1px\)/s
    )
  })

  it('lifts the cap once the tab area is split, so a side-by-side pane fills its half', () => {
    // The selector requires the attribute; a split host simply stops matching.
    expect(terminalCss).not.toMatch(/\[data-retained-pane-host\] \[data-terminal-tab-id\]/)
  })

  it('caps browser, editor and markdown content with the same shared width', () => {
    expect(terminalCss).toMatch(
      /\[data-tab-area-unsplit\][^{]*\.pane-single-cap[^{]*{[^}]*max-width:\s*var\(--pane-single-max-width, 1100px\);[^}]*margin-inline:\s*auto;/s
    )
  })

  it('bounds cursor-blink repaints to the terminal surface (#10481)', () => {
    expect(terminalCss).toMatch(/\.xterm-container\s*{[^}]*contain:\s*paint;/s)
  })
})
