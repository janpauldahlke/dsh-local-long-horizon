/**
 * Host half of dsh-local-long-horizon.
 *
 * Owns the vault service, agent tools, and GET/POST /api/dsh-local-long-horizon.
 * Boot-safe: corrupt vault → route/tool error, never a throw that kills the harness.
 *
 * Tools require only `tools`. The HTTP route is nested under `ctx.inject(['webServer'])`
 * so headless activates status_* without waiting forever on webServer.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { URL } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { ROUTE } from './route.ts'
import { TaskStatusService } from './service.ts'
import { registerTools } from './tools.ts'

export const name = 'dsh-local-long-horizon'
export const inject = ['tools']

export { ROUTE } from './route.ts'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function registerRoute(ctx: Context, service: TaskStatusService): void {
  const unregister = ctx.webServer.register({
    kind: 'exact',
    path: ROUTE,
    handler: (req: IncomingMessage, res: ServerResponse) => {
      void (async () => {
        try {
          const host = req.headers.host ?? '127.0.0.1'
          const url = new URL(req.url ?? ROUTE, `http://${host}`)

          if (req.method === 'GET') {
            const cwd = url.searchParams.get('cwd')
            const sessionId = url.searchParams.get('sessionId')
            const snap = await service.snapshot(cwd, { sessionId })
            res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
            res.end(JSON.stringify(snap))
            return
          }

          if (req.method === 'POST') {
            const raw = await readBody(req)
            let body: { cwd?: string; enabled?: boolean; action?: string; sessionId?: string }
            try {
              body = JSON.parse(raw || '{}') as typeof body
            } catch {
              res.writeHead(400, { 'content-type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'invalid JSON body' }))
              return
            }
            const cwd = body.cwd?.trim()
            const writer = body.sessionId?.trim() ? { sessionId: body.sessionId.trim() } : undefined
            if (!cwd) {
              res.writeHead(400, { 'content-type': 'application/json' })
              res.end(JSON.stringify({ ok: false, error: 'cwd required' }))
              return
            }
            if (body.action === 'init') {
              const record = await service.init({ cwd }, writer)
              res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
              res.end(JSON.stringify({ ok: true, record }))
              return
            }
            if (typeof body.enabled === 'boolean') {
              const snap = await service.snapshot(cwd, { sessionId: writer?.sessionId })
              if (!snap.ok) {
                res.writeHead(500, { 'content-type': 'application/json' })
                res.end(JSON.stringify(snap))
                return
              }
              if (!snap.initialized) {
                if (!body.enabled) {
                  res.writeHead(400, { 'content-type': 'application/json' })
                  res.end(JSON.stringify({ ok: false, error: 'not initialized' }))
                  return
                }
                await service.init({ cwd }, writer)
              }
              const record = await service.setEnabled(cwd, body.enabled, writer)
              res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
              res.end(JSON.stringify({ ok: true, record }))
              return
            }
            res.writeHead(400, { 'content-type': 'application/json' })
            res.end(JSON.stringify({ ok: false, error: 'expected { cwd, enabled } or { cwd, action: "init" }' }))
            return
          }

          res.writeHead(405, { 'content-type': 'application/json', allow: 'GET, POST' })
          res.end(JSON.stringify({ error: 'method not allowed; use GET or POST' }))
        } catch (err) {
          res.writeHead(500, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: String(err) }))
        }
      })()
    },
  })
  ctx.effect(() => unregister, 'long-horizon: route')
}

export function apply(ctx: Context): void {
  const service = new TaskStatusService()

  const disposeTools = registerTools(ctx, service)
  ctx.effect(() => disposeTools, 'long-horizon: tools')

  // Nested inject: activates when webServer exists (dsh web); no-op on headless.
  ctx.inject(['webServer'], (webCtx) => {
    registerRoute(webCtx, service)
  })
}
