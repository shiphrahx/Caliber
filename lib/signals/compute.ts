import { createClient } from '@/lib/supabase/client'
import type { Signal, SignalSeverity } from './types'
import type { GoalStalenessRecord } from '@/lib/services/career-goals'

const DAYS_MS = 24 * 60 * 60 * 1000

/** Days from start_date within which a person is considered a new hire. Configurable constant. */
export const NEW_HIRE_WINDOW_DAYS = 90

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / DAYS_MS)
}

/**
 * Returns true if the person started within NEW_HIRE_WINDOW_DAYS before `today`.
 * Returns false if start_date is null/undefined.
 */
export function isNewHire(startDate: string | null | undefined, today: Date): boolean {
  if (!startDate) return false
  const start = new Date(startDate + 'T00:00:00')
  const daysSinceStart = daysBetween(start, today)
  return daysSinceStart >= 0 && daysSinceStart < NEW_HIRE_WINDOW_DAYS
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
    { data: careerGoals },
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, due_date, priority')
      .lt('due_date', todayISO)
      .not('status', 'eq', 'completed')
      .not('due_date', 'is', null),

    supabase
      .from('people')
      .select('id, full_name, role, start_date')
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
      .select('person_id, occurred_at, sentiment')
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

    // Non-completed career goals for stale goal detection
    supabase
      .from('career_goals')
      .select('id, goal, time_period, status, updated_at')
      .neq('status', 'Completed')
      .order('updated_at', { ascending: true }),
  ])

  // Map raw career goal rows to GoalStalenessRecord
  const goalRows = (careerGoals ?? []) as Array<{
    id: string; goal: string; time_period: string; status: string; updated_at: string
  }>
  const mappedCareerGoals: GoalStalenessRecord[] = goalRows.map(r => ({
    goalId: r.id,
    goalTitle: r.goal,
    timePeriod: r.time_period as GoalStalenessRecord['timePeriod'],
    status: r.status as GoalStalenessRecord['status'],
    lastUpdatedAt: r.updated_at.split('T')[0],
  }))

  return {
    overdueTasks: overdueTasks ?? [],
    activePeople: activePeople ?? [],
    recentMeetings: recentMeetings ?? [],
    upcomingTasks: upcomingTasks ?? [],
    evidenceRecent: evidenceRecent ?? [],
    meetingsWithNotes: meetingsWithNotes ?? [],
    openFollowUps: openFollowUps ?? [],
    tasksByPerson: tasksByPerson ?? [],
    careerGoals: mappedCareerGoals,
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
    const newHire = isNewHire((person as any).start_date, today)

    // Grace period: suppress all person-level signals for the first 7 days
    // A person hired today cannot have missed a 1:1, logged evidence, or meeting notes yet
    const startDate = (person as any).start_date
    const daysInRole = startDate ? daysBetween(new Date(startDate + 'T00:00:00'), today) : 999
    if (daysInRole < 7) continue

    // Thresholds adjusted for new hires
    const oneOnOneWarnDays = newHire ? 7 : 14
    const oneOnOneCritDays = newHire ? 14 : 21
    const evidenceDays     = newHire ? 30 : 90
    const notesDays        = newHire ? 14 : 21

    // Build evidence lookup for new hire threshold (30 days)
    // (existing evidenceRecent covers 90 days; filter down for new hire check)
    const evidenceInWindowPersonIds = newHire
      ? new Set(
          (data.evidenceRecent as Array<{ person_id: string; occurred_at: string }>)
            .filter(e => daysBetween(new Date(e.occurred_at + 'T00:00:00'), today) < evidenceDays)
            .map(e => e.person_id)
        )
      : evidence90DaysPersonIds

    // Track which person-level signal types fired (for compound signal)
    const firedSignalTypes: string[] = []

    // Signal: no recent 1:1
    if (!isDismissed(dismissedSet, 'no_recent_1on1', person.id)) {
      if (!lastOneOnOne) {
        firedSignalTypes.push('no_recent_1on1')
        signals.push({
          type: 'no_recent_1on1',
          severity: 'critical',
          message: `No 1:1 with ${person.full_name} in the last 30 days`,
          personId: person.id,
          personName: person.full_name,
          entityId: person.id,
          entityType: 'person',
          meta: { daysSince: null, isNewHire: newHire },
        })
      } else {
        const daysSince = daysBetween(new Date(lastOneOnOne + 'T00:00:00'), today)
        if (daysSince >= oneOnOneWarnDays) {
          firedSignalTypes.push('no_recent_1on1')
          signals.push({
            type: 'no_recent_1on1',
            severity: daysSince >= oneOnOneCritDays ? 'critical' : 'warning',
            message: `No 1:1 with ${person.full_name} in ${daysSince} days`,
            personId: person.id,
            personName: person.full_name,
            entityId: person.id,
            entityType: 'person',
            meta: { daysSince, lastDate: lastOneOnOne, isNewHire: newHire },
          })
        }
      }
    }

    // Signal: no recent evidence
    if (!isDismissed(dismissedSet, 'no_evidence', person.id)) {
      if (!evidenceInWindowPersonIds.has(person.id)) {
        firedSignalTypes.push('no_evidence')
        signals.push({
          type: 'no_evidence',
          severity: evidenceAnyPersonIds.has(person.id) ? 'warning' : 'info',
          message: `No evidence logged for ${person.full_name} in ${evidenceDays} days`,
          personId: person.id,
          personName: person.full_name,
          entityId: person.id,
          entityType: 'person',
          meta: { isNewHire: newHire },
        })
      }
    }

    // Signal: no recent meeting notes
    if (!isDismissed(dismissedSet, 'missing_notes', person.id)) {
      const lastNoteDateMs = lastNoteDate
        ? daysBetween(new Date(lastNoteDate + 'T00:00:00'), today)
        : null
      const notesMissing = lastNoteDateMs === null || lastNoteDateMs >= notesDays
      if (notesMissing) {
        firedSignalTypes.push('missing_notes')
        signals.push({
          type: 'missing_notes',
          severity: 'info',
          message: `No meeting notes involving ${person.full_name} in ${notesDays} days`,
          personId: person.id,
          personName: person.full_name,
          entityId: person.id,
          entityType: 'person',
          meta: { daysSince: lastNoteDateMs, isNewHire: newHire },
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

    // Compound signal: new hire triggering 2+ person-level signals
    if (newHire && firedSignalTypes.length >= 2 && !isDismissed(dismissedSet, 'new_hire_at_risk', person.id)) {
      signals.push({
        type: 'new_hire_at_risk',
        severity: 'critical',
        message: `${person.full_name} is a new hire missing: ${firedSignalTypes.map(t => ({ no_recent_1on1: 'a recent 1:1', no_evidence: 'logged evidence', missing_notes: 'meeting notes' }[t] ?? t)).join(', ')}`,
        personId: person.id,
        personName: person.full_name,
        entityId: person.id,
        entityType: 'person',
        meta: { isNewHire: true, firedSignalTypes },
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

/**
 * Compute sentiment drift signals for all active people.
 *
 * Drift is detected when:
 *   - recent 30 days: negative rate > 60%
 *   - prior 30 days:  negative rate < 40%
 *
 * Severity escalates to critical if both the recent AND the prior period
 * show the negative rate exceeding the threshold (i.e., persists across
 * two consecutive periods).
 *
 * Requires evidence entries for each person passed in. Call
 * `getEvidenceSentimentTimeline` per person externally, or pass raw entries.
 */
export interface SentimentPeriodStats {
  positive: number
  neutral: number
  negative: number
  total: number
}

export function computeSentimentDriftForPeriods(
  recent: SentimentPeriodStats,
  prior: SentimentPeriodStats
): { drifting: boolean; severe: boolean; recentNegRate: number; priorNegRate: number } {
  const recentNegRate = recent.total > 0 ? recent.negative / recent.total : 0
  const priorNegRate  = prior.total  > 0 ? prior.negative  / prior.total  : 0

  const drifting = recentNegRate > 0.6 && priorNegRate < 0.4
  // Severe: trend persists — both periods show elevated negativity (prior > 40% too)
  const severe = recentNegRate > 0.6 && priorNegRate >= 0.4

  return { drifting: drifting || severe, severe, recentNegRate, priorNegRate }
}

/**
 * Compute sentiment drift signals from raw evidence entries grouped by person.
 * `evidenceByPerson` maps personId → array of {occurred_at, sentiment} rows.
 */
export function computeSentimentDriftSignals(
  activePeople: Array<{ id: string; full_name: string }>,
  evidenceByPerson: Map<string, Array<{ occurred_at: string; sentiment: string | null }>>,
  dismissedSet: Set<string>,
  today: Date
): Signal[] {
  const signals: Signal[] = []

  const todayMs = today.getTime()
  const DAY = 24 * 60 * 60 * 1000
  const thirtyDaysMs = 30 * DAY
  const sixtyDaysMs  = 60 * DAY

  for (const person of activePeople) {
    if (isDismissed(dismissedSet, 'sentiment_drift', person.id)) continue

    const entries = evidenceByPerson.get(person.id) ?? []
    if (entries.length === 0) continue

    const recent: SentimentPeriodStats = { positive: 0, neutral: 0, negative: 0, total: 0 }
    const prior:  SentimentPeriodStats = { positive: 0, neutral: 0, negative: 0, total: 0 }

    for (const e of entries) {
      const ageMs = todayMs - new Date(e.occurred_at + 'T00:00:00').getTime()
      if (ageMs < 0 || ageMs > sixtyDaysMs) continue

      const bucket = ageMs <= thirtyDaysMs ? recent : prior
      bucket.total++
      if (e.sentiment === 'positive') bucket.positive++
      else if (e.sentiment === 'negative') bucket.negative++
      else bucket.neutral++
    }

    // Need evidence in both windows to detect drift
    if (recent.total === 0 || prior.total === 0) continue

    const { drifting, severe, recentNegRate, priorNegRate } = computeSentimentDriftForPeriods(recent, prior)
    if (!drifting) continue

    const pct = Math.round(recentNegRate * 100)
    signals.push({
      type: 'sentiment_drift',
      severity: severe ? 'critical' : 'warning',
      message: `${person.full_name}'s evidence has been ${pct}% negative in the last 30 days`,
      personId: person.id,
      personName: person.full_name,
      entityId: person.id,
      entityType: 'person',
      meta: {
        recentNegRate,
        priorNegRate,
        recentTotal: recent.total,
        priorTotal: prior.total,
        recentNegative: recent.negative,
        priorNegative: prior.negative,
      },
    })
  }

  return signals
}

// ── Stale Goal thresholds ─────────────────────────────────────────────────────
export const STALE_GOAL_INFO_DAYS     = 60
export const STALE_GOAL_WARNING_DAYS  = 90
export const STALE_GOAL_CRITICAL_DAYS = 120

/**
 * Compute stale career goal signals.
 *
 * Fires when a non-completed career goal has not been updated in:
 *   60+ days → info
 *   90+ days → warning
 *  120+ days → critical
 *
 * Goals with no activity since creation use `lastUpdatedAt` as the proxy.
 * Completed goals are excluded (filtered at query time).
 */
export function computeGoalSignals(
  goals: GoalStalenessRecord[],
  dismissedSet: Set<DismissKey>,
  today: Date
): Signal[] {
  const signals: Signal[] = []

  for (const goal of goals) {
    if (isDismissed(dismissedSet, 'stale_goal', goal.goalId)) continue

    const lastDate = new Date(goal.lastUpdatedAt + 'T00:00:00')
    const daysSince = daysBetween(lastDate, today)

    if (daysSince < STALE_GOAL_INFO_DAYS) continue

    const severity: SignalSeverity =
      daysSince >= STALE_GOAL_CRITICAL_DAYS ? 'critical'
      : daysSince >= STALE_GOAL_WARNING_DAYS ? 'warning'
      : 'info'

    signals.push({
      type: 'stale_goal',
      severity,
      message: `Goal "${goal.goalTitle}" has had no activity in ${daysSince} day${daysSince === 1 ? '' : 's'}`,
      entityId: goal.goalId,
      entityType: 'goal',
      meta: {
        daysSince,
        lastUpdatedAt: goal.lastUpdatedAt,
        timePeriod: goal.timePeriod,
        goalStatus: goal.status,
      },
    })
  }

  return signals
}

/**
 * Sort signals: critical first, warning second, info last.
 * Within same severity, new hire signals sort before non-new-hire signals.
 */
export function sortSignals(signals: Signal[]): Signal[] {
  const order: Record<string, number> = { critical: 0, warning: 1, info: 2 }
  return [...signals].sort((a, b) => {
    const severityDiff = order[a.severity] - order[b.severity]
    if (severityDiff !== 0) return severityDiff
    // New hire signals bubble up within same severity tier
    const aIsNewHire = a.meta?.isNewHire === true || a.type === 'new_hire_at_risk' ? 0 : 1
    const bIsNewHire = b.meta?.isNewHire === true || b.type === 'new_hire_at_risk' ? 0 : 1
    return aIsNewHire - bIsNewHire
  })
}
