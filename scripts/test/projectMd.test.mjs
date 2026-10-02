import { describe, it, assert, assertIncludes } from './harness.mjs'
import { renderStatusMd, MAX_DONE_RECENT } from '../../lib/testables.mjs'

describe('projectMd', () => {
  it('projects ON/OFF, next, inflight, blocked, recent done, branch', () => {
    const now = Date.now()
    const done = Array.from({ length: MAX_DONE_RECENT + 2 }, (_, i) => ({
      id: `d${i}`,
      summary: `done-${i}`,
      verify: i % 2 ? `v${i}` : undefined,
      at: now - i * 1000,
    }))
    const md = renderStatusMd({
      taskId: 't',
      title: 'Fixture',
      cwd: '/tmp/fixture',
      updatedAt: now,
      phase: 'demo',
      enabled: true,
      done,
      inFlight: { summary: 'working' },
      next: ['one', 'two'],
      blocked: { reason: 'need key', since: now },
      verifyHint: 'npm test',
      keyPaths: [],
      notes: '',
      gitBranch: 'feature/x',
    })

    assertIncludes(md, '# Fixture')
    assertIncludes(md, 'Long horizon:** ON')
    assertIncludes(md, 'Phase:** demo')
    assertIncludes(md, 'Blocked:** need key')
    assertIncludes(md, 'In flight:** working')
    assertIncludes(md, '1. one')
    assertIncludes(md, '2. two')
    assertIncludes(md, 'Verify hint:** npm test')
    assertIncludes(md, 'Last write branch:* `feature/x`')

    // recent capped + reversed (newest first): keep last MAX_DONE_RECENT
    const newest = `done-${MAX_DONE_RECENT + 1}`
    assertIncludes(md, newest)
    assertIncludes(md, 'done-2') // oldest kept index when length = MAX+2
    assert(!md.includes('done-0'), 'oldest done should be omitted')
    assert(!md.includes('done-1'), 'second-oldest done should be omitted')
  })

  it('empty next renders placeholder dash', () => {
    const md = renderStatusMd({
      taskId: 't',
      title: 'Empty',
      cwd: '/tmp/e',
      updatedAt: Date.now(),
      phase: 'init',
      enabled: false,
      done: [],
      inFlight: null,
      next: [],
      blocked: null,
      verifyHint: '',
      keyPaths: [],
      notes: '',
    })
    assertIncludes(md, 'Long horizon:** OFF')
    assertIncludes(md, '1. —')
    assertIncludes(md, '(none)')
  })
})
