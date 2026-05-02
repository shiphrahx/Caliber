import { createClient } from '@/lib/supabase/client'
import type { Signal, SignalSeverity } from './types'

const DAYS_MS = 24 * 60 * 60 * 1000

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / DAYS_MS)
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function endOfWeekStr(): string {
  const today = new Date()
  const day = today.getDay()
  const daysUntilSunday = day === 0 ? 0 : 7 - day
  const sunday = new Date(today)
  sunday.setDate(today.getDate() + daysUntilSunday)
  return sunday.toISOString().split('T')[0]
}

export function nDaysAgoStr(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export function parseActionItemsFromHtml(html: string | null): string[] {
  if (!html) return []
  const matches = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
  return matches.map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean)
}

type DismissKey = string // `${type}::${referenceId}`

export function buildDismissedSet(dismissed: { itemType: string; referenceId: string | null }[]): Set<DismissKey> {
  return new Set(dismissed.map(d => `${d.itemType}::${d.referenceId ?? ''}`))
}

export function isDismissed(set: Set<DismissKey>, type: string, refId: string): boolean {
  return set.has(`${type}::${refId}`)
}

/**
 * Load all raw data needed for signal computation in one pass.
 * Returns parallel query results for reuse across multiple signal types.
 */
export async function loadSignalData() {
  const supabase = createClient()
  const todayISO = todayStr()
  const endOfWeekISO = endOfWeekStr()

  const [
    { data: overdueTasks },
    { data: activePeople },
    { data: recentMeetings },
    { data: upcomingTasks },
    { data: evidenceRecent },
    { data: meetingsWithNotes },
    { data: openFollowUps },
    { data: tasksByPerson },
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, due_date, priority')
      .lt('due_date', todayISO)
      .not('status', 'eq', 'completed')
      .not('due_date', 'is', null),

    supabase
      .from('people')
      .select('id, full_name, role')
      .eq('status', 'active'),

    supabase
      .from('meetings')
      .select('id, title, meeting_type, meeting_date, person_id, action_items, notes')
      .gte('meeting_date', nDaysAgoStr(30))
      .order('meeting_date', { ascending: false }),

    supabase
      .from('tasks')
      .select('id, title, due_date, priority')
      .gte('due_date', todayISO)
      .lte('due_date', endOfWeekISO)
      .not('status', 'eq', 'completed'),

    supabase
      .from('evidence_entries')
      .select('person_id, occurred_at')
      .gte('occurred_at', nDaysAgoStr(90)),

    supabase
      .from('meetings')
      .select('id, person_id, meeting_date, notes')
      .gte('meeting_date', nDaysAgoStr(21))
      .not('notes', 'is', null),

    supabase
      .from('follow_ups')
      .select('id, person_id, title, status, due_date, created_at, times_surfaced')
      .eq('status', 'open'),

    // Tasks linked to people via task_relations
    supabase
      .from('task_relations')
      .select('entity_id, task_id')
      .eq('entity_type', 'person')
      .in('task_id',
        (await supabase.from('tasks').select('id').not('status', 'eq', 'completed')).data?.map((t: any) => t.id) ?? []
      ),
  ])

  return {
    overdueTasks: overdueTasks ?? [],
    activePeople: activePeople ?? [],
    recentMeetings: recentMeetings ?? [],
    upcomingTasks: upcomingTasks ?? [],
    evidenceRecent: evidenceRecent ?? [],
    meetingsWithNotes: meetingsWithNotes ?? [],
    openFollowUps: openFollowUps ?? [],
    tasksByPerson: tasksByPerson ?? [],
  }
}

export type SignalData = Awaited<ReturnType<typeof loadSignalData>>

/**
 * Compute task-level signals (overdue + upcoming) from preloaded data.
 * Used by Weekly Review.
 */
export function computeTaskSignals(
  data: Pick<SignalData, 'overdueTasks' | 'upcomingTasks'>,
  dismissedSet: Set<DismissKey>,
  today: Date
): Signal[] {
  const signals: Signal[] = []

  for (const task of data.overdueTasks) {
    if (isDismissed(dismissedSet, 'overdue_task', task.id)) continue
    const daysOverdue = daysBetween(new Date(task.due_date + 'T00:00:00'), today)
    signals.push({
      type: 'overdue_task',
      severity: daysOverdue >= 4 ? 'critical' : 'warning',
      message: `"${task.title}" is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`,
      entityId: task.id,
      entityType: 'task',
      meta: { daysOverdue, dueDate: task.due_date, priority: task.priority },
    })
  }

  for (const task of data.upcomingTasks) {
    if (isDismissed(dismissedSet, 'upcoming_deadline', task.id)) continue
    signals.push({
      type: 'upcoming_deadline',
      severity: 'info',
      message: `"${task.title}" due on ${new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
      entityId: task.id,
      entityType: 'task',
      meta: { dueDate: task.due_date, priority: task.priority },
    })
  }

  return signals
}

/**
 * Compute all person-centric signals for all active people.
 * Used by both Radar (all people) and Weekly Review (people section).
 */
export function computePeopleSignals(
  data: SignalData,
  dismissedSet: Set<DismissKey>,
  today: Date
): Signal[] {
  const signals: Signal[] = []

  // Build lookup maps
  const oneOnOneMeetingsByPerson: Record<string, string> = {}
  for (const m of data.recentMeetings) {
    if (m.meeting_type === '1:1' && m.person_id) {
      if (!oneOnOneMeetingsByPerson[m.person_id]) {
        oneOnOneMeetingsByPerson[m.person_id] = m.meeting_date
      }
    }
  }

  const notesDateByPerson: Record<string, string> = {}
  for (const m of data.meetingsWithNotes) {
    if (m.person_id && m.notes) {
      if (!notesDateByPerson[m.person_id] || m.meeting_date > notesDateByPerson[m.person_id]) {
        notesDateByPerson[m.person_id] = m.meeting_date
      }
    }
  }

  const evidence90DaysPersonIds = new Set(data.evidenceRecent.map((e: any) => e.person_id))
  const evidenceAnyPersonIds = new Set(data.evidenceRecent.map((e: any) => e.person_id))

  const openTasksByPerson: Record<string, number> = {}
  for (const rel of data.tasksByPerson) {
    if (!openTasksByPerson[rel.entity_id]) openTasksByPerson[rel.entity_id] = 0
    openTasksByPerson[rel.entity_id]++
  }

  for (const person of data.activePeople) {
    const lastOneOnOne = oneOnOneMeetingsByPerson[person.id]
    const lastNoteDate = notesDateByPerson[person.id]

    // Signal: no recent 1:1
    if (!isDismissed(dismissedSet, 'no_recent_1on1', person.id)) {
      if (!lastOneOnOne) {
        signals.push({
          type: 'no_recent_1on1',
          severity: 'critical',
          message: `No 1:1 with ${person.full_name} in the last 30 days`,
          personId: person.id,
          personName: person.full_name,
          entityId: person.id,
          entityType: 'person',
          meta: { daysSince: null },
        })
      } else {
        const daysSince = daysBetween(new Date(lastOneOnOne + 'T00:00:00'), today)
        if (daysSince >= 14) {
          signals.push({
            type: 'no_recent_1on1',
            severity: daysSince >= 21 ? 'critical' : 'warning',
            message: `No 1:1 with ${person.full_name} in ${daysSince} days`,
            personId: person.id,
            personName: person.full_name,
            entityId: person.id,
            entityType: 'person',
            meta: { daysSince, lastDate: lastOneOnOne },
          })
        }
      }
    }

    // Signal: no recent evidence
    if (!isDismissed(dismissedSet, 'no_evidence', person.id)) {
      if (!evidence90DaysPersonIds.has(person.id)) {
        signals.push({
          type: 'no_evidence',
          severity: evidenceAnyPersonIds.has(person.id) ? 'warning' : 'info',
          message: `No evidence logged for ${person.full_name} in 90 days`,
          personId: person.id,
          personName: person.full_name,
          entityId: person.id,
          entityType: 'person',
        })
      }
    }

    // Signal: no recent meeting notes
    if (!isDismissed(dismissedSet, 'missing_notes', person.id)) {
      if (!lastNoteDate) {
        signals.push({
          type: 'missing_notes',
          severity: 'info',
          message: `No meeting notes involving ${person.full_name} in 21 days`,
          personId: person.id,
          personName: person.full_name,
          entityId: person.id,
          entityType: 'person',
          meta: { daysSince: null },
        })
      }
    }

    // Signal: action overload
    const openTaskCount = openTasksByPerson[person.id] ?? 0
    if (openTaskCount >= 5 && !isDismissed(dismissedSet, 'action_overload', person.id)) {
      signals.push({
        type: 'action_overload',
        severity: openTaskCount >= 10 ? 'critical' : 'warning',
        message: `${person.full_name} has ${openTaskCount} open tasks`,
        personId: person.id,
        personName: person.full_name,
        entityId: person.id,
        entityType: 'person',
        meta: { openTaskCount },
      })
    }
  }

  return signals
}

/**
 * Compute follow-up signals from preloaded open follow-ups.
 */
export function computeFollowUpSignals(
  openFollowUps: any[],
  dismissedSet: Set<DismissKey>,
  today: Date
): Signal[] {
  const signals: Signal[] = []

  for (const fu of openFollowUps) {
    const ageInDays = daysBetween(new Date(fu.created_at), today)

    // Surfaced 3+ times without resolution → critical
    if (fu.times_surfaced >= 3 && !isDismissed(dismissedSet, 'surfaced_follow_up', fu.id)) {
      signals.push({
        type: 'surfaced_follow_up',
        severity: 'critical',
        message: `"${fu.title}" has been flagged ${fu.times_surfaced} times without resolution`,
        personId: fu.person_id,
        entityId: fu.id,
        entityType: 'follow_up',
        meta: { personId: fu.person_id, timesSurfaced: fu.times_surfaced },
      })
      continue
    }

    // Overdue (due_date passed)
    if (fu.due_date && fu.due_date < todayStr()) {
      if (!isDismissed(dismissedSet, 'overdue_follow_up', fu.id)) {
        const daysOverdue = daysBetween(new Date(fu.due_date + 'T00:00:00'), today)
        signals.push({
          type: 'overdue_follow_up',
          severity: 'warning',
          message: `Follow-up "${fu.title}" is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`,
          personId: fu.person_id,
          entityId: fu.id,
          entityType: 'follow_up',
          meta: { personId: fu.person_id, daysOverdue, dueDate: fu.due_date },
        })
      }
      continue
    }

    // Ageing (open 14+ days with no due date, or 30+ days regardless)
    if (!isDismissed(dismissedSet, 'ageing_follow_up', fu.id)) {
      if (ageInDays >= 30) {
        signals.push({
          type: 'ageing_follow_up',
          severity: 'critical',
          message: `Follow-up "${fu.title}" has been open for ${ageInDays} days`,
          personId: fu.person_id,
          entityId: fu.id,
          entityType: 'follow_up',
          meta: { personId: fu.person_id, ageInDays },
        })
      } else if (ageInDays >= 14 && !fu.due_date) {
        signals.push({
          type: 'ageing_follow_up',
          severity: 'warning',
          message: `Follow-up "${fu.title}" has been open for ${ageInDays} days`,
          personId: fu.person_id,
          entityId: fu.id,
          entityType: 'follow_up',
          meta: { personId: fu.person_id, ageInDays },
        })
      }
    }
  }

  return signals
}

/**
 * Compute unresolved meeting action signals from recent meetings.
 */
export async function computeActionItemSignals(
  recentMeetings: any[],
  dismissedSet: Set<DismissKey>,
  today: Date
): Promise<Signal[]> {
  const supabase = createClient()
  const signals: Signal[] = []

  for (const meeting of recentMeetings) {
    const items = parseActionItemsFromHtml(meeting.action_items)
    if (items.length === 0) continue

    const { data: linkedTasks } = await supabase
      .from('task_relations')
      .select('task_id, tasks!inner(id, title, status, created_at)')
      .eq('entity_type', 'meeting')
      .eq('entity_id', meeting.id)

    if (!linkedTasks || linkedTasks.length === 0) continue

    const meetingDate = new Date(meeting.meeting_date + 'T00:00:00')
    const daysAgo = daysBetween(meetingDate, today)

    for (const rel of linkedTasks) {
      const task = (rel as any).tasks
      if (!task || task.status === 'completed') continue
      if (isDismissed(dismissedSet, 'unresolved_action', task.id)) continue
      const severity: SignalSeverity = daysAgo >= 14 ? 'critical' : daysAgo >= 7 ? 'warning' : 'info'
      signals.push({
        type: 'unresolved_action',
        severity,
        message: `"${task.title}" from "${meeting.title}" (${daysAgo} days ago) is still open`,
        entityId: meeting.id,
        entityType: 'meeting',
        meta: { taskId: task.id, taskTitle: task.title, meetingTitle: meeting.title, daysAgo },
      })
    }
  }

  return signals
}

/** Sort signals: critical first, warning second, info last */
export function sortSignals(signals: Signal[]): Signal[] {
  const order: Record<string, number> = { critical: 0, warning: 1, info: 2 }
  return [...signals].sort((a, b) => order[a.severity] - order[b.severity])
}
