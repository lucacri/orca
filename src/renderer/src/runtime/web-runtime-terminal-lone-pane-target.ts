import { resolveLonePaneBesideGroupId } from '@/store/slices/tabs/lone-pane-split-source'
import { useAppStore } from '../store'
import type { CreateWebRuntimeSessionTerminalArgs } from './web-runtime-session-types'

/** The group a remote terminal lands in. Remote terminals never reach `createTab`, so the
 *  beside-a-lone-pane rule lives here too — same mechanism, and the create operation already
 *  honours a caller-supplied group, so nothing on the client/host wire changes. */
export function resolveWebRuntimeTerminalTargetGroupId(
  args: Pick<CreateWebRuntimeSessionTerminalArgs, 'worktreeId' | 'targetGroupId' | 'placementFixed'>
): string | undefined {
  if (args.placementFixed) {
    return args.targetGroupId
  }
  return (
    resolveLonePaneBesideGroupId(useAppStore.getState(), args.worktreeId, args.targetGroupId) ??
    args.targetGroupId
  )
}
