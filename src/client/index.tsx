/**
 * Browser half: Long horizon rightbar tab + composer dock chip (PLAN §8.2).
 *
 * Seats mirror gpu-monitor / slot-health:
 *   1. tab type (sidebarRightTabs)
 *   2. body + title (sidebar.right.pane.tab*)
 *   3. collapsed dock chip (conversation.composer.dock) — hides while body mounted
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { SidebarRightTabDefinition } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
// Type-only: activates conversation.composer.dock SlotMap merge.
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import { LongHorizonBody } from './LongHorizonBody.tsx'
import { LongHorizonDockChip } from './LongHorizonDockChip.tsx'
import { LongHorizonGuideIcon } from './LongHorizonIcon.tsx'
import { LongHorizonTitle } from './LongHorizonTitle.tsx'

const TAB_ID = 'dsh-local-long-horizon'
const TAB_KIND = 'local-long-horizon'

export const inject = ['slots', 'sidebarRight', 'sidebarRightTabs']

export function apply(ctx: Context): void {
  const definition: SidebarRightTabDefinition = {
    id: TAB_ID,
    kind: TAB_KIND,
    title: () => 'Long horizon',
    guide: [{
      id: 'local-long-horizon',
      order: 250,
      title: () => 'Long horizon',
      description: () => 'Task status for long-running local agent work (Next 3, inflight, blocked)',
      icon: LongHorizonGuideIcon,
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
  // Dock is session-scoped — framework passes sessionId / useSessions.
  const LongHorizonDockSeat = (props: Record<string, unknown>) => (
    <LongHorizonDockChip
      sessionId={typeof props.sessionId === 'string' ? props.sessionId : undefined}
      useSessions={typeof props.useSessions === 'function'
        ? props.useSessions as NonNullable<Parameters<typeof LongHorizonDockChip>[0]['useSessions']>
        : undefined}
      onOpen={() => ctx.sidebarRight.openTab(TAB_KIND)}
    />
  )
  const disposeDock = ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
    { name: 'conversation.composer.dock', id: 'local-long-horizon', order: -9 },
    LongHorizonDockSeat,
  ))
  ctx.effect(() => () => {
    disposeDock()
    disposeTitle()
    disposeBody()
    disposeType()
  }, 'long-horizon: rightbar tab type')
}
