import { GENERAL_SETTING_ANCHORS } from '../general/general-setting-anchors'
import type React from 'react'
import type { GlobalSettings } from '../../../../../shared/global-settings-types'
import { useTranslate } from '@/i18n/use-translate'
import { SearchableSetting } from '../section-layout/SearchableSetting'
import { SettingsSwitchRow } from '../form-controls/SettingsFormControls'

type MarkdownLightBackgroundSettingProps = {
  settings: Pick<GlobalSettings, 'markdownPreviewLightBackground'>
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

export function MarkdownLightBackgroundSetting({
  settings,
  updateSettings
}: MarkdownLightBackgroundSettingProps): React.JSX.Element {
  const t = useTranslate()
  const enabled = settings.markdownPreviewLightBackground === true
  const title = t(
    'auto.components.settings.GeneralEditorSettingsSection.94c2f548f7',
    'Light Markdown Background'
  )
  const description = t(
    'auto.components.settings.GeneralEditorSettingsSection.9088b9db22',
    'Show Markdown preview and the rich Markdown editor on a light background when the app theme is dark.'
  )

  return (
    <SearchableSetting
      id={GENERAL_SETTING_ANCHORS.markdownLightBackground}
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
