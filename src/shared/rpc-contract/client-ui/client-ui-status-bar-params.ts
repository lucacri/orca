import * as z from 'zod'
import { salvagingArray } from '../../validation/zod-salvage'

export const StatusBarItem = z.enum([
  'claude',
  'codex',
  'antigravity',
  'opencode-go',
  'kimi',
  'minimax',
  'grok',
  'cursor',
  'zcode',
  'muse',
  'ssh',
  'resource-usage',
  'ports',
  'git-blame',
  'ccflare'
])

// Older clients still list the removed Gemini CLI usage item; drop it instead of rejecting their list.
// Why salvage: drop ids this host doesn't know instead of rejecting the whole list (remote-wire-compatibility Rule 4).
export const StatusBarItems = salvagingArray(
  z.union([StatusBarItem, z.literal('gemini')])
).transform((items) =>
  items.filter((item): item is z.infer<typeof StatusBarItem> => item !== 'gemini')
)
