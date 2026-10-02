import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Stable marker — matches README “Recommended AGENTS.md snippet”. */
export const LONG_HORIZON_HEADING = '## Long horizon'

/**
 * Canonical glue DSH injects via root AGENTS.md.
 * Keep in sync with README “Recommended `AGENTS.md` snippet”.
 */
export const LONG_HORIZON_SECTION = `${LONG_HORIZON_HEADING}
Before coding, read \`.dsh/task-status-inject.md\` if present — it is binding
current task state (DeepSeek Harness injects this AGENTS.md; the inject file is
the live board).
Use status_* tools to update Next (≤3), in-flight, done (with verify), and blocked.
Do not invent a parallel STATUS novel; the vault owns truth and STATUS.md is generated.
`

export type EnsureAgentsMdAction = 'created' | 'appended' | 'unchanged'

export function hasLongHorizonSection(content: string): boolean {
  return content.includes(LONG_HORIZON_HEADING)
}

/** Pure merge: create / append / no-op. Never rewrites richer human content. */
export function mergeAgentsMd(existing: string | null): {
  content: string
  action: EnsureAgentsMdAction
} {
  const section = `${LONG_HORIZON_SECTION.trimEnd()}\n`
  if (existing === null) {
    return { content: section, action: 'created' }
  }
  if (hasLongHorizonSection(existing)) {
    return { content: existing, action: 'unchanged' }
  }
  const base = existing.replace(/\s+$/, '')
  const sep = base.length === 0 ? '' : '\n\n'
  return { content: `${base}${sep}${section}`, action: 'appended' }
}

/**
 * Ensure `<cwd>/AGENTS.md` has the Long horizon glue section.
 * Missing → create; present without section → append; already there → no-op.
 */
export async function ensureAgentsMd(cwd: string): Promise<EnsureAgentsMdAction> {
  const path = join(cwd, 'AGENTS.md')
  let existing: string | null = null
  try {
    existing = await readFile(path, 'utf8')
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') throw err
  }
  const { content, action } = mergeAgentsMd(existing)
  if (action === 'unchanged') return action
  await writeFile(path, content, 'utf8')
  return action
}
