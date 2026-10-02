/**
 * Run the node test suite (no harness / no GPU).
 * Prefer: npm test
 */
import { readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { runAll } from './test/harness.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const testDir = join(here, 'test')
const files = (await readdir(testDir))
  .filter((f) => f.endsWith('.test.mjs'))
  .sort()

for (const f of files) {
  await import(pathToFileURL(join(testDir, f)).href)
}

const { passed, failed } = await runAll({ evidenceName: 'test-suite.txt' })
if (failed > 0) {
  console.error(`\n${failed} test(s) failed`)
  process.exit(1)
}
console.log(`\nALL GREEN (${passed})`)
