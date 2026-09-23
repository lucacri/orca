import { describe, expect, it } from 'vitest'
import { getGeneralPaneSearchEntries } from './general-search'
import { matchesSettingsSearch } from '../search/settings-search'

describe('GeneralPane search entries', () => {
  it('includes the light Markdown background setting', () => {
    const entries = getGeneralPaneSearchEntries()

    expect(matchesSettingsSearch('light markdown background', entries)).toBe(true)
  })
})
