/** Builds the retained-pane-host DOM shape the capped-pane gutter check reads. */
export function mountTerminalHost(opts: {
  unsplit: boolean
  hostWidth: number
  paneWidth: number
  panes: number
}): void {
  document.body.innerHTML = ''
  const host = document.createElement('div')
  host.setAttribute('data-retained-pane-host', '')
  host.setAttribute('data-terminal-overlay-tab-id', 't1')
  if (opts.unsplit) {
    host.setAttribute('data-tab-area-unsplit', '')
  }
  Object.defineProperty(host, 'clientWidth', { value: opts.hostWidth })
  const tab = document.createElement('div')
  tab.setAttribute('data-terminal-tab-id', 't1')
  for (let i = 0; i < opts.panes; i++) {
    const pane = document.createElement('div')
    pane.className = 'pane'
    Object.defineProperty(pane, 'clientWidth', { value: opts.paneWidth })
    tab.appendChild(pane)
  }
  host.appendChild(tab)
  document.body.appendChild(host)
}
