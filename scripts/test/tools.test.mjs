import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it, assert, assertEqual, assertIncludes, assertThrows } from './harness.mjs'
import {
  DisabledError,
  TaskStatusService,
  ValidationError,
  registerTools,
} from '../../lib/testables.mjs'

function mockToolsCtx() {
  /** @type {Map<string, any>} */
  const byName = new Map()
  const ctx = {
    tools: {
      register(def) {
        byName.set(def.name, def)
        return () => byName.delete(def.name)
      },
    },
  }
  return { ctx, byName }
}

function execFor(cwd, sessionId = 'sess-test') {
  return {
    agent: {
      session: {
        id: sessionId,
        header: { cwd, id: sessionId },
      },
    },
  }
}

describe('tools', () => {
  it('registers full status_* surface including status_clear_inflight', () => {
    const { ctx, byName } = mockToolsCtx()
    const dispose = registerTools(ctx, new TaskStatusService({ storageRoot: '/tmp/unused' }))
    const names = [...byName.keys()].sort()
    for (const need of [
      'status_ping',
      'status_init',
      'status_get',
      'status_set_next',
      'status_set_inflight',
      'status_clear_inflight',
      'status_set_phase',
      'status_mark_done',
      'status_block',
      'status_unblock',
      'status_set_enabled',
    ]) {
      assert(byName.has(need), `missing tool ${need}`)
    }
    dispose()
    assertEqual(byName.size, 0)
    assertEqual(names.length, 11)
  })

  it('parameter schemas are object-shaped; set_inflight requires summary', () => {
    const { ctx, byName } = mockToolsCtx()
    registerTools(ctx, new TaskStatusService({ storageRoot: '/tmp/unused' }))

    const ping = byName.get('status_ping')
    assertEqual(ping.parameters.type, 'object')
    assertEqual(ping.parameters.additionalProperties, false)
    assertEqual(ping.parameters.properties, {})

    const inflight = byName.get('status_set_inflight')
    assertEqual(inflight.parameters.type, 'object')
    assertEqual(inflight.parameters.required, ['summary'])
    assertEqual(inflight.parameters.properties.summary.minLength, 1)

    const clear = byName.get('status_clear_inflight')
    assertEqual(clear.parameters.type, 'object')
    assert(!clear.parameters.required, 'clear should not require fields')

    const setNext = byName.get('status_set_next')
    assertEqual(setNext.parameters.type, 'object')
    assertEqual(setNext.parameters.required, ['next'])

    const mark = byName.get('status_mark_done')
    assertEqual(mark.parameters.properties.summary.minLength, 1)
    assertEqual(byName.get('status_block').parameters.properties.reason.minLength, 1)

    // property-level required:true must not appear (0.1.7 pin)
    for (const def of byName.values()) {
      const blob = JSON.stringify(def.parameters)
      assert(!blob.includes('"required":true'), `${def.name} has property-level required`)
    }
  })

  it('execute story: init → next → inflight → clear → mark_done warn → OFF refuse', async () => {
    const storageRoot = await mkdtemp(join(tmpdir(), 'lh-tools-'))
    const cwd = await mkdtemp(join(tmpdir(), 'lh-tools-cwd-'))
    const svc = new TaskStatusService({ storageRoot })
    const { ctx, byName } = mockToolsCtx()
    const dispose = registerTools(ctx, svc)
    const exec = execFor(cwd)

    try {
      const ping = await byName.get('status_ping').execute({}, exec)
      assertEqual(ping.ok, true)
      assertEqual(ping.package, 'dsh-local-long-horizon')

      const init = await byName.get('status_init').execute(
        { title: 'tools e2e', phase: 'test', verifyHint: 'npm test' },
        exec,
      )
      assertEqual(init.title, 'tools e2e')
      assertEqual(init.enabled, true)

      await byName.get('status_set_next').execute({ next: ['a', 'b'] }, exec)

      await assertThrows(
        () => byName.get('status_set_inflight').execute({ summary: '' }, exec),
        ValidationError,
        'status_clear_inflight',
      )
      await assertThrows(
        () => byName.get('status_set_inflight').execute({}, exec),
        ValidationError,
        'non-empty summary',
      )

      await byName.get('status_set_inflight').execute({ summary: 'doing a' }, exec)
      assertEqual((await svc.get(cwd)).inFlight?.summary, 'doing a')

      await byName.get('status_clear_inflight').execute({}, exec)
      assertEqual((await svc.get(cwd)).inFlight, null)

      await byName.get('status_set_inflight').execute({ summary: 'doing a' }, exec)
      const marked = await byName.get('status_mark_done').execute(
        { summary: 'doing a', rotateNext: true },
        exec,
      )
      assertIncludes(marked._warn, 'without verify')
      // _warn is tool-output only — must not pollute the vault record
      const afterMark = await svc.get(cwd)
      assertEqual(afterMark._warn, undefined)
      assertEqual(afterMark.done.length, 1)
      assert(!('verify' in afterMark.done[0]), 'absent verify omitted from JSON')

      await assertThrows(
        () => byName.get('status_mark_done').execute({ summary: '  ' }, exec),
        ValidationError,
        'summary',
      )
      await assertThrows(
        () => byName.get('status_block').execute({ reason: '' }, exec),
        ValidationError,
        'reason',
      )

      await byName.get('status_set_enabled').execute({ enabled: false }, exec)
      await assertThrows(
        () => byName.get('status_set_next').execute({ next: ['x'] }, exec),
        DisabledError,
      )

      const got = await byName.get('status_get').execute({}, exec)
      assertEqual(got.enabled, false)
      assertEqual(got.lastSessionId, 'sess-test')
    } finally {
      dispose()
      await rm(storageRoot, { recursive: true, force: true })
      await rm(cwd, { recursive: true, force: true })
    }
  })

  it('execute refuses next>3 and missing cwd outside session', async () => {
    const storageRoot = await mkdtemp(join(tmpdir(), 'lh-tools-'))
    const cwd = await mkdtemp(join(tmpdir(), 'lh-tools-cwd-'))
    const svc = new TaskStatusService({ storageRoot })
    const { ctx, byName } = mockToolsCtx()
    registerTools(ctx, svc)
    const exec = execFor(cwd)

    try {
      await byName.get('status_init').execute({}, exec)
      await assertThrows(
        () => byName.get('status_set_next').execute({ next: ['1', '2', '3', '4'] }, exec),
        ValidationError,
        'hard cap',
      )
      await assertThrows(
        () => byName.get('status_get').execute({}, {}),
        Error,
        'cwd required',
      )
    } finally {
      await rm(storageRoot, { recursive: true, force: true })
      await rm(cwd, { recursive: true, force: true })
    }
  })
})
