'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSundayOfWeek } from '@/lib/services/weekly-review'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SummaryTask {
  id: string
  title: string
  priority: string
  status: string
  dueDate: string | null
  completionDate: string | null
  category: string | null
  daysOverdue?: number
}

export interface SummaryMeeting {
  id: string
  title: string
  type: string
  date: string
  personId: string | null
  personName: string | null
  hasNotes: boolean
  actionItemCount: number
}

export interface SummaryPerson {
  id: string
  name: string
  lastMeetingDate: string | null
  seenThisWeek: boolean
}

export interface SummaryEvidence {
  id: string
  personId: string | null
  personName: string | null
  category: string | null
  occurredAt: string
}

export interface SummaryFollowUp {
  id: string
  title: string
  personId: string
  personName: string | null
  completedAt: string | null
  dueDate: string | null
  status: string
}

export interface WeeklySummaryData {
  weekStart: string
  weekEnd: string
  completedTasks: SummaryTask[]
  inProgressTasks: SummaryTask[]
  overdueTasks: SummaryTask[]
  blockedTasks: SummaryTask[]
  nextWeekTasks: SummaryTask[]
  meetings: SummaryMeeting[]
  activePeople: SummaryPerson[]
  evidenceThisWeek: SummaryEvidence[]
  completedFollowUps: SummaryFollowUp[]
  openFollowUps: SummaryFollowUp[]
  reflectionNotes: string | null
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWeeklySummaryData(weekStart: string): {
  data: WeeklySummaryData | null
  loading: boolean
  error: string | null
  refetch: () => void
} {
  const [data, setData] = useState<WeeklySummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const weekEnd = getSundayOfWeek(new Date(weekStart + 'T00:00:00'))
  // Next week Monday/Sunday
  const nextWeekStart = new Date(weekStart + 'T00:00:00')
  nextWeekStart.setDate(nextWeekStart.getDate() + 7)
  const nextWeekEnd = new Date(nextWeekStart)
  nextWeekEnd.setDate(nextWeekStart.getDate() + 6)
  const nextWeekStartStr = nextWeekStart.toISOString().split('T')[0]
  const nextWeekEndStr = nextWeekEnd.toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()

      const [
        tasksRes,
        meetingsRes,
        peopleRes,
        evidenceRes,
        followUpsRes,
        reviewRes,
      ] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, priority, status, due_date, completion_date, source')
          .order('priority', { ascending: false }),

        supabase
          .from('meetings')
          .select('id, title, meeting_type, meeting_date, person_id, notes, action_items, people:person_id(full_name)')
          .gte('meeting_date', weekStart)
          .lte('meeting_date', weekEnd)
          .order('meeting_date', { ascending: true }),

        supabase
          .from('people')
          .select('id, full_name')
          .eq('status', 'active'),

        supabase
          .from('evidence_entries')
          .select('id, person_id, category, occurred_at, people:person_id(full_name)')
          .gte('occurred_at', weekStart)
          .lte('occurred_at', weekEnd),

        supabase
          .from('follow_ups')
          .select('id, title, person_id, status, due_date, completed_at, people:person_id(full_name)')
          .order('created_at', { ascending: false }),

        supabase
          .from('weekly_reviews')
          .select('notes')
          .eq('week_start', weekStart)
          .maybeSingle(),
      ])

      if (tasksRes.error) throw new Error(tasksRes.error.message)
      if (meetingsRes.error) throw new Error(meetingsRes.error.message)
      if (peopleRes.error) throw new Error(peopleRes.error.message)

      const tasks = (tasksRes.data ?? []) as Array<{
        id: string; title: string; priority: string; status: string
        due_date: string | null; completion_date: string | null; source: string | null
      }>

      const meetings = (meetingsRes.data ?? []) as unknown as Array<{
        id: string; title: string; meeting_type: string; meeting_date: string
        person_id: string | null; notes: string | null; action_items: string | null
        people: { full_name: string } | null
      }>

      const priorityOrder: Record<string, number> = { very_high: 4, high: 3, medium: 2, low: 1 }
      const uiPriority = (p: string) => {
        const map: Record<string, string> = { very_high: 'Very High', high: 'High', medium: 'Medium', low: 'Low' }
        return map[p] ?? p
      }

      // Tasks completed this week
      const completedTasks: SummaryTask[] = tasks
        .filter(t => t.status === 'completed' && t.completion_date != null && t.completion_date >= weekStart && t.completion_date <= weekEnd)
        .sort((a, b) => (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0))
        .map(t => ({ id: t.id, title: t.title, priority: uiPriority(t.priority), status: 'Done', dueDate: t.due_date, completionDate: t.completion_date, category: t.source }))

      // In-progress tasks
      const inProgressTasks: SummaryTask[] = tasks
        .filter(t => t.status === 'in_progress')
        .map(t => ({ id: t.id, title: t.title, priority: uiPriority(t.priority), status: 'In progress', dueDate: t.due_date, completionDate: null, category: t.source }))

      // Overdue tasks (open, due before today)
      const overdueTasks: SummaryTask[] = tasks
        .filter(t => t.status !== 'completed' && t.status !== 'blocked' && t.due_date && t.due_date < today)
        .map(t => {
          const daysOverdue = Math.floor((new Date(today).getTime() - new Date(t.due_date!).getTime()) / 86400000)
          return { id: t.id, title: t.title, priority: uiPriority(t.priority), status: t.status, dueDate: t.due_date, completionDate: null, category: t.source, daysOverdue }
        })

      // Blocked tasks
      const blockedTasks: SummaryTask[] = tasks
        .filter(t => t.status === 'blocked')
        .map(t => ({ id: t.id, title: t.title, priority: uiPriority(t.priority), status: 'Blocked', dueDate: t.due_date, completionDate: null, category: t.source }))

      // Next week tasks (open, due in next week window)
      const nextWeekTasks: SummaryTask[] = tasks
        .filter(t => t.status !== 'completed' && t.due_date && t.due_date >= nextWeekStartStr && t.due_date <= nextWeekEndStr)
        .map(t => ({ id: t.id, title: t.title, priority: uiPriority(t.priority), status: t.status, dueDate: t.due_date, completionDate: null, category: t.source }))

      // Meetings this week
      const summaryMeetings: SummaryMeeting[] = meetings.map(m => {
        const actionCount = m.action_items
          ? (m.action_items.match(/<li>/g) ?? []).length + (m.action_items.match(/^- /gm) ?? []).length
          : 0
        return {
          id: m.id,
          title: m.title,
          type: m.meeting_type,
          date: m.meeting_date,
          personId: m.person_id,
          personName: m.people?.full_name ?? null,
          hasNotes: !!(m.notes && m.notes.trim().length > 0),
          actionItemCount: actionCount,
        }
      })

      // People seen this week (in any meeting)
      const seenPersonIds = new Set(meetings.filter(m => m.person_id).map(m => m.person_id!))
      const activePeople: SummaryPerson[] = ((peopleRes.data ?? []) as Array<{ id: string; full_name: string }>)
        .map(p => ({
          id: p.id,
          name: p.full_name,
          lastMeetingDate: null,
          seenThisWeek: seenPersonIds.has(p.id),
        }))

      // Evidence this week
      const evidenceThisWeek: SummaryEvidence[] = ((evidenceRes.data ?? []) as unknown as Array<{
        id: string; person_id: string | null; category: string | null; occurred_at: string
        people: { full_name: string } | null
      }>).map(e => ({
        id: e.id,
        personId: e.person_id,
        personName: e.people?.full_name ?? null,
        category: e.category,
        occurredAt: e.occurred_at,
      }))

      // Follow-ups
      const allFollowUps = ((followUpsRes.data ?? []) as unknown as Array<{
        id: string; title: string; person_id: string; status: string
        due_date: string | null; completed_at: string | null
        people: { full_name: string } | null
      }>)

      const completedFollowUps: SummaryFollowUp[] = allFollowUps
        .filter(f => f.status === 'completed' && f.completed_at && f.completed_at >= weekStart + 'T00:00:00')
        .map(f => ({ id: f.id, title: f.title, personId: f.person_id, personName: f.people?.full_name ?? null, completedAt: f.completed_at, dueDate: f.due_date, status: 'completed' }))

      const openFollowUps: SummaryFollowUp[] = allFollowUps
        .filter(f => f.status === 'open')
        .map(f => ({ id: f.id, title: f.title, personId: f.person_id, personName: f.people?.full_name ?? null, completedAt: null, dueDate: f.due_date, status: 'open' }))

      setData({
        weekStart,
        weekEnd,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        blockedTasks,
        nextWeekTasks,
        meetings: summaryMeetings,
        activePeople,
        evidenceThisWeek,
        completedFollowUps,
        openFollowUps,
        reflectionNotes: (reviewRes.data as { notes: string | null } | null)?.notes ?? null,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load summary data')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
