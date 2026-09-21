import { MIN_PANE_FIT_WIDTH_PX } from '@/lib/pane-manager/pane-fit-measurability'

/** The cap is biting iff the pane the CSS caps is narrower than its tab area by
 *  enough to hold a usable split. Anything less is the pane's own 1px border-inline,
 *  which is present at every window size and is not gutter. Measuring the rendered
 *  box rather than re-deriving the rule keeps this honest when the CSS changes: an
 *  internal split, a 0 setting, or a narrow window all close the gap on their own.
 *  Terminal hosts only — a lone browser or editor is capped but is not a click source. */
export function cappedPaneHasGutter(sourceTabId: string): boolean {
  for (const host of document.querySelectorAll<HTMLElement>('[data-tab-area-unsplit]')) {
    if (host.dataset.terminalOverlayTabId !== sourceTabId) {
      continue
    }
    const pane = host.querySelector<HTMLElement>('[data-terminal-tab-id] > .pane:only-child')
    return pane !== null && host.clientWidth - pane.clientWidth >= MIN_PANE_FIT_WIDTH_PX
  }
  return false
}

/** The group a file should open into so it lands beside a capped terminal, not over it. */
export function resolveOpenBesideGroupId(
  sourceTabId: string,
  deps: { resolveTargetGroupId: () => string | null }
): string | null {
  return cappedPaneHasGutter(sourceTabId) ? deps.resolveTargetGroupId() : null
}
