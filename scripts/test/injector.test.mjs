import { describe, it, assert, assertIncludes } from './harness.mjs'
import { renderInject, renderDisabledInject } from '../../lib/testables.mjs'

function base(over = {}) {
  return {
    taskId: 't',
    title: 't',
    cwd: '/tmp/t',
    updatedAt: Date.now(),
    phase: 'build',
    enabled: true,
    done: [],
    inFlight: { summary: 'wire tests' },
    next: ['a', 'b'],
    blocked: null,
    verifyHint: '',
    keyPaths: [],
    notes: '',
    ...over,
  }
}

describe('injector', () => {
  it('renders one-line TASK STATUS under ~50-token budget', () => {
    const out = renderInject(base())
    assertIncludes(out, '[TASK STATUS]')
    assertIncludes(out, 'Phase: build')
    assertIncludes(out, 'InFlight: wire tests')
    assertIncludes(out, 'Next: 1.a 2.b')
    assert(out.length <= 221, `inject too long: ${out.length}`)
    assert(out.endsWith('\n'), 'newline terminated')
  })

  it('truncates oversized lines to 220 chars + newline', () => {
    const out = renderInject(base({
      phase: 'P'.repeat(80),
      next: ['n'.repeat(80), 'm'.repeat(80), 'o'.repeat(80)],
      inFlight: { summary: 'i'.repeat(80) },
      blocked: { reason: 'r'.repeat(80), since: Date.now() },
    }))
    assert(out.length === 221, `expected 220+newline, got ${out.length}`)
  })

  it('DISABLED inject when record.enabled=false', () => {
    const out = renderInject(base({ enabled: false }))
    assertIncludes(out, 'DISABLED')
  })

  it('renderDisabledInject matches OFF contract', () => {
    const out = renderDisabledInject()
    assertIncludes(out, 'DISABLED')
    assertIncludes(out, 'mutations refused')
  })
})
