import { ipcRenderer } from 'electron'
import type { CcflareSnapshot } from '../../shared/ccflare-types'
import type { PreloadApi } from '../api-types'

export const ccflareApi = {
  getSnapshot: (): Promise<CcflareSnapshot> => ipcRenderer.invoke('ccflare:getSnapshot')
} satisfies PreloadApi['ccflare']
