import type { WeeklySummaryData } from '@/lib/hooks/use-weekly-summary-data'

// ── Date formatting ───────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function fmtDateShort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

// ── Section builders ──────────────────────────────────────────────────────────

function sectionCompleted(data: WeeklySummaryData): string {
  if (data.completedTasks.length === 0) return ''
  const lines = data.completedTasks.map(t => {
    const priority = t.priority === 'Very High' || t.priority === 'High' ? ' ⚡' : ''
    return `- ${t.title}${priority}`
  })
  return `## Completed\n\n${lines.join('\n')}`
}

function sectionInProgress(data: WeeklySummaryData): string {
  if (data.inProgressTasks.length === 0) return ''
  const lines = data.inProgressTasks.map(t => {
    const due = t.dueDate ? ` — due ${fmtDateShort(t.dueDate)}` : ''
    return `- ${t.title}${due}`
  })
  return `## In Progress\n\n${lines.join('\n')}`
}

function sectionOverdue(data: WeeklySummaryData): string {
  if (data.overdueTasks.length === 0) return ''
  const lines = data.overdueTasks.map(t => {
    const days = t.daysOverdue != null ? ` — ${t.daysOverdue}d overdue` : ''
    return `- ⚠️ ${t.title}${days}`
  })
  return `## Overdue\n\n${lines.join('\n')}`
}

function sectionBlocked(data: WeeklySummaryData): string {
  if (data.blockedTasks.length === 0) return ''
  const lines = data.blockedTasks.map(t => `- 🚫 ${t.title}`)
  return `## Blocked\n\n${lines.join('\n')}`
}

function sectionMeetings(data: WeeklySummaryData): string {
  if (data.meetings.length === 0) return ''
  const oneOnOnes = data.meetings.filter(m => m.type === '1:1')
  const others = data.meetings.filter(m => m.type !== '1:1')
  const countLine = `${data.meetings.length} meeting${data.meetings.length !== 1 ? 's' : ''} this week (${oneOnOnes.length} 1:1s, ${others.length} team meetings)`
  const lines = data.meetings.map(m => {
    const who = m.personName ? ` with ${m.personName}` : ''
    const notes = m.hasNotes ? '' : ' *(no notes)*'
    const actions = m.actionItemCount > 0 ? ` — ${m.actionItemCount} action item${m.actionItemCount !== 1 ? 's' : ''}` : ''
    return `- ${m.type}: ${m.title}${who} (${fmtDate(m.date)})${notes}${actions}`
  })
  return `## Meetings\n\n${countLine}\n\n${lines.join('\n')}`
}

function sectionPeople(data: WeeklySummaryData): string {
  const seen = data.activePeople.filter(p => p.seenThisWeek)
  const notSeen = data.activePeople.filter(p => !p.seenThisWeek)
  if (data.activePeople.length === 0) return ''

  const lines: string[] = []
  if (seen.length > 0) {
    lines.push(`- 1:1s held with: ${seen.map(p => p.name).join(', ')}`)
  }
  if (notSeen.length > 0) {
    lines.push(`- Not seen this week: ${notSeen.map(p => p.name).join(', ')}`)
  }
  if (lines.length === 0) return ''
  return `## People\n\n${lines.join('\n')}`
}

function sectionFollowUps(data: WeeklySummaryData): string {
  const completed = data.completedFollowUps.length
  const open = data.openFollowUps.length
  if (completed === 0 && open === 0) return ''

  const lines: string[] = []
  if (completed > 0) lines.push(`- Completed: ${completed}`)
  if (open > 0) lines.push(`- Still open: ${open}`)

  const overdue = data.openFollowUps.filter(f => f.dueDate && f.dueDate < new Date().toISOString().split('T')[0])
  if (overdue.length > 0) {
    lines.push(`- Overdue: ${overdue.map(f => f.title).join(', ')}`)
  }
  return `## Follow-ups\n\n${lines.join('\n')}`
}

function sectionNextWeek(data: WeeklySummaryData): string {
  if (data.nextWeekTasks.length === 0) return ''
  const lines = data.nextWeekTasks.map(t => {
    const due = t.dueDate ? ` — due ${fmtDateShort(t.dueDate)}` : ''
    const priority = t.priority === 'Very High' || t.priority === 'High' ? ' ⚡' : ''
    return `- ${t.title}${priority}${due}`
  })
  return `## Next Week Priorities\n\n${lines.join('\n')}`
}

function sectionNotes(data: WeeklySummaryData): string {
  if (!data.reflectionNotes?.trim()) return ''
  return `## Notes\n\n${data.reflectionNotes.trim()}`
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateSummaryMarkdown(data: WeeklySummaryData): string {
  const heading = `# Week Summary — ${fmtDateShort(data.weekStart)} to ${fmtDateShort(data.weekEnd)}`

  const sections = [
    sectionCompleted(data),
    sectionInProgress(data),
    sectionOverdue(data),
    sectionBlocked(data),
    sectionMeetings(data),
    sectionPeople(data),
    sectionFollowUps(data),
    sectionNextWeek(data),
    sectionNotes(data),
  ].filter(Boolean)

  return [heading, ...sections].join('\n\n')
}

/** Strip markdown formatting for plain-text export */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')       // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')   // bold
    .replace(/\*(.+?)\*/g, '$1')       // italic
    .replace(/^- /gm, '• ')            // list markers
    .replace(/`(.+?)`/g, '$1')         // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .trim()
}
