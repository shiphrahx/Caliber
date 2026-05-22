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
  | 'sentiment_drift'

export interface WeeklyReview {
  id: string
  userId: string
  weekStart: string
  status: WeeklyReviewStatus
  completedAt: string | null
  notes: string | null
  snapshot: ReviewSnapshot | null
  summaryMarkdown: string | null
  editedSummary: string | null
  summaryGeneratedAt: string | null
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
  summary_markdown: string | null
  edited_summary: string | null
  summary_generated_at: string | null
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
    summaryMarkdown: row.summary_markdown,
    editedSummary: row.edited_summary,
    summaryGeneratedAt: row.summary_generated_at,
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

/** Format a local Date as YYYY-MM-DD (no UTC shift) */
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Adds n days to an ISO date string, returns ISO date string */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return localDateStr(d)
}

/** Returns the Monday (ISO date string) of the week containing the given date */
export function getMondayOfWeek(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  // getDay() returns 0=Sunday, 1=Monday, ..., 6=Saturday
  // Calculate days to subtract to get to Monday (1)
  // If Monday (1), diff = 0; if Sunday (0), diff = -6; if Tuesday (2), diff = -1
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return localDateStr(d)
}

/** Returns the Sunday (ISO date string) of the week containing the given date */
export function getSundayOfWeek(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  // Calculate days to add to get to Sunday (0)
  // If Sunday (0), diff = 0; if Monday (1), diff = 6; if Saturday (6), diff = 1
  const diff = day === 0 ? 0 : 7 - day
  d.setDate(d.getDate() + diff)
  return localDateStr(d)
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

  const { error: upsertError } = await supabase
    .from('weekly_reviews')
    .upsert(
      { user_id: user.id, week_start: weekStart, status: 'in_progress' },
      { onConflict: 'user_id,week_start', ignoreDuplicates: true }
    )

  if (upsertError) throw new Error(upsertError.message)

  const { data, error } = await supabase
    .from('weekly_reviews')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
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

/** Save a freshly-generated summary (overwrites previous generated content) */
export async function saveSummaryMarkdown(weekStart: string, markdown: string): Promise<WeeklyReview> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('weekly_reviews')
    .upsert({
      user_id: user.id,
      week_start: weekStart,
      summary_markdown: markdown,
      summary_generated_at: new Date().toISOString(),
      // clear edited version when regenerating
      edited_summary: null,
    }, { onConflict: 'user_id,week_start' })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return rowToReview(data as WeeklyReviewRow)
}

/** Save user edits to the summary (separate from generated content) */
export async function saveEditedSummary(weekStart: string, editedContent: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('weekly_reviews')
    .upsert({
      user_id: user.id,
      week_start: weekStart,
      edited_summary: editedContent,
    }, { onConflict: 'user_id,week_start' })
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
