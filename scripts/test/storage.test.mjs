import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it, assert, assertEqual, assertThrows } from './harness.mjs'
import {
  CorruptVaultError,
  loadVault,
  saveVault,
  vaultPath,
} from '../../lib/testables.mjs'

describe('storage', () => {
  it('atomic save + load roundtrip', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lh-store-'))
    const path = vaultPath(root, 'demo-abc')
    const record = {
      taskId: 'demo-abc',
      title: 'demo',
      cwd: '/tmp/demo',
      updatedAt: 1,
      phase: 'x',
      enabled: true,
      done: [],
      inFlight: null,
      next: ['a'],
      blocked: null,
      verifyHint: '',
      keyPaths: [],
      notes: '',
    }
    await saveVault(path, record)
    const raw = await readFile(path, 'utf8')
    assert(raw.endsWith('\n'), 'trailing newline')
    const loaded = await loadVault(path)
    assertEqual(loaded.taskId, 'demo-abc')
    assertEqual(loaded.next, ['a'])
  })

  it('missing vault returns null', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lh-store-'))
    const loaded = await loadVault(vaultPath(root, 'nope'))
    assertEqual(loaded, null)
  })

  it('corrupt JSON throws CorruptVaultError', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lh-store-'))
    const path = vaultPath(root, 'bad')
    await writeFile(path, '{not-json', 'utf8')
    await assertThrows(() => loadVault(path), CorruptVaultError, 'corrupt vault')
  })

  it('wrong-shape JSON throws CorruptVaultError', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lh-store-'))
    const path = vaultPath(root, 'shape')
    await writeFile(path, JSON.stringify({ hello: 'world' }), 'utf8')
    await assertThrows(() => loadVault(path), CorruptVaultError, 'corrupt vault JSON')
  })
})
