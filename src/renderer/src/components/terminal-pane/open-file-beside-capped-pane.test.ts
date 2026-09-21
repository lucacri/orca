// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { cappedPaneHasGutter } from './open-file-beside-capped-pane'
import { mountTerminalHost } from './terminal-capped-host-test-dom'

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('cappedPaneHasGutter', () => {
  it('is true when one pane is much narrower than the tab area it sits in', () => {
    mountTerminalHost({ unsplit: true, hostWidth: 1600, paneWidth: 1100, panes: 1 })
    expect(cappedPaneHasGutter('t1')).toBe(true)
  })

  it('is false when the only difference is the pane border, not a real gutter', () => {
    // The capped rule paints a 1px border-inline, so clientWidth is host - 2 even
    // when max-width never binds. A strict < would split at every window size.
    mountTerminalHost({ unsplit: true, hostWidth: 1102, paneWidth: 1100, panes: 1 })
    expect(cappedPaneHasGutter('t1')).toBe(false)
  })

  it('is false in a window narrower than the cap, where no gutter exists', () => {
    mountTerminalHost({ unsplit: true, hostWidth: 900, paneWidth: 898, panes: 1 })
    expect(cappedPaneHasGutter('t1')).toBe(false)
  })

  it('is false just below the usable-split threshold', () => {
    mountTerminalHost({ unsplit: true, hostWidth: 1147, paneWidth: 1100, panes: 1 })
    expect(cappedPaneHasGutter('t1')).toBe(false)
  })

  it('is true exactly at the usable-split threshold', () => {
    mountTerminalHost({ unsplit: true, hostWidth: 1148, paneWidth: 1100, panes: 1 })
    expect(cappedPaneHasGutter('t1')).toBe(true)
  })

  it('is false when the terminal is split inside its own tab', () => {
    mountTerminalHost({ unsplit: true, hostWidth: 1600, paneWidth: 800, panes: 2 })
    expect(cappedPaneHasGutter('t1')).toBe(false)
  })

  it('is false once the tab area itself is split, so a second open does not stack', () => {
    mountTerminalHost({ unsplit: false, hostWidth: 1600, paneWidth: 1100, panes: 1 })
    expect(cappedPaneHasGutter('t1')).toBe(false)
  })

  it('is false for an unknown tab id', () => {
    mountTerminalHost({ unsplit: true, hostWidth: 1600, paneWidth: 1100, panes: 1 })
    expect(cappedPaneHasGutter('nope')).toBe(false)
  })

  it('is false for a host that is not a terminal, so a lone browser never splits', () => {
    document.body.innerHTML = ''
    const host = document.createElement('div')
    host.setAttribute('data-tab-area-unsplit', '')
    host.setAttribute('data-browser-overlay-tab-id', 't1')
    Object.defineProperty(host, 'clientWidth', { value: 1600 })
    document.body.appendChild(host)
    expect(cappedPaneHasGutter('t1')).toBe(false)
  })
})
