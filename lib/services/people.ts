/**
 * People Service
 * Handles all database operations for people
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type PersonRow = Database['public']['Tables']['people']['Row']
type PersonInsert = Database['public']['Tables']['people']['Insert']
type PersonUpdate = Database['public']['Tables']['people']['Update']
type MembershipInsert = Database['public']['Tables']['team_memberships']['Insert']

export interface Person {
  id: string
  name: string
  role: string | null
  level: string | null
  startDate: string | null
  notes: string | null
  status: 'active' | 'inactive'
  teams: string[]
  createdAt: string
}

function rowToPerson(person: PersonRow, teams: string[]): Person {
  return {
    id: person.id,
    name: person.full_name,
    role: person.role,
    level: person.level,
    startDate: person.start_date,
    notes: person.notes,
    status: person.status,
    teams,
    createdAt: person.created_at,
  }
}

/**
 * Get all people for the current user
 */
export async function getPeople(): Promise<Person[]> {
  const supabase = createClient()

  const [{ data: people, error }, { data: memberships, error: membershipsError }] = await Promise.all([
    supabase.from('people').select('*').order('created_at', { ascending: false }),
    supabase.from('team_memberships').select('person_id, teams(name)'),
  ])

  if (error) throw error
  if (membershipsError) throw membershipsError

  const teamsByPerson: Record<string, string[]> = {}
  for (const m of memberships ?? []) {
    const membership = m as typeof m & { teams: { name: string } | null }
    const name = membership.teams?.name
    if (!name) continue
    if (!teamsByPerson[m.person_id]) teamsByPerson[m.person_id] = []
    teamsByPerson[m.person_id].push(name)
  }

  return (people ?? []).map((person) => rowToPerson(person, teamsByPerson[person.id] ?? []))
}

/**
 * Get a single person by ID
 */
export async function getPersonById(id: string): Promise<Person | null> {
  const supabase = createClient()

  const [{ data: person, error }, { data: memberships }] = await Promise.all([
    supabase.from('people').select('*').eq('id', id).single(),
    supabase.from('team_memberships').select('teams(name)').eq('person_id', id),
  ])

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  if (!person) return null

  const teams = (memberships ?? [])
    .map((m) => (m as typeof m & { teams: { name: string } | null }).teams?.name)
    .filter((n): n is string => Boolean(n))

  return rowToPerson(person, teams)
}

/**
 * Create a new person, including team memberships
 */
export async function createPerson(person: Omit<Person, 'id' | 'createdAt'> & { teams?: string[] }): Promise<Person> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const insert: PersonInsert = {
    full_name: person.name,
    role: person.role || null,
    level: person.level || null,
    start_date: person.startDate || null,
    notes: person.notes || null,
    status: person.status || 'active',
    owning_user_id: user.id,
  }

  const { data, error } = await supabase
    .from('people')
    .insert(insert)
    .select()
    .single()

  if (error) throw error

  const teamNames = person.teams ?? []

  if (teamNames.length > 0) {
    const { data: allTeams } = await supabase.from('teams').select('id, name')
    const teamNameToId = Object.fromEntries((allTeams ?? []).map((t) => [t.name, t.id]))
    const teamIds = teamNames.map((name) => teamNameToId[name]).filter(Boolean) as string[]

    if (teamIds.length > 0) {
      const membershipInserts: MembershipInsert[] = teamIds.map((team_id) => ({
        person_id: data.id,
        team_id,
      }))
      const { error: memberError } = await supabase
        .from('team_memberships')
        .insert(membershipInserts)

      if (memberError) {
        await supabase.from('people').delete().eq('id', data.id)
        throw memberError
      }
    }
  }

  return rowToPerson(data, teamNames)
}

/**
 * Update an existing person, including syncing team memberships
 */
export async function updatePerson(id: string, updates: Partial<Person>): Promise<Person> {
  const supabase = createClient()

  const patch: PersonUpdate = {}
  if (updates.name !== undefined) patch.full_name = updates.name
  if (updates.role !== undefined) patch.role = updates.role || null
  if (updates.level !== undefined) patch.level = updates.level || null
  if (updates.startDate !== undefined) patch.start_date = updates.startDate || null
  if (updates.notes !== undefined) patch.notes = updates.notes || null
  if (updates.status !== undefined) patch.status = updates.status

  const { data, error } = await supabase
    .from('people')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  if (updates.teams !== undefined) {
    const { data: allTeams } = await supabase.from('teams').select('id, name')
    const teamNameToId = Object.fromEntries((allTeams ?? []).map((t) => [t.name, t.id]))
    const desiredTeamIds = updates.teams.map((name) => teamNameToId[name]).filter(Boolean) as string[]

    const { data: currentMemberships } = await supabase
      .from('team_memberships')
      .select('team_id')
      .eq('person_id', id)
    const currentTeamIds = (currentMemberships ?? []).map((m) => m.team_id)

    const toAdd = desiredTeamIds.filter((tid) => !currentTeamIds.includes(tid))
    if (toAdd.length > 0) {
      await supabase
        .from('team_memberships')
        .insert(toAdd.map((team_id) => ({ person_id: id, team_id })))
    }

    const toRemove = currentTeamIds.filter((tid) => !desiredTeamIds.includes(tid))
    if (toRemove.length > 0) {
      await supabase
        .from('team_memberships')
        .delete()
        .eq('person_id', id)
        .in('team_id', toRemove)
    }
  }

  const { data: memberships } = await supabase
    .from('team_memberships')
    .select('teams(name)')
    .eq('person_id', id)

  const teams = (memberships ?? [])
    .map((m) => (m as typeof m & { teams: { name: string } | null }).teams?.name)
    .filter((n): n is string => Boolean(n))

  return rowToPerson(data, teams)
}

/**
 * Delete a person
 */
export async function deletePerson(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('people')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Toggle person status (active/inactive)
 */
export async function togglePersonStatus(id: string, currentStatus: 'active' | 'inactive'): Promise<Person> {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
  return updatePerson(id, { status: newStatus })
}

/**
 * Add person to team
 */
export async function addPersonToTeam(personId: string, teamId: string): Promise<void> {
  const supabase = createClient()

  const insert: MembershipInsert = { person_id: personId, team_id: teamId }
  const { error } = await supabase.from('team_memberships').insert(insert)

  if (error) throw error
}

/**
 * Remove person from team
 */
export async function removePersonFromTeam(personId: string, teamId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('team_memberships')
    .delete()
    .eq('person_id', personId)
    .eq('team_id', teamId)

  if (error) throw error
}
