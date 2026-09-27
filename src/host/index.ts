/**
 * Host half of dsh-local-long-horizon (M1 skeleton).
 *
 * Boot-safe: route serves a stub JSON payload; optional status_ping probes
 * whether an out-of-tree plugin can register agent tools (NOTES S1).
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { ROUTE } from './route.ts'

export const name = 'dsh-local-long-horizon'
/** webServer for the stub route; tools for S1 status_ping probe. */
export const inject = ['webServer', 'tools']

export { ROUTE } from './route.ts'

export function apply(ctx: Context): void {
  const unregister = ctx.webServer.register({
    kind: 'exact',
    path: ROUTE,
    handler: (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'GET') {
        res.writeHead(405, { 'content-type': 'application/json', allow: 'GET' })
        res.end(JSON.stringify({ error: 'method not allowed; use GET' }))
        return
      }
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end(JSON.stringify({
        ok: true,
        package: 'dsh-local-long-horizon',
        milestone: 'M1',
        enabled: false,
        message: 'stub — vault lands in M2',
        sampledAt: Date.now(),
      }))
    },
  })
  ctx.effect(() => unregister, 'long-horizon: /api/dsh-local-long-horizon route')

  // S1 probe: same defineTool + ctx.tools.register path as in-tree tool packages.
  const disposePing = ctx.tools.register(defineTool({
    name: 'status_ping',
    description: 'M1 probe: returns ok from dsh-local-long-horizon host module.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          package: { type: 'string', required: true },
          at: { type: 'integer', required: true },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: JSON.stringify(value),
      }],
    },
    async execute() {
      return {
        ok: true as const,
        package: 'dsh-local-long-horizon' as const,
        at: Date.now(),
      }
    },
  }))
  ctx.effect(() => disposePing, 'long-horizon: status_ping tool')
}
