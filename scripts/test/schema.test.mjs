import { describe, it, assert, assertEqual, assertThrows } from './harness.mjs'
import {
  ValidationError,
  assertNext,
  capNotes,
  emptyRecord,
  MAX_NEXT,
  MAX_NOTES_CHARS,
} from '../../lib/testables.mjs'

describe('schema', () => {
  it('accepts next length 0–3', () => {
    assertNext([])
    assertNext(['a'])
    assertNext(['a', 'b', 'c'])
  })

  it('rejects next length > 3', async () => {
    await assertThrows(
      () => assertNext(['a', 'b', 'c', 'd']),
      ValidationError,
      `hard cap ${MAX_NEXT}`,
    )
  })

  it('rejects empty next items', async () => {
    await assertThrows(() => assertNext(['ok', '  ']), ValidationError, 'non-empty')
  })

  it('rejects non-array next', async () => {
    await assertThrows(() => assertNext('nope'), ValidationError, 'array')
  })

  it('caps notes at MAX_NOTES_CHARS', () => {
    const long = 'x'.repeat(MAX_NOTES_CHARS + 40)
    const capped = capNotes(long)
    assert(capped.length === MAX_NOTES_CHARS, `len=${capped.length}`)
    assert(capped.endsWith('…'), 'ellipsis')
  })

  it('emptyRecord defaults title from cwd basename and enables ON', () => {
    const r = emptyRecord({ taskId: 't1', cwd: '/tmp/foo/my-proj' })
    assertEqual(r.title, 'my-proj')
    assertEqual(r.enabled, true)
    assertEqual(r.phase, 'init')
    assertEqual(r.next, [])
    assertEqual(r.inFlight, null)
    assertEqual(r.blocked, null)
  })
})
