import { ipcMain } from 'electron'
import { fetchCcflareSnapshot } from '../ccflare/ccflare-snapshot'

export function registerCcflareHandlers(): void {
  ipcMain.handle('ccflare:getSnapshot', () => fetchCcflareSnapshot())
}
