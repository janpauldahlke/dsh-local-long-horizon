/**
 * Tiny node test harness — no jest/vitest dependency.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const suites = []
let current = null

export function describe(name, fn) {
  const suite = { name, cases: [] }
  suites.push(suite)
  const prev = current
  current = suite
  fn()
  current = prev
}

export function it(name, fn) {
  if (!current) throw new Error(`it(${JSON.stringify(name)}) outside describe`)
  current.cases.push({ name, fn })
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed')
}

export function assertEqual(actual, expected, msg) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    throw new Error(msg || `expected ${e}, got ${a}`)
  }
}

export function assertIncludes(haystack, needle, msg) {
  if (!String(haystack).includes(needle)) {
    throw new Error(msg || `expected to include ${JSON.stringify(needle)}`)
  }
}

export async function assertThrows(fn, ErrorClass, msgIncludes) {
  let threw = null
  try {
    await fn()
  } catch (err) {
    threw = err
  }
  if (!threw) throw new Error('expected throw')
  if (ErrorClass && !(threw instanceof ErrorClass)) {
    throw new Error(`expected ${ErrorClass.name}, got ${threw?.name || threw}`)
  }
  if (msgIncludes && !String(threw.message || threw).includes(msgIncludes)) {
    throw new Error(`expected message to include ${JSON.stringify(msgIncludes)}, got ${threw.message}`)
  }
  return threw
}

export async function runAll({ evidenceName = 'test-suite.txt' } = {}) {
  const log = []
  let failed = 0
  let passed = 0

  for (const suite of suites) {
    console.log(`\n▸ ${suite.name}`)
    for (const c of suite.cases) {
      const label = `${suite.name} › ${c.name}`
      try {
        await c.fn()
        passed += 1
        log.push(`PASS ${label}`)
        console.log(`  ✓ ${c.name}`)
      } catch (err) {
        failed += 1
        const detail = err instanceof Error ? err.stack || err.message : String(err)
        log.push(`FAIL ${label}\n${detail}`)
        console.error(`  ✗ ${c.name}`)
        console.error(`    ${err instanceof Error ? err.message : err}`)
      }
    }
  }

  const summary = `passed=${passed} failed=${failed} suites=${suites.length}`
  log.push(summary)
  console.log(`\n${summary}`)

  const ev = join(process.cwd(), 'agent/evidence')
  await mkdir(ev, { recursive: true })
  await writeFile(join(ev, evidenceName), `${log.join('\n')}\n`, 'utf8')

  if (failed > 0) process.exitCode = 1
  return { passed, failed }
}
