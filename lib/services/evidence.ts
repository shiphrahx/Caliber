import { createClient } from '@/lib/supabase/client'

export type EvidenceCategory =
  | 'achievement'
  | 'feedback_given'
  | 'feedback_received'
  | 'concern'
  | 'growth'
  | 'delivery'
  | 'behaviour'
  | 'promotion_evidence'
  | 'general'

export type EvidenceSentiment = 'positive' | 'neutral' | 'negative'

export interface EvidenceEntry {
  id: string
  personId: string
  personName?: string | null
  category: EvidenceCategory
  title: string
  content?: string | null
  occurredAt: string
  meetingId?: string | null
  meetingTitle?: string | null
  taskId?: string | null
  taskTitle?: string | null
  sentiment?: EvidenceSentiment | null
  reviewPeriodStart?: string | null
  reviewPeriodEnd?: string | null
  includedInReview: boolean
  createdAt: string
  updatedAt: string
}

export interface ReviewCycle {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'active' | 'completed'
  createdAt: string
  updatedAt: string
}

export interface ReviewSummary {
  id: string
  personId: string
  reviewCycleId?: string | null
  periodStart: string
  periodEnd: string
  summaryText?: string | null
  managerNotes?: string | null
  createdAt: string
  updatedAt: string
}

type EvidenceRow = {
  id: string
  owning_user_id: string
  person_id: string
  category: EvidenceCategory
  title: string
  content: string | null
  occurred_at: string
  meeting_id: string | null
  task_id: string | null
  sentiment: EvidenceSentiment | null
  review_period_start: string | null
  review_period_end: string | null
  included_in_review: boolean
  created_at: string
  updated_at: string
  person?: { full_name: string } | null
  meeting?: { title: string } | null
  task?: { title: string } | null
}

type ReviewCycleRow = {
  id: string
  owning_user_id: string
  name: string
  start_date: string
  end_date: string
  status: 'active' | 'completed'
  created_at: string
  updated_at: string
}

type ReviewSummaryRow = {
  id: string
  owning_user_id: string
  person_id: string
  review_cycle_id: string | null
  period_start: string
  period_end: string
  summary_text: string | null
  manager_notes: string | null
  created_at: string
  updated_at: string
}

function rowToEvidence(row: EvidenceRow): EvidenceEntry {
  return {
    id: row.id,
    personId: row.person_id,
    personName: row.person?.full_name ?? null,
    category: row.category,
    title: row.title,
    content: row.content,
    occurredAt: row.occurred_at,
    meetingId: row.meeting_id,
    meetingTitle: row.meeting?.title ?? null,
    taskId: row.task_id,
    taskTitle: row.task?.title ?? null,
    sentiment: row.sentiment,
    reviewPeriodStart: row.review_period_start,
    reviewPeriodEnd: row.review_period_end,
    includedInReview: row.included_in_review,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToReviewCycle(row: ReviewCycleRow): ReviewCycle {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToReviewSummary(row: ReviewSummaryRow): ReviewSummary {
  return {
    id: row.id,
    personId: row.person_id,
    reviewCycleId: row.review_cycle_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    summaryText: row.summary_text,
    managerNotes: row.manager_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const EVIDENCE_SELECT = `
  *,
  person:people(full_name),
  meeting:meetings(title),
  task:tasks(title)
` as const

// ── Evidence Entries ──────────────────────────────────────────────────────────

export async function getEvidenceForPerson(personId: string): Promise<EvidenceEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('evidence_entries')
    .select(EVIDENCE_SELECT)
    .eq('person_id', personId)
    .order('occurred_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as EvidenceRow[]).map(rowToEvidence)
}

export async function getEvidenceForPersonInPeriod(
  personId: string,
  periodStart: string,
  periodEnd: string
): Promise<EvidenceEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('evidence_entries')
    .select(EVIDENCE_SELECT)
    .eq('person_id', personId)
    .gte('occurred_at', periodStart)
    .lte('occurred_at', periodEnd)
    .order('occurred_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as EvidenceRow[]).map(rowToEvidence)
}

export async function getAllEvidence(): Promise<EvidenceEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('evidence_entries')
    .select(EVIDENCE_SELECT)
    .order('occurred_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as EvidenceRow[]).map(rowToEvidence)
}

export async function createEvidence(
  entry: Omit<EvidenceEntry, 'id' | 'createdAt' | 'updatedAt' | 'personName' | 'meetingTitle' | 'taskTitle'>
): Promise<EvidenceEntry> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('evidence_entries')
    .insert({
      owning_user_id: user.id,
      person_id: entry.personId,
      category: entry.category,
      title: entry.title,
      content: entry.content ?? null,
      occurred_at: entry.occurredAt,
      meeting_id: entry.meetingId ?? null,
      task_id: entry.taskId ?? null,
      sentiment: entry.sentiment ?? null,
      review_period_start: entry.reviewPeriodStart ?? null,
      review_period_end: entry.reviewPeriodEnd ?? null,
      included_in_review: entry.includedInReview ?? true,
    })
    .select(EVIDENCE_SELECT)
    .single()

  if (error) throw new Error(error.message)
  return rowToEvidence(data as EvidenceRow)
}

export async function updateEvidence(
  id: string,
  updates: Partial<Omit<EvidenceEntry, 'id' | 'createdAt' | 'updatedAt' | 'personName' | 'meetingTitle' | 'taskTitle'>>
): Promise<EvidenceEntry> {
  const supabase = createClient()

  const dbUpdates: Record<string, unknown> = {}
  if (updates.category !== undefined) dbUpdates.category = updates.category
  if (updates.title !== undefined) dbUpdates.title = updates.title
  if (updates.content !== undefined) dbUpdates.content = updates.content
  if (updates.occurredAt !== undefined) dbUpdates.occurred_at = updates.occurredAt
  if (updates.sentiment !== undefined) dbUpdates.sentiment = updates.sentiment
  if (updates.includedInReview !== undefined) dbUpdates.included_in_review = updates.includedInReview
  if (updates.meetingId !== undefined) dbUpdates.meeting_id = updates.meetingId
  if (updates.taskId !== undefined) dbUpdates.task_id = updates.taskId
  if (updates.reviewPeriodStart !== undefined) dbUpdates.review_period_start = updates.reviewPeriodStart
  if (updates.reviewPeriodEnd !== undefined) dbUpdates.review_period_end = updates.reviewPeriodEnd

  const { data, error } = await supabase
    .from('evidence_entries')
    .update(dbUpdates)
    .eq('id', id)
    .select(EVIDENCE_SELECT)
    .single()

  if (error) throw new Error(error.message)
  return rowToEvidence(data as EvidenceRow)
}

export async function deleteEvidence(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('evidence_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Review Cycles ─────────────────────────────────────────────────────────────

export async function getReviewCycles(): Promise<ReviewCycle[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('review_cycles')
    .select('*')
    .order('start_date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as ReviewCycleRow[]).map(rowToReviewCycle)
}

export async function createReviewCycle(
  cycle: Omit<ReviewCycle, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ReviewCycle> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('review_cycles')
    .insert({
      owning_user_id: user.id,
      name: cycle.name,
      start_date: cycle.startDate,
      end_date: cycle.endDate,
      status: cycle.status ?? 'active',
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return rowToReviewCycle(data as ReviewCycleRow)
}

export async function updateReviewCycle(
  id: string,
  updates: Partial<Omit<ReviewCycle, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ReviewCycle> {
  const supabase = createClient()

  const dbUpdates: Record<string, unknown> = {}
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate
  if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate
  if (updates.status !== undefined) dbUpdates.status = updates.status

  const { data, error } = await supabase
    .from('review_cycles')
    .update(dbUpdates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return rowToReviewCycle(data as ReviewCycleRow)
}

export async function deleteReviewCycle(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('review_cycles').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Review Summaries ──────────────────────────────────────────────────────────

export async function getReviewSummary(
  personId: string,
  periodStart: string,
  periodEnd: string
): Promise<ReviewSummary | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('review_summaries')
    .select('*')
    .eq('person_id', personId)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? rowToReviewSummary(data as ReviewSummaryRow) : null
}

export async function upsertReviewSummary(
  summary: Omit<ReviewSummary, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ReviewSummary> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('review_summaries')
    .upsert({
      owning_user_id: user.id,
      person_id: summary.personId,
      review_cycle_id: summary.reviewCycleId ?? null,
      period_start: summary.periodStart,
      period_end: summary.periodEnd,
      summary_text: summary.summaryText ?? null,
      manager_notes: summary.managerNotes ?? null,
    }, { onConflict: 'owning_user_id,person_id,period_start,period_end' })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return rowToReviewSummary(data as ReviewSummaryRow)
}
