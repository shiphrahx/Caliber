/**
 * Meetings Service
 * Handles all database operations for meetings
 */

import { createClient } from '@/lib/supabase/client'

export type MeetingType = '1:1' | 'Team Sync' | 'Retro' | 'Planning' | 'Review' | 'Standup' | 'Other'
export type RecurrenceType = 'none' | 'weekly' | 'fortnightly' | 'monthly' | 'custom'

export interface Meeting {
  id: string
  title: string
  meetingType: MeetingType
  meetingDate: string
  nextMeetingDate?: string | null
  recurrence?: RecurrenceType | null
  actionItems?: string | null
  notes?: string | null
  personId?: string | null
  personName?: string | null
  teamId?: string | null
  teamName?: string | null
  attendees: string[]
  createdAt: string
  updatedAt: string
}

type MeetingRow = {
  id: string
  title: string
  meeting_type: string
  meeting_date: string
  next_meeting_date: string | null
  recurrence: string | null
  action_items: string | null
  notes: string | null
  person_id: string | null
  team_id: string | null
  owning_user_id: string
  created_at: string
  updated_at: string
  person: { full_name: string } | null
  team: { name: string } | null
}

function rowToMeeting(meeting: MeetingRow): Meeting {
  const attendees =
    meeting.meeting_type === '1:1' && meeting.person?.full_name
      ? [meeting.person.full_name]
      : meeting.meeting_type !== 'Other' && meeting.team?.name
      ? [meeting.team.name]
      : []

  return {
    id: meeting.id,
    title: meeting.title,
    meetingType: meeting.meeting_type as MeetingType,
    meetingDate: meeting.meeting_date,
    nextMeetingDate: meeting.next_meeting_date,
    recurrence: meeting.recurrence as RecurrenceType | null,
    actionItems: meeting.action_items,
    notes: meeting.notes,
    personId: meeting.person_id,
    personName: meeting.person?.full_name ?? null,
    teamId: meeting.team_id,
    teamName: meeting.team?.name ?? null,
    attendees,
    createdAt: meeting.created_at,
    updatedAt: meeting.updated_at,
  }
}

const MEETING_SELECT = `
  *,
  person:people(full_name),
  team:teams(name)
` as const

/**
 * Get all meetings for the current user
 */
export async function getMeetings(): Promise<Meeting[]> {
  const supabase = createClient()

  const { data: meetings, error } = await supabase
    .from('meetings')
    .select(MEETING_SELECT)
    .order('meeting_date', { ascending: false })

  if (error) throw error

  return (meetings ?? []).map((m) => rowToMeeting(m as unknown as MeetingRow))
}

/**
 * Create a new meeting
 */
export async function createMeeting(
  meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt' | 'personName' | 'teamName' | 'attendees'>
): Promise<Meeting> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('meetings')
    .insert({
      title: meeting.title,
      meeting_type: meeting.meetingType,
      meeting_date: meeting.meetingDate,
      next_meeting_date: meeting.nextMeetingDate || null,
      recurrence: meeting.recurrence || null,
      action_items: meeting.actionItems || null,
      notes: meeting.notes || null,
      person_id: meeting.personId || null,
      team_id: meeting.teamId || null,
      owning_user_id: user.id,
    })
    .select(MEETING_SELECT)
    .single()

  if (error) throw error

  return rowToMeeting(data as unknown as MeetingRow)
}

/**
 * Update an existing meeting
 */
export async function updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting> {
  const supabase = createClient()

  const dbUpdates: Record<string, unknown> = {}
  if (updates.title !== undefined) dbUpdates.title = updates.title
  if (updates.meetingType !== undefined) dbUpdates.meeting_type = updates.meetingType
  if (updates.meetingDate !== undefined) dbUpdates.meeting_date = updates.meetingDate
  if (updates.nextMeetingDate !== undefined) dbUpdates.next_meeting_date = updates.nextMeetingDate || null
  if (updates.recurrence !== undefined) dbUpdates.recurrence = updates.recurrence || null
  if (updates.actionItems !== undefined) dbUpdates.action_items = updates.actionItems || null
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null
  if (updates.personId !== undefined) dbUpdates.person_id = updates.personId || null
  if (updates.teamId !== undefined) dbUpdates.team_id = updates.teamId || null

  const { data, error } = await supabase
    .from('meetings')
    .update(dbUpdates)
    .eq('id', id)
    .select(MEETING_SELECT)
    .single()

  if (error) throw error

  return rowToMeeting(data as unknown as MeetingRow)
}

/**
 * Delete a meeting
 */
export async function deleteMeeting(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('meetings')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Get meetings for a specific person (1:1s)
 */
export async function getMeetingsForPerson(personId: string): Promise<Meeting[]> {
  const supabase = createClient()

  const { data: meetings, error } = await supabase
    .from('meetings')
    .select(MEETING_SELECT)
    .eq('person_id', personId)
    .order('meeting_date', { ascending: false })

  if (error) throw error

  return (meetings ?? []).map((m) => rowToMeeting(m as unknown as MeetingRow))
}

/**
 * Get meetings for a specific team
 */
export async function getMeetingsForTeam(teamId: string): Promise<Meeting[]> {
  const supabase = createClient()

  const { data: meetings, error } = await supabase
    .from('meetings')
    .select(MEETING_SELECT)
    .eq('team_id', teamId)
    .order('meeting_date', { ascending: false })

  if (error) throw error

  return (meetings ?? []).map((m) => rowToMeeting(m as unknown as MeetingRow))
}

/**
 * Get upcoming 1:1 meetings for the current user (today + tomorrow).
 * Returns meetings sorted by date ascending.
 */
export async function getUpcoming1on1s(
  today: string = new Date().toISOString().split('T')[0]
): Promise<Meeting[]> {
  const supabase = createClient()

  const tomorrow = new Date(today + 'T00:00:00')
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { data: meetings, error } = await supabase
    .from('meetings')
    .select(MEETING_SELECT)
    .eq('meeting_type', '1:1')
    .gte('meeting_date', today)
    .lte('meeting_date', tomorrowStr)
    .not('person_id', 'is', null)
    .order('meeting_date', { ascending: true })

  if (error) throw error

  return (meetings ?? []).map((m) => rowToMeeting(m as unknown as MeetingRow))
}
