import { afterEach, describe, expect, it, vi } from 'vitest'

const rm = vi.fn(async () => {})
vi.mock('./asar-transparent-fs', () => ({ rm }))

const { removeHostTree } = await import('./host-tree-removal')

describe('removeHostTree on macOS', () => {
  const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!
  afterEach(() => Object.defineProperty(process, 'platform', originalPlatform))

  it('retries so a .DS_Store Finder writes mid-delete does not strand the tree', async () => {
    Object.defineProperty(process, 'platform', { configurable: true, value: 'darwin' })
    await removeHostTree('/tmp/wt')
    expect(rm).toHaveBeenCalledWith(
      '/tmp/wt',
      expect.objectContaining({ recursive: true, force: true, maxRetries: 5 })
    )
  })
})
