import { execFile } from 'node:child_process'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { describe, it, assert, assertEqual, assertIncludes, assertThrows } from './harness.mjs'
import {
  CorruptVaultError,
  DisabledError,
  NotInitializedError,
  TaskStatusService,
  ValidationError,
  INJECT_PATH_REL,
  STATUS_MD_REL,
  loadVault,
  saveVault,
} from '../../lib/testables.mjs'

const execFileAsync = promisify(execFile)

async function tempPair() {
  const storageRoot = await mkdtemp(join(tmpdir(), 'lh-vault-'))
  const cwd = await mkdtemp(join(tmpdir(), 'lh-proj-'))
  const svc = new TaskStatusService({ storageRoot })
  return {
    storageRoot,
    cwd,
    svc,
    async cleanup() {
      await rm(storageRoot, { recursive: true, force: true })
      await rm(cwd, { recursive: true, force: true })
    },
  }
}

async function git(cwd, ...args) {
  await execFileAsync('git', args, { cwd })
}

describe('service', () => {
  it('init → inject + STATUS.md + get', async () => {
    const { cwd, svc, cleanup } = await tempPair()
    try {
      const init = await svc.init({
        cwd,
        title: 'smoke',
        verifyHint: 'tests pass',
        phase: 'M2',
      })
      assert(init.taskId, 'taskId')
      assertEqual(init.enabled, true)

      const inject = await readFile(join(cwd, INJECT_PATH_REL), 'utf8')
      assertIncludes(inject, '[TASK STATUS]')
      assert(inject.length <= 280, `inject len ${inject.length}`)

      const md = await readFile(join(cwd, STATUS_MD_REL), 'utf8')
      assertIncludes(md, 'Long horizon')
      assertIncludes(md, 'Next 3')

      const got = await svc.get(cwd)
      assertEqual(got.phase, 'M2')
      assertEqual(got.title, 'smoke')
    } finally {
      await cleanup()
    }
  })

  it('re-init refreshes title/phase and re-enables', async () => {
    const { cwd, svc, cleanup } = await tempPair()
    try {
      await svc.init({ cwd, title: 'a', phase: 'p1' })
      await svc.setEnabled(cwd, false)
      const again = await svc.init({ cwd, title: 'b', phase: 'p2' })
      assertEqual(again.title, 'b')
      assertEqual(again.phase, 'p2')
      assertEqual(again.enabled, true)
    } finally {
      await cleanup()
    }
  })

  it('set_next enforces hard cap 3', async () => {
    const { cwd, svc, cleanup } = await tempPair()
    try {
      await svc.init({ cwd })
      await svc.setNext(cwd, ['a', 'b', 'c'])
      await assertThrows(
        () => svc.setNext(cwd, ['a', 'b', 'c', 'd']),
        ValidationError,
        'hard cap',
      )
      const got = await svc.get(cwd)
      assertEqual(got.next, ['a', 'b', 'c'])
    } finally {
      await cleanup()
    }
  })

  it('set_inflight set + clear via null', async () => {
    const { cwd, svc, cleanup } = await tempPair()
    try {
      await svc.init({ cwd })
      await svc.setInflight(cwd, 'doing a')
      assertEqual((await svc.get(cwd)).inFlight?.summary, 'doing a')
      await svc.setInflight(cwd, null)
      assertEqual((await svc.get(cwd)).inFlight, null)
      await svc.setInflight(cwd, '  ')
      assertEqual((await svc.get(cwd)).inFlight, null)
    } finally {
      await cleanup()
    }
  })

  it('mark_done warns without verify; rotateNext + clears matching inflight', async () => {
    const { cwd, svc, cleanup } = await tempPair()
    try {
      await svc.init({ cwd })
      await svc.setNext(cwd, ['greet', 'ship'])
      await svc.setInflight(cwd, 'greet')
      const { record, warn } = await svc.markDone(cwd, 'greet', undefined, true)
      assertIncludes(warn, 'without verify')
      assertEqual(record.inFlight, null)
      assertEqual(record.next, ['ship'])
      assertEqual(record.done.at(-1)?.summary, 'greet')
    } finally {
      await cleanup()
    }
  })

  it('block / unblock roundtrip', async () => {
    const { cwd, svc, cleanup } = await tempPair()
    try {
      await svc.init({ cwd })
      await svc.block(cwd, 'need human')
      assertEqual((await svc.get(cwd)).blocked?.reason, 'need human')
      await svc.unblock(cwd)
      assertEqual((await svc.get(cwd)).blocked, null)
    } finally {
      await cleanup()
    }
  })

  it('OFF freezes inject to DISABLED and refuses mutations; get still works', async () => {
    const { cwd, svc, cleanup } = await tempPair()
    try {
      await svc.init({ cwd })
      await svc.setNext(cwd, ['resume'])
      await svc.setEnabled(cwd, false)

      const inj = await readFile(join(cwd, INJECT_PATH_REL), 'utf8')
      assertIncludes(inj, 'DISABLED')

      await assertThrows(() => svc.setNext(cwd, ['x']), DisabledError)
      await assertThrows(() => svc.setInflight(cwd, 'x'), DisabledError)
      await assertThrows(() => svc.setPhase(cwd, 'x'), DisabledError)
      await assertThrows(() => svc.markDone(cwd, 'x', 'v'), DisabledError)
      await assertThrows(() => svc.block(cwd, 'x'), DisabledError)
      await assertThrows(() => svc.unblock(cwd), DisabledError)
      await assertThrows(() => svc.setNotes(cwd, 'x'), DisabledError)

      const got = await svc.get(cwd)
      assertEqual(got.enabled, false)
      assertEqual(got.next, ['resume'])
    } finally {
      await cleanup()
    }
  })

  it('get before init throws NotInitializedError', async () => {
    const { cwd, svc, cleanup } = await tempPair()
    try {
      await assertThrows(() => svc.get(cwd), NotInitializedError, 'status_init')
    } finally {
      await cleanup()
    }
  })

  it('snapshot empty cwd / uninit / healthy / corrupt', async () => {
    const { cwd, svc, cleanup } = await tempPair()
    try {
      const empty = await svc.snapshot('')
      assertEqual(empty.ok, true)
      assertEqual(empty.initialized, false)

      const uninit = await svc.snapshot(cwd)
      assertEqual(uninit.ok, true)
      assertEqual(uninit.initialized, false)

      await svc.init({ cwd, title: 'snap' }, { sessionId: 'sess-a' })
      const healthy = await svc.snapshot(cwd, { sessionId: 'sess-a' })
      assertEqual(healthy.ok, true)
      assertEqual(healthy.initialized, true)
      assertEqual(healthy.record.title, 'snap')
      assertEqual(healthy.sync.currentSessionId, 'sess-a')

      await writeFile(svc.pathFor(cwd), '{not-json', 'utf8')
      const bad = await svc.snapshot(cwd)
      assertEqual(bad.ok, false)
      assertIncludes(bad.error, 'corrupt')
      await assertThrows(() => svc.get(cwd), CorruptVaultError)
    } finally {
      await cleanup()
    }
  })

  it('stamps session + git branch; sync warns on session/branch mismatch + stale age', async () => {
    const { cwd, svc, cleanup } = await tempPair()
    try {
      await git(cwd, 'init', '-b', 'main')

      await svc.init({ cwd, title: 'sync' }, { sessionId: 'writer-1' })
      let snap = await svc.snapshot(cwd, { sessionId: 'writer-1' })
      assertEqual(snap.record.lastSessionId, 'writer-1')
      assertEqual(snap.record.gitBranch, 'main')
      assertEqual(snap.sync.warnings.length, 0)

      snap = await svc.snapshot(cwd, { sessionId: 'writer-2' })
      assert(snap.sync.warnings.some((w) => w.includes('Different chat')), snap.sync.warnings)

      await git(cwd, 'checkout', '-b', 'other')
      snap = await svc.snapshot(cwd, { sessionId: 'writer-1' })
      assert(snap.sync.warnings.some((w) => w.includes('Git branch changed')), snap.sync.warnings)

      // force stale updatedAt
      const path = svc.pathFor(cwd)
      const record = await loadVault(path)
      record.updatedAt = Date.now() - 7 * 60 * 60 * 1000
      await saveVault(path, record)
      snap = await svc.snapshot(cwd, { sessionId: 'writer-1' })
      assert(snap.sync.warnings.some((w) => w.includes('stale')), snap.sync.warnings)
    } finally {
      await cleanup()
    }
  })

  it('mark_done / block reject empty strings', async () => {
    const { cwd, svc, cleanup } = await tempPair()
    try {
      await svc.init({ cwd })
      await assertThrows(() => svc.markDone(cwd, '  ', 'v'), ValidationError, 'summary')
      await assertThrows(() => svc.block(cwd, ''), ValidationError, 'reason')
      assertEqual((await svc.get(cwd)).done.length, 0)
      assertEqual((await svc.get(cwd)).blocked, null)
    } finally {
      await cleanup()
    }
  })

  it('notes are capped; done list trims to last 50', async () => {
    const { cwd, svc, cleanup } = await tempPair()
    try {
      await svc.init({ cwd })
      await svc.setNotes(cwd, 'n'.repeat(600))
      const got = await svc.get(cwd)
      assert(got.notes.length === 500, `notes len ${got.notes.length}`)
      assert(got.notes.endsWith('…'))

      for (let i = 0; i < 55; i += 1) {
        await svc.markDone(cwd, `item-${i}`, 'ok', false)
      }
      const after = await svc.get(cwd)
      assertEqual(after.done.length, 50)
      assertEqual(after.done[0].summary, 'item-5')
      assertEqual(after.done.at(-1).summary, 'item-54')
    } finally {
      await cleanup()
    }
  })
})
