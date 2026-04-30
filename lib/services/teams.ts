/**
 * Teams Service
 * Handles all database operations for teams
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type TeamRow = Database['public']['Tables']['teams']['Row']
type TeamInsert = Database['public']['Tables']['teams']['Insert']
type TeamUpdate = Database['public']['Tables']['teams']['Update']
type MembershipRow = Database['public']['Tables']['team_memberships']['Row']

export interface Team {
  id: string
  name: string
  description: string | null
  status: 'active' | 'inactive'
  memberCount: number
  createdAt: string
  memberIds?: string[]
  notes?: string
  documentationUrl?: string
}

function rowToTeam(team: TeamRow, memberIds: string[]): Team {
  return {
    id: team.id,
    name: team.name,
    description: team.description ?? null,
    status: team.status,
    memberCount: memberIds.length,
    memberIds,
    createdAt: team.created_at,
    notes: team.notes ?? '',
    documentationUrl: team.documentation_url ?? '',
  }
}

/**
 * Get all teams for the current user
 */
export async function getTeams(): Promise<Team[]> {
  const supabase = createClient()

  const [{ data: teams, error }, { data: memberships }] = await Promise.all([
    supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('team_memberships')
      .select('team_id, person_id'),
  ])

  if (error) throw error

  const membersByTeam: Record<string, string[]> = {}
  for (const m of (memberships ?? []) as Pick<MembershipRow, 'team_id' | 'person_id'>[]) {
    if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = []
    membersByTeam[m.team_id].push(m.person_id)
  }

  return (teams ?? []).map((team) => rowToTeam(team, membersByTeam[team.id] ?? []))
}

/**
 * Create a new team
 */
export async function createTeam(team: Omit<Team, 'id' | 'memberCount' | 'createdAt'>): Promise<Team> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const insert: TeamInsert = {
    name: team.name,
    description: team.description || null,
    status: team.status || 'active',
    notes: team.notes || null,
    documentation_url: team.documentationUrl || null,
    owning_user_id: user.id,
  }

  const { data, error } = await supabase
    .from('teams')
    .insert(insert)
    .select()
    .single()

  if (error) throw error

  const memberIds = team.memberIds ?? []

  if (memberIds.length > 0) {
    const { error: memberError } = await supabase
      .from('team_memberships')
      .insert(memberIds.map((person_id) => ({ team_id: data.id, person_id })))
    if (memberError) {
      await supabase.from('teams').delete().eq('id', data.id)
      throw memberError
    }
  }

  return rowToTeam(data, memberIds)
}

/**
 * Update an existing team
 */
export async function updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
  const supabase = createClient()

  const patch: TeamUpdate = {
    name: updates.name,
    description: updates.description ?? null,
    status: updates.status,
    notes: updates.notes ?? null,
    documentation_url: updates.documentationUrl ?? null,
  }

  const { data, error } = await supabase
    .from('teams')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  if (updates.memberIds !== undefined) {
    const desiredIds = updates.memberIds

    const { data: currentMemberships } = await supabase
      .from('team_memberships')
      .select('person_id')
      .eq('team_id', id)
    const currentIds = (currentMemberships ?? []).map((m) => m.person_id)

    const toAdd = desiredIds.filter((pid) => !currentIds.includes(pid))
    if (toAdd.length > 0) {
      await supabase
        .from('team_memberships')
        .insert(toAdd.map((person_id) => ({ team_id: id, person_id })))
    }

    const toRemove = currentIds.filter((pid) => !desiredIds.includes(pid))
    if (toRemove.length > 0) {
      await supabase
        .from('team_memberships')
        .delete()
        .eq('team_id', id)
        .in('person_id', toRemove)
    }
  }

  const { data: finalMemberships } = await supabase
    .from('team_memberships')
    .select('person_id')
    .eq('team_id', id)
  const memberIds = (finalMemberships ?? []).map((m) => m.person_id)

  return rowToTeam(data, memberIds)
}

/**
 * Delete a team
 */
export async function deleteTeam(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Toggle team status (active/inactive)
 */
export async function toggleTeamStatus(id: string, currentStatus: 'active' | 'inactive'): Promise<Team> {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
  return updateTeam(id, { status: newStatus })
}
