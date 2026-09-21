import type React from 'react'

import type { GlobalSettings } from '../../../../shared/global-settings-types'
import { NumberField } from './SettingsFormControls'
import { SearchableSetting } from './SearchableSetting'
import { getSinglePaneWidthEntries } from './appearance-search'
import {
  DEFAULT_SINGLE_PANE_MAX_WIDTH,
  MIN_SINGLE_PANE_WIDTH
} from '../terminal-pane/TerminalSinglePaneWidthHandles'
import { translate } from '@/i18n/i18n'

/** One shared width for every pane type; the terminal's drag handles commit the same value. */
export function SinglePaneWidthSetting({
  settings,
  updateSettings
}: {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}): React.JSX.Element {
  const entry = getSinglePaneWidthEntries()[0]
  const label = translate(
    'auto.components.settings.SinglePaneWidthSetting.title',
    'Single Pane Width'
  )
  return (
    <SearchableSetting
      title={label}
      description={entry?.description}
      keywords={['width', 'center', 'centered', 'max', 'single', 'unsplit', 'wide', 'pane']}
    >
      <NumberField
        label={label}
        description=""
        value={settings.terminalSinglePaneMaxWidth ?? DEFAULT_SINGLE_PANE_MAX_WIDTH}
        defaultValue={DEFAULT_SINGLE_PANE_MAX_WIDTH}
        min={0}
        max={4000}
        step={10}
        suffix="px"
        onChange={(value) =>
          updateSettings({
            // Below the drag floor the first drag would silently snap the
            // value back up, so refuse the width the drag cannot hold.
            terminalSinglePaneMaxWidth: value <= 0 ? 0 : Math.max(MIN_SINGLE_PANE_WIDTH, value)
          })
        }
      />
    </SearchableSetting>
  )
}
