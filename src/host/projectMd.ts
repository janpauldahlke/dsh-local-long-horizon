import type { TaskStatus } from '../shared/types.ts'
import { MAX_DONE_RECENT } from '../shared/types.ts'

/** One-way store → STATUS.md (same fields as pane). */
export function renderStatusMd(record: TaskStatus): string {
  const age = ageLabel(record.updatedAt)
  const lines: string[] = [
    `# ${record.title}`,
    '',
    `- **Long horizon:** ${record.enabled ? 'ON' : 'OFF'}`,
    `- **Phase:** ${record.phase}`,
    `- **cwd:** \`${record.cwd}\``,
    `- **Updated:** ${age}`,
    '',
  ]
  if (record.blocked) {
    lines.push(`> **Blocked:** ${record.blocked.reason}`, '')
  }
  lines.push('## Now', '')
  lines.push(`- **In flight:** ${record.inFlight?.summary ?? '—'}`)
  lines.push('- **Next 3:**')
  if (record.next.length === 0) {
    lines.push('  1. —')
  } else {
    record.next.forEach((n, i) => lines.push(`  ${i + 1}. ${n}`))
  }
  lines.push('', '## Done (recent)', '')
  const recent = record.done.slice(-MAX_DONE_RECENT).reverse()
  if (recent.length === 0) {
    lines.push('- (none)')
  } else {
    for (const d of recent) {
      const v = d.verify ? ` · verify: ${d.verify}` : ''
      lines.push(`- ✓ ${d.summary}${v} · ${ageLabel(d.at)}`)
    }
  }
  if (record.verifyHint) {
    lines.push('', `**Verify hint:** ${record.verifyHint}`)
  }
  if (record.gitBranch) {
    lines.push('', `*Last write branch:* \`${record.gitBranch}\``)
  }
  lines.push('')
  return lines.join('\n')
}

function ageLabel(at: number): string {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}
