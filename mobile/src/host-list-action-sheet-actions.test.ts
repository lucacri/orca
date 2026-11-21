import { describe, expect, it, vi } from 'vitest'
import { hostCopyConnectionIdActions } from './host-list-action-sheet-actions'

describe('hostCopyConnectionIdActions', () => {
  it('offers nothing without a host id', () => {
    expect(hostCopyConnectionIdActions('', vi.fn(), vi.fn())).toEqual([])
  })

  it('copies the host id and says Copied once the write lands', async () => {
    const writeText = vi.fn(async () => {})
    const showToast = vi.fn()
    const [action] = hostCopyConnectionIdActions('host-1700000000000', writeText, showToast)
    action.onPress()
    await vi.waitFor(() => expect(showToast).toHaveBeenCalledWith('Copied'))
    expect(writeText).toHaveBeenCalledExactlyOnceWith('host-1700000000000')
  })

  it('does not claim Copied when the clipboard refuses', async () => {
    const showToast = vi.fn()
    const [action] = hostCopyConnectionIdActions(
      'host-1',
      () => Promise.reject(new Error('not granted')),
      showToast
    )
    action.onPress()
    await vi.waitFor(() => expect(showToast).toHaveBeenCalledOnce())
    expect(showToast).not.toHaveBeenCalledWith('Copied')
  })
})
