/**
 * M2–M4 service smoke (no harness). Run: node --experimental-strip-types scripts/m2-m4-smoke.mjs
 * Or after build via dynamic import of service from source through tsx/node strip.
 */
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { TaskStatusService, ValidationError, DisabledError, CorruptVaultError } from '../lib/service.mjs'

const storageRoot = await mkdtemp(join(tmpdir(), 'lh-vault-'))
const cwd = await mkdtemp(join(tmpdir(), 'lh-proj-'))
const svc = new TaskStatusService({ storageRoot })
const ev = join(process.cwd(), 'agent/evidence')
await import('node:fs/promises').then((fs) => fs.mkdir(ev, { recursive: true }))

const log = []
function ok(msg) {
  log.push(`OK ${msg}`)
  console.log(`OK ${msg}`)
}

try {
  const init = await svc.init({ cwd, title: 'smoke', verifyHint: 'tests pass', phase: 'M2' })
  ok(`init taskId=${init.taskId}`)

  const inject1 = await readFile(join(cwd, '.dsh/task-status-inject.md'), 'utf8')
  if (!inject1.includes('[TASK STATUS]')) throw new Error('inject missing')
  if (inject1.length > 280) throw new Error(`inject too long: ${inject1.length}`)
  ok(`inject len=${inject1.length}`)

  await svc.setNext(cwd, ['a', 'b', 'c'])
  ok('set_next 3')

  let rejected = false
  try {
    await svc.setNext(cwd, ['a', 'b', 'c', 'd'])
  } catch (e) {
    if (e instanceof ValidationError) rejected = true
  }
  if (!rejected) throw new Error('expected next>3 reject')
  ok('set_next 4 rejected')

  await svc.setInflight(cwd, 'doing a')
  await svc.setPhase(cwd, 'M4')
  const { record: afterDone, warn } = await svc.markDone(cwd, 'doing a', 'ls ok', true)
  ok(`mark_done warn=${warn ?? 'none'} done=${afterDone.done.length}`)

  await svc.block(cwd, 'need human')
  await svc.unblock(cwd)
  const got = await svc.get(cwd)
  ok(`get phase=${got.phase} next=${got.next.join(',')}`)

  const md = await readFile(join(cwd, 'STATUS.md'), 'utf8')
  if (!md.includes('Long horizon') || !md.includes('Next 3')) throw new Error('STATUS.md shape')
  ok('STATUS.md projection')

  await svc.setEnabled(cwd, false)
  const injOff = await readFile(join(cwd, '.dsh/task-status-inject.md'), 'utf8')
  if (!injOff.includes('DISABLED')) throw new Error('expected DISABLED inject')
  let refused = false
  try {
    await svc.setNext(cwd, ['x'])
  } catch (e) {
    if (e instanceof DisabledError) refused = true
  }
  if (!refused) throw new Error('expected OFF refuse')
  ok('OFF refuses mutations')

  await svc.setEnabled(cwd, true)
  await svc.setNext(cwd, ['resume'])
  ok('ON again')

  // corrupt vault
  const path = svc.pathFor(cwd)
  await writeFile(path, '{not-json', 'utf8')
  const snap = await svc.snapshot(cwd)
  if (snap.ok !== false) throw new Error('corrupt should fail snapshot')
  ok(`corrupt snapshot error=${snap.error}`)

  let threw = false
  try {
    await svc.get(cwd)
  } catch (e) {
    if (e instanceof CorruptVaultError) threw = true
  }
  if (!threw) throw new Error('get should throw CorruptVaultError')
  ok('corrupt get throws')

  await writeFile(join(ev, 'm2-m4-smoke.txt'), log.join('\n') + '\n', 'utf8')
  console.log('PASS', { cwd, storageRoot })
} finally {
  await rm(storageRoot, { recursive: true, force: true })
  // keep cwd for inspection? remove
  await rm(cwd, { recursive: true, force: true })
}
