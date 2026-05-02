import { createClient } from '@/lib/supabase/client'

export type FollowUpStatus = 'open' | 'completed' | 'cancelled'
export type FollowUpSourceType = 'meeting' | 'manual' | 'task'

export interface FollowUp {
  id: string
  userId: string
  personId: string
  personName?: string | null
  title: string
  description: string | null
  sourceType: FollowUpSourceType | null
  sourceId: string | null
  sourceName?: string | null
  status: FollowUpStatus
  dueDate: string | null
  createdAt: string
  completedAt: string | null
  cancelledAt: string | null
  lastSurfacedAt: string | null
  timesSurfaced: number
  updatedAt: string
}

type FollowUpRow = {
  id: string
  user_id: string
  person_id: string
  title: string
  description: string | null
  source_type: FollowUpSourceType | null
  source_id: string | null
  status: FollowUpStatus
  due_date: string | null
  created_at: string
  completed_at: string | null
  cancelled_at: string | null
  last_surfaced_at: string | null
  times_surfaced: number
  updated_at: string
  person?: { full_name: string } | null
  meeting?: { title: string } | null
}

function rowToFollowUp(row: FollowUpRow): FollowUp {
  return {
    id: row.id,
    userId: row.user_id,
    personId: row.person_id,
    personName: row.person?.full_name ?? null,
    title: row.title,
    description: row.description,
    sourceType: row.source_type,
    sourceId: row.source_id,
    sourceName: row.meeting?.title ?? null,
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    lastSurfacedAt: row.last_surfaced_at,
    timesSurfaced: row.times_surfaced,
    updatedAt: row.updated_at,
  }
}

const FOLLOW_UP_SELECT = `
  *,
  person:people(full_name),
  meeting:meetings(title)
` as const

export async function getFollowUpsForPerson(personId: string): Promise<FollowUp[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('follow_ups')
    .select(FOLLOW_UP_SELECT)
    .eq('person_id', personId)
    .order('status', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as FollowUpRow[]).map(rowToFollowUp)
}

export async function getAllFollowUps(): Promise<FollowUp[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('follow_ups')
    .select(FOLLOW_UP_SELECT)
    .order('status', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as FollowUpRow[]).map(rowToFollowUp)
}

export async function getOpenFollowUps(): Promise<FollowUp[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('follow_ups')
    .select(FOLLOW_UP_SELECT)
    .eq('status', 'open')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as FollowUpRow[]).map(rowToFollowUp)
}

export async function createFollowUp(
  input: Omit<FollowUp, 'id' | 'userId' | 'personName' | 'sourceName' | 'createdAt' | 'completedAt' | 'cancelledAt' | 'lastSurfacedAt' | 'timesSurfaced' | 'updatedAt'>
): Promise<FollowUp> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('follow_ups')
    .insert({
      user_id: user.id,
      person_id: input.personId,
      title: input.title,
      description: input.description ?? null,
      source_type: input.sourceType ?? null,
      source_id: input.sourceId ?? null,
      status: input.status ?? 'open',
      due_date: input.dueDate ?? null,
    })
    .select(FOLLOW_UP_SELECT)
    .single()
  if (error) throw new Error(error.message)
  return rowToFollowUp(data as FollowUpRow)
}

export async function updateFollowUp(
  id: string,
  updates: Partial<Pick<FollowUp, 'title' | 'description' | 'dueDate' | 'status'>>
): Promise<FollowUp> {
  const supabase = createClient()
  const dbUpdates: Record<string, unknown> = {}
  if (updates.title !== undefined) dbUpdates.title = updates.title
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate
  if (updates.status !== undefined) {
    dbUpdates.status = updates.status
    if (updates.status === 'completed') dbUpdates.completed_at = new Date().toISOString()
    if (updates.status === 'cancelled') dbUpdates.cancelled_at = new Date().toISOString()
  }
  const { data, error } = await supabase
    .from('follow_ups')
    .update(dbUpdates)
    .eq('id', id)
    .select(FOLLOW_UP_SELECT)
    .single()
  if (error) throw new Error(error.message)
  return rowToFollowUp(data as FollowUpRow)
}

export async function completeFollowUp(id: string): Promise<FollowUp> {
  return updateFollowUp(id, { status: 'completed' })
}

export async function cancelFollowUp(id: string): Promise<FollowUp> {
  return updateFollowUp(id, { status: 'cancelled' })
}

export async function deleteFollowUp(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('follow_ups').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Mark a follow-up as surfaced — increments counter, updates last_surfaced_at */
export async function markFollowUpSurfaced(id: string, currentCount: number): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('follow_ups')
    .update({
      last_surfaced_at: new Date().toISOString(),
      times_surfaced: currentCount + 1,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** Bulk mark multiple follow-ups as surfaced */
export async function markFollowUpsSurfaced(followUps: Pick<FollowUp, 'id' | 'timesSurfaced'>[]): Promise<void> {
  await Promise.all(followUps.map(f => markFollowUpSurfaced(f.id, f.timesSurfaced)))
}
