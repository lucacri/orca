import type { StatusBarItem } from '../../../../shared/ui-chrome-types'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from './settings-search-keywords'

export function getCcflareStatusBarToggleSearchEntry(): {
  id: StatusBarItem
  title: string
  description: string
  keywords: string[]
  toggleDescription: string
} {
  return {
    id: 'ccflare',
    title: translate('components.status.ccflare.title', 'better-ccflare'),
    description: translate(
      'components.status.ccflare.settingsDescription',
      'Show usage from a local better-ccflare proxy in the status bar.'
    ),
    keywords: [
      ...translateSearchKeyword(
        'auto.components.settings.appearance.search.896eb53fd4',
        'status bar'
      ),
      ...translateSearchKeyword('components.status.ccflare.keywordProxy', 'proxy'),
      ...translateSearchKeyword('auto.components.settings.appearance.search.00a028f25f', 'usage'),
      ...translateSearchKeyword('auto.components.settings.appearance.search.c9fe3a7876', 'claude')
    ],
    toggleDescription: translate(
      'components.status.ccflare.toggleDescription',
      'Show the active account usage and pool health from better-ccflare (localhost:8085, or ORCA_CCFLARE_URL).'
    )
  }
}
