import { describe, it, assert, assertEqual } from './harness.mjs'
import { normalizeCwd, taskIdFromCwd } from '../../lib/testables.mjs'

describe('taskId', () => {
  it('is stable for the same absolute cwd', () => {
    const a = taskIdFromCwd('/tmp/lh-proj/foo')
    const b = taskIdFromCwd('/tmp/lh-proj/foo')
    assertEqual(a, b)
    assert(a.startsWith('foo-'), a)
  })

  it('differs across different paths with same basename', () => {
    const a = taskIdFromCwd('/tmp/a/proj')
    const b = taskIdFromCwd('/tmp/b/proj')
    assert(a !== b, 'hash must differ')
    assert(a.startsWith('proj-') && b.startsWith('proj-'))
  })

  it('sanitize basename and normalize relative cwd', () => {
    const id = taskIdFromCwd('/tmp/weird name!!/here')
    assert(/^[a-zA-Z0-9._-]+-[a-f0-9]{12}$/.test(id), id)
    const n = normalizeCwd('.')
    assert(n.startsWith('/'), n)
  })
})
