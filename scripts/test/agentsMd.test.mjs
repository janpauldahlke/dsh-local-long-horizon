import { mkdtemp, readFile, writeFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it, assert, assertEqual, assertIncludes } from './harness.mjs'
import {
  ensureAgentsMd,
  hasLongHorizonSection,
  LONG_HORIZON_HEADING,
  LONG_HORIZON_SECTION,
  mergeAgentsMd,
  TaskStatusService,
} from '../../lib/testables.mjs'

describe('agentsMd', () => {
  it('merge: missing → create with Long horizon section', () => {
    const { content, action } = mergeAgentsMd(null)
    assertEqual(action, 'created')
    assertIncludes(content, LONG_HORIZON_HEADING)
    assertIncludes(content, '.dsh/task-status-inject.md')
    assertIncludes(content, 'status_*')
    assert(content.endsWith('\n'), 'trailing newline')
  })

  it('merge: existing without section → append; prior content preserved', () => {
    const prior = '# Project rules\n\nPrefer small diffs.\n'
    const { content, action } = mergeAgentsMd(prior)
    assertEqual(action, 'appended')
    assert(content.startsWith('# Project rules'), 'keeps head')
    assertIncludes(content, 'Prefer small diffs.')
    assertIncludes(content, LONG_HORIZON_HEADING)
    assertIncludes(content, 'status_*')
  })

  it('merge: section already present → unchanged bytes', () => {
    const prior = `# Notes\n\n${LONG_HORIZON_SECTION}\nextra\n`
    const { content, action } = mergeAgentsMd(prior)
    assertEqual(action, 'unchanged')
    assertEqual(content, prior)
  })

  it('hasLongHorizonSection detects heading', () => {
    assert(hasLongHorizonSection('## Long horizon\nfoo'))
    assert(!hasLongHorizonSection('# Long horizon board\n'))
  })

  it('ensureAgentsMd: create / append / no-op on disk', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'lh-agents-'))
    try {
      const created = await ensureAgentsMd(cwd)
      assertEqual(created, 'created')
      const path = join(cwd, 'AGENTS.md')
      const body1 = await readFile(path, 'utf8')
      assertIncludes(body1, LONG_HORIZON_HEADING)

      await writeFile(path, '# Other\n\nkeep me\n', 'utf8')
      // strip section so append path runs
      const appended = await ensureAgentsMd(cwd)
      assertEqual(appended, 'appended')
      const body2 = await readFile(path, 'utf8')
      assertIncludes(body2, 'keep me')
      assertIncludes(body2, LONG_HORIZON_HEADING)

      const before = await readFile(path, 'utf8')
      const stBefore = await stat(path)
      const noop = await ensureAgentsMd(cwd)
      assertEqual(noop, 'unchanged')
      assertEqual(await readFile(path, 'utf8'), before)
      const stAfter = await stat(path)
      assertEqual(stAfter.mtimeMs, stBefore.mtimeMs)
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  it('service init creates AGENTS.md; re-enable appends; no-op when present', async () => {
    const storageRoot = await mkdtemp(join(tmpdir(), 'lh-vault-'))
    const cwd = await mkdtemp(join(tmpdir(), 'lh-proj-'))
    const svc = new TaskStatusService({ storageRoot })
    try {
      await svc.init({ cwd, title: 'agents-glue' })
      const agentsPath = join(cwd, 'AGENTS.md')
      const created = await readFile(agentsPath, 'utf8')
      assertIncludes(created, LONG_HORIZON_HEADING)
      assertIncludes(created, 'task-status-inject.md')

      await writeFile(agentsPath, '# Human rules\n\nDo not clobber.\n', 'utf8')
      await svc.setEnabled(cwd, false)
      await svc.setEnabled(cwd, true)
      const appended = await readFile(agentsPath, 'utf8')
      assertIncludes(appended, 'Do not clobber.')
      assertIncludes(appended, LONG_HORIZON_HEADING)

      const before = await readFile(agentsPath, 'utf8')
      await svc.init({ cwd, title: 'again' })
      assertEqual(await readFile(agentsPath, 'utf8'), before)
    } finally {
      await rm(storageRoot, { recursive: true, force: true })
      await rm(cwd, { recursive: true, force: true })
    }
  })
})
