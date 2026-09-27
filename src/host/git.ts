/** Best-effort current git branch for a project cwd (null if not a repo). */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function resolveGitBranch(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD'],
      { timeout: 2000, maxBuffer: 64 * 1024 },
    )
    const branch = stdout.trim()
    if (!branch || branch === 'HEAD') return null // detached
    return branch
  } catch {
    return null
  }
}
