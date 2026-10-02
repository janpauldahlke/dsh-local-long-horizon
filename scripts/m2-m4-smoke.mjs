/**
 * Legacy entry — delegates to the expanded suite.
 * Prefer: npm test
 */
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const child = spawn(process.execPath, [join(here, 'run-tests.mjs')], {
  stdio: 'inherit',
  cwd: join(here, '..'),
})
child.on('exit', (code) => process.exit(code ?? 1))
