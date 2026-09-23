import type React from 'react'
import type { GlobalSettings } from '../../../../shared/global-settings-types'
import { translate } from '@/i18n/i18n'
import { SearchableSetting } from './SearchableSetting'
import { SettingsSwitchRow } from './SettingsFormControls'

type MarkdownLightBackgroundSettingProps = {
  settings: Pick<GlobalSettings, 'markdownPreviewLightBackground'>
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

export function MarkdownLightBackgroundSetting({
  settings,
  updateSettings
}: MarkdownLightBackgroundSettingProps): React.JSX.Element {
  const enabled = settings.markdownPreviewLightBackground === true
  const title = translate(
    'auto.components.settings.GeneralEditorSettingsSection.94c2f548f7',
    'Light Markdown Background'
  )
  const description = translate(
    'auto.components.settings.GeneralEditorSettingsSection.9088b9db22',
    'Show Markdown preview and the rich Markdown editor on a light background when the app theme is dark.'
  )

  return (
    <SearchableSetting
      title={title}
      description={description}
      keywords={['light', 'background', 'theme', 'preview', 'markdown']}
    >
      <SettingsSwitchRow
        label={title}
        description={description}
        checked={enabled}
        onChange={() => updateSettings({ markdownPreviewLightBackground: !enabled })}
      />
    </SearchableSetting>
  )
}
