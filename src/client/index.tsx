/**
 * Browser half of dsh-local-long-horizon: stub rightbar tab (M1).
 *
 * Two-stage registration per ui-sidebar-right (same as gpu-monitor / slot-health):
 *   1. tab type into ctx.sidebarRightTabs
 *   2. body + title into keyed sidebar.right.pane.tab seats
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { SidebarRightTabDefinition } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { StubBody } from './StubBody.tsx'
import { StubTitle } from './StubTitle.tsx'

const TAB_ID = 'dsh-local-long-horizon'

export const inject = ['slots', 'sidebarRight', 'sidebarRightTabs']

export function apply(ctx: Context): void {
  const definition: SidebarRightTabDefinition = {
    id: TAB_ID,
    kind: 'local-long-horizon',
    title: () => 'Long horizon',
    guide: [{
      id: 'local-long-horizon',
      order: 250,
      title: () => 'Long horizon',
      description: () => 'Task status for long-running local agent work (Next 3, inflight, blocked)',
    }],
  }
  // Register at apply top level — effect-scoped registry stalls browser boot.
  const disposeType = ctx.sidebarRightTabs.register(definition)
  const disposeBody = ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab', key: TAB_ID },
    StubBody,
  ))
  const disposeTitle = ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab.title', key: TAB_ID },
    StubTitle,
  ))
  ctx.effect(() => () => {
    disposeTitle()
    disposeBody()
    disposeType()
  }, 'long-horizon: rightbar tab type')
}
