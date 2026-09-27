/**
 * Browser half: Long horizon rightbar tab (PLAN §8.2).
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { SidebarRightTabDefinition } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { LongHorizonBody } from './LongHorizonBody.tsx'
import { LongHorizonTitle } from './LongHorizonTitle.tsx'

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
  const disposeType = ctx.sidebarRightTabs.register(definition)
  const disposeBody = ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab', key: TAB_ID },
    LongHorizonBody,
  ))
  const disposeTitle = ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab.title', key: TAB_ID },
    LongHorizonTitle,
  ))
  ctx.effect(() => () => {
    disposeTitle()
    disposeBody()
    disposeType()
  }, 'long-horizon: rightbar tab type')
}
