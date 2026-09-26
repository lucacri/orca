import { describe, expect, it } from 'vitest'
import { UiUpdateFields } from './client-ui-params'

describe('statusBarItems wire tolerance', () => {
  it('drops ids this host does not know instead of rejecting the list', () => {
    const parsed = UiUpdateFields.parse({ statusBarItems: ['ports', 'ccflare', 'from-the-future'] })
    expect(parsed.statusBarItems).toEqual(['ports', 'ccflare'])
  })
})
