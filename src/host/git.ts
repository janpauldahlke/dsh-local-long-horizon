/** Best-effort current git branch for a project cwd (null if not a repo). */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

async function gitShort(cwd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', cwd, ...args], {
      timeout: 2000,
      maxBuffer: 64 * 1024,
    })
    const branch = stdout.trim()
    if (!branch || branch === 'HEAD') return null
    return branch
  } catch {
    return null
  }
}

export async function resolveGitBranch(cwd: string): Promise<string | null> {
  // symbolic-ref works before the first commit; rev-parse is the fallback.
  return (
    await gitShort(cwd, ['symbolic-ref', '--short', 'HEAD'])
  ) ?? (
    await gitShort(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])
  )
}
