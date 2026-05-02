import { createClient } from '@/lib/supabase/client'

export type WeeklyReviewStatus = 'in_progress' | 'completed'

export type DismissedItemType =
  | 'overdue_task'
  | 'no_recent_1on1'
  | 'unresolved_action'
  | 'no_evidence'
  | 'upcoming_deadline'
  | 'stale_goal'
  | 'missing_notes'
  | 'overdue_follow_up'
  | 'ageing_follow_up'
  | 'surfaced_follow_up'
  | 'action_overload'

export interface WeeklyReview {
  id: string
  userId: string
  weekStart: string
  status: WeeklyReviewStatus
  completedAt: string | null
  notes: string | null
  snapshot: ReviewSnapshot | null
  createdAt: string
  updatedAt: string
}

export interface ReviewSnapshot {
  overdueTasks: number
  noRecent1on1: number
  unresolvedActions: number
  noEvidence: number
  upcomingDeadlines: number
  missingNotes: number
  totalSignals: number
  criticalSignals: number
  warningSignals: number
}

export interface DismissedItem {
  id: string
  userId: string
  weeklyReviewId: string
  itemType: DismissedItemType
  referenceId: string | null
  referenceType: string | null
  dismissedAt: string
  note: string | null
}

type WeeklyReviewRow = {
  id: string
  user_id: string
  week_start: string
  status: WeeklyReviewStatus
  completed_at: string | null
  notes: string | null
  snapshot: ReviewSnapshot | null
  created_at: string
  updated_at: string
}

type DismissedItemRow = {
  id: string
  user_id: string
  weekly_review_id: string
  item_type: DismissedItemType
  reference_id: string | null
  reference_type: string | null
  dismissed_at: string
  note: string | null
}

function rowToReview(row: WeeklyReviewRow): WeeklyReview {
  return {
    id: row.id,
    userId: row.user_id,
    weekStart: row.week_start,
    status: row.status,
    completedAt: row.completed_at,
    notes: row.notes,
    snapshot: row.snapshot,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToDismissed(row: DismissedItemRow): DismissedItem {
  return {
    id: row.id,
    userId: row.user_id,
    weeklyReviewId: row.weekly_review_id,
    itemType: row.item_type,
    referenceId: row.reference_id,
    referenceType: row.reference_type,
    dismissedAt: row.dismissed_at,
    note: row.note,
  }
}

/** Returns the Monday (ISO date string) of the week containing the given date */
export function getMondayOfWeek(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

/** Returns the Sunday (ISO date string) of the week containing the given date */
export function getSundayOfWeek(date: Date = new Date()): string {
  const monday = new Date(getMondayOfWeek(date))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return sunday.toISOString().split('T')[0]
}

/** Formats a week range as "28 Apr – 2 May 2026" */
export function formatWeekRange(weekStart: string): string {
  const monday = new Date(weekStart + 'T00:00:00')
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date, showYear: boolean) =>
    d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      ...(showYear ? { year: 'numeric' } : {}),
    })
  const sameYear = monday.getFullYear() === sunday.getFullYear()
  return `${fmt(monday, false)} – ${fmt(sunday, sameYear)}`
}

/** Get or create the weekly review row for the given week */
export async function getOrCreateWeeklyReview(weekStart: string): Promise<WeeklyReview> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('weekly_reviews')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .maybeSingle()

  if (existing) return rowToReview(existing as WeeklyReviewRow)

  const { data, error } = await supabase
    .from('weekly_reviews')
    .insert({ user_id: user.id, week_start: weekStart, status: 'in_progress' })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return rowToReview(data as WeeklyReviewRow)
}

/** Get a weekly review for a specific week (returns null if none exists) */
export async function getWeeklyReview(weekStart: string): Promise<WeeklyReview | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data } = await supabase
    .from('weekly_reviews')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .maybeSingle()

  return data ? rowToReview(data as WeeklyReviewRow) : null
}

/** Update review notes (auto-saves reflection) */
export async function updateReviewNotes(id: string, notes: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('weekly_reviews')
    .update({ notes })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** Complete a weekly review — saves snapshot and sets status */
export async function completeWeeklyReview(id: string, snapshot: ReviewSnapshot): Promise<WeeklyReview> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('weekly_reviews')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      snapshot,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return rowToReview(data as WeeklyReviewRow)
}

/** Reopen a completed weekly review */
export async function reopenWeeklyReview(id: string): Promise<WeeklyReview> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('weekly_reviews')
    .update({ status: 'in_progress', completed_at: null })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return rowToReview(data as WeeklyReviewRow)
}

/** Get dismissed items for a weekly review */
export async function getDismissedItems(weeklyReviewId: string): Promise<DismissedItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('review_dismissed_items')
    .select('*')
    .eq('weekly_review_id', weeklyReviewId)
  if (error) throw new Error(error.message)
  return (data as DismissedItemRow[]).map(rowToDismissed)
}

/** Dismiss a signal item for this week */
export async function dismissItem(
  weeklyReviewId: string,
  itemType: DismissedItemType,
  referenceId: string | null,
  referenceType: string | null,
  note?: string
): Promise<DismissedItem> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('review_dismissed_items')
    .insert({
      user_id: user.id,
      weekly_review_id: weeklyReviewId,
      item_type: itemType,
      reference_id: referenceId,
      reference_type: referenceType,
      note: note ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return rowToDismissed(data as DismissedItemRow)
}

/** Remove a dismissed item (un-dismiss) */
export async function undismissItem(dismissedItemId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('review_dismissed_items')
    .delete()
    .eq('id', dismissedItemId)
  if (error) throw new Error(error.message)
}

/** Get the most recent weekly review to check sidebar indicator state */
export async function getCurrentWeekReviewStatus(): Promise<{
  status: WeeklyReviewStatus | null
  weekStart: string
}> {
  const weekStart = getMondayOfWeek()
  const review = await getWeeklyReview(weekStart)
  return { status: review?.status ?? null, weekStart }
}
