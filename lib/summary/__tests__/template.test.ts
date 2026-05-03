import { describe, it, expect } from 'vitest'
import { generateSummaryMarkdown, stripMarkdown } from '../template'
import type { WeeklySummaryData } from '@/lib/hooks/use-weekly-summary-data'

function baseData(overrides: Partial<WeeklySummaryData> = {}): WeeklySummaryData {
  return {
    weekStart: '2026-04-27',
    weekEnd: '2026-05-03',
    completedTasks: [],
    inProgressTasks: [],
    overdueTasks: [],
    blockedTasks: [],
    nextWeekTasks: [],
    meetings: [],
    activePeople: [],
    evidenceThisWeek: [],
    completedFollowUps: [],
    openFollowUps: [],
    reflectionNotes: null,
    ...overrides,
  }
}

function makeTask(overrides: Partial<WeeklySummaryData['completedTasks'][0]> = {}) {
  return {
    id: 't1',
    title: 'Finish sprint planning',
    priority: 'High',
    status: 'Done',
    dueDate: null,
    completionDate: '2026-04-28',
    category: null,
    ...overrides,
  }
}

function makeMeeting(overrides: Partial<WeeklySummaryData['meetings'][0]> = {}) {
  return {
    id: 'm1',
    title: 'Alice 1:1',
    type: '1:1',
    date: '2026-04-28',
    personId: 'p1',
    personName: 'Alice',
    hasNotes: true,
    actionItemCount: 2,
    ...overrides,
  }
}

describe('generateSummaryMarkdown', () => {
  it('includes week heading', () => {
    const md = generateSummaryMarkdown(baseData())
    expect(md).toContain('# Week Summary')
    expect(md).toContain('27 Apr')
    expect(md).toContain('3 May')
  })

  it('omits empty sections entirely', () => {
    const md = generateSummaryMarkdown(baseData())
    expect(md).not.toContain('## Completed')
    expect(md).not.toContain('## In Progress')
    expect(md).not.toContain('## Meetings')
    expect(md).not.toContain('## Follow-ups')
    expect(md).not.toContain('## Notes')
  })

  it('renders Completed section when tasks present', () => {
    const md = generateSummaryMarkdown(baseData({ completedTasks: [makeTask()] }))
    expect(md).toContain('## Completed')
    expect(md).toContain('- Finish sprint planning ⚡')
  })

  it('adds ⚡ for High priority tasks', () => {
    const md = generateSummaryMarkdown(baseData({ completedTasks: [makeTask({ priority: 'High' })] }))
    expect(md).toContain('⚡')
  })

  it('adds ⚡ for Very High priority tasks', () => {
    const md = generateSummaryMarkdown(baseData({ completedTasks: [makeTask({ priority: 'Very High' })] }))
    expect(md).toContain('⚡')
  })

  it('does not add ⚡ for Medium priority tasks', () => {
    const md = generateSummaryMarkdown(baseData({ completedTasks: [makeTask({ priority: 'Medium' })] }))
    expect(md).not.toContain('⚡')
  })

  it('renders ⚠️ for overdue tasks with days count', () => {
    const task = { id: 't1', title: 'Deploy fix', priority: 'High', status: 'In progress', dueDate: '2026-04-20', completionDate: null, category: null, daysOverdue: 7 }
    const md = generateSummaryMarkdown(baseData({ overdueTasks: [task] }))
    expect(md).toContain('## Overdue')
    expect(md).toContain('⚠️ Deploy fix')
    expect(md).toContain('7d overdue')
  })

  it('renders 🚫 for blocked tasks', () => {
    const task = makeTask({ status: 'Blocked', priority: 'Medium' })
    const md = generateSummaryMarkdown(baseData({ blockedTasks: [task] }))
    expect(md).toContain('## Blocked')
    expect(md).toContain('🚫 Finish sprint planning')
  })

  it('renders Meetings section with count line', () => {
    const md = generateSummaryMarkdown(baseData({ meetings: [makeMeeting()] }))
    expect(md).toContain('## Meetings')
    expect(md).toContain('1 meeting')
    expect(md).toContain('1 1:1s')
    expect(md).toContain('Alice 1:1')
  })

  it('renders person name in meeting line', () => {
    const md = generateSummaryMarkdown(baseData({ meetings: [makeMeeting()] }))
    expect(md).toContain('with Alice')
  })

  it('renders action item count in meeting line', () => {
    const md = generateSummaryMarkdown(baseData({ meetings: [makeMeeting({ actionItemCount: 3 })] }))
    expect(md).toContain('3 action items')
  })

  it('renders (no notes) when meeting has no notes', () => {
    const md = generateSummaryMarkdown(baseData({ meetings: [makeMeeting({ hasNotes: false })] }))
    expect(md).toContain('*(no notes)*')
  })

  it('renders People section with seen / not-seen', () => {
    const people = [
      { id: 'p1', name: 'Alice', lastMeetingDate: null, seenThisWeek: true },
      { id: 'p2', name: 'Bob', lastMeetingDate: null, seenThisWeek: false },
    ]
    const md = generateSummaryMarkdown(baseData({ activePeople: people }))
    expect(md).toContain('## People')
    expect(md).toContain('Alice')
    expect(md).toContain('Not seen this week: Bob')
  })

  it('renders Follow-ups section with counts', () => {
    const completed = [{ id: 'f1', title: 'Check in', personId: 'p1', personName: 'Alice', completedAt: '2026-04-28T10:00:00Z', dueDate: null, status: 'completed' }]
    const open = [{ id: 'f2', title: 'Send docs', personId: 'p1', personName: 'Alice', completedAt: null, dueDate: null, status: 'open' }]
    const md = generateSummaryMarkdown(baseData({ completedFollowUps: completed, openFollowUps: open }))
    expect(md).toContain('## Follow-ups')
    expect(md).toContain('Completed: 1')
    expect(md).toContain('Still open: 1')
  })

  it('renders Notes section when reflection exists', () => {
    const md = generateSummaryMarkdown(baseData({ reflectionNotes: 'Good week overall.' }))
    expect(md).toContain('## Notes')
    expect(md).toContain('Good week overall.')
  })

  it('renders Next Week Priorities section', () => {
    const task = makeTask({ status: 'Not started', dueDate: '2026-05-05' })
    const md = generateSummaryMarkdown(baseData({ nextWeekTasks: [task] }))
    expect(md).toContain('## Next Week Priorities')
    expect(md).toContain('Finish sprint planning')
  })

  it('sections appear in correct order', () => {
    const data = baseData({
      completedTasks: [makeTask()],
      overdueTasks: [{ id: 't2', title: 'Old task', priority: 'Low', status: 'In progress', dueDate: '2026-04-20', completionDate: null, category: null, daysOverdue: 7 }],
      reflectionNotes: 'Reflect.',
    })
    const md = generateSummaryMarkdown(data)
    const completedIdx = md.indexOf('## Completed')
    const overdueIdx = md.indexOf('## Overdue')
    const notesIdx = md.indexOf('## Notes')
    expect(completedIdx).toBeLessThan(overdueIdx)
    expect(overdueIdx).toBeLessThan(notesIdx)
  })

  it('handles year boundary dates', () => {
    const md = generateSummaryMarkdown(baseData({ weekStart: '2025-12-29', weekEnd: '2026-01-04' }))
    expect(md).toContain('29 Dec')
    expect(md).toContain('4 Jan')
  })
})

describe('stripMarkdown', () => {
  it('removes headings', () => {
    expect(stripMarkdown('# Title\n## Section')).not.toContain('#')
  })

  it('removes bold markers', () => {
    expect(stripMarkdown('**bold text**')).toBe('bold text')
  })

  it('removes italic markers', () => {
    expect(stripMarkdown('*italic*')).toBe('italic')
  })

  it('converts list markers to bullets', () => {
    const result = stripMarkdown('- item one\n- item two')
    expect(result).toContain('• item one')
    expect(result).toContain('• item two')
  })

  it('removes inline code backticks', () => {
    expect(stripMarkdown('Use `npm run build`')).toBe('Use npm run build')
  })

  it('removes markdown links, keeps text', () => {
    expect(stripMarkdown('[click here](https://example.com)')).toBe('click here')
  })

  it('preserves plain text unchanged', () => {
    const plain = 'Just some plain text'
    expect(stripMarkdown(plain)).toBe(plain)
  })

  it('handles empty string', () => {
    expect(stripMarkdown('')).toBe('')
  })
})
