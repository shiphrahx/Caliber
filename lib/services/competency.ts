import { createClient } from '@/lib/supabase/client'

// ─── Level ordering ───────────────────────────────────────────────────────────

export const LEVELS = ['Junior', 'Mid', 'Senior', 'Staff', 'Principal'] as const
export type Level = typeof LEVELS[number]

export function levelToScore(level: string): number {
  const idx = LEVELS.indexOf(level as Level)
  return idx === -1 ? 1 : idx + 1
}

export function scoreToLevel(score: number): Level {
  return LEVELS[Math.max(0, Math.min(4, score - 1))]
}

export function nextLevel(level: string): Level | null {
  const idx = LEVELS.indexOf(level as Level)
  return idx === -1 || idx >= LEVELS.length - 1 ? null : LEVELS[idx + 1]
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompetencyFramework {
  id: string
  name: string
  description?: string | null
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface CompetencyArea {
  id: string
  frameworkId: string
  name: string
  description?: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CompetencyLevel {
  id: string
  areaId: string
  level: string
  expectations: string
  createdAt: string
  updatedAt: string
}

export interface CompetencyAssessment {
  id: string
  personId: string
  areaId: string
  areaName?: string
  assessedLevel: string
  score: number
  notes?: string | null
  assessedAt: string
  evidenceIds: string[]
  createdAt: string
  updatedAt: string
}

export interface GrowthPlan {
  id: string
  personId: string
  areaId?: string | null
  areaName?: string | null
  title: string
  description?: string | null
  targetLevel?: string | null
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  targetDate?: string | null
  progressNotes?: string | null
  createdAt: string
  updatedAt: string
}

// ─── Row types ────────────────────────────────────────────────────────────────

type FrameworkRow = {
  id: string; owning_user_id: string; name: string; description: string | null
  status: 'active' | 'archived'; created_at: string; updated_at: string
}

type AreaRow = {
  id: string; owning_user_id: string; framework_id: string; name: string
  description: string | null; sort_order: number; created_at: string; updated_at: string
}

type LevelRow = {
  id: string; owning_user_id: string; area_id: string; level: string
  expectations: string; created_at: string; updated_at: string
}

type AssessmentRow = {
  id: string; owning_user_id: string; person_id: string; area_id: string
  assessed_level: string; score: number; notes: string | null
  assessed_at: string; evidence_ids: string[]; created_at: string; updated_at: string
  competency_areas?: { name: string } | null
}

type GrowthPlanRow = {
  id: string; owning_user_id: string; person_id: string; area_id: string | null
  title: string; description: string | null; target_level: string | null
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  target_date: string | null; progress_notes: string | null
  created_at: string; updated_at: string
  competency_areas?: { name: string } | null
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function rowToFramework(r: FrameworkRow): CompetencyFramework {
  return { id: r.id, name: r.name, description: r.description, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at }
}

function rowToArea(r: AreaRow): CompetencyArea {
  return { id: r.id, frameworkId: r.framework_id, name: r.name, description: r.description, sortOrder: r.sort_order, createdAt: r.created_at, updatedAt: r.updated_at }
}

function rowToLevel(r: LevelRow): CompetencyLevel {
  return { id: r.id, areaId: r.area_id, level: r.level, expectations: r.expectations, createdAt: r.created_at, updatedAt: r.updated_at }
}

function rowToAssessment(r: AssessmentRow): CompetencyAssessment {
  return {
    id: r.id, personId: r.person_id, areaId: r.area_id,
    areaName: r.competency_areas?.name,
    assessedLevel: r.assessed_level, score: r.score, notes: r.notes,
    assessedAt: r.assessed_at, evidenceIds: r.evidence_ids ?? [],
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

function rowToGrowthPlan(r: GrowthPlanRow): GrowthPlan {
  return {
    id: r.id, personId: r.person_id, areaId: r.area_id,
    areaName: r.competency_areas?.name ?? null,
    title: r.title, description: r.description, targetLevel: r.target_level,
    status: r.status, targetDate: r.target_date, progressNotes: r.progress_notes,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

// ─── Framework CRUD ───────────────────────────────────────────────────────────

export async function getActiveFramework(): Promise<CompetencyFramework | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('competency_frameworks')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? rowToFramework(data as FrameworkRow) : null
}

export async function getFrameworks(): Promise<CompetencyFramework[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('competency_frameworks')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(r => rowToFramework(r as FrameworkRow))
}

export async function createFramework(input: { name: string; description?: string }): Promise<CompetencyFramework> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('competency_frameworks')
    .insert({ name: input.name, description: input.description ?? null, owning_user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return rowToFramework(data as FrameworkRow)
}

export async function updateFramework(id: string, input: { name?: string; description?: string; status?: 'active' | 'archived' }): Promise<CompetencyFramework> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('competency_frameworks')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return rowToFramework(data as FrameworkRow)
}

// ─── Competency Areas CRUD ────────────────────────────────────────────────────

export async function getAreasForFramework(frameworkId: string): Promise<CompetencyArea[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('competency_areas')
    .select('*')
    .eq('framework_id', frameworkId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map(r => rowToArea(r as AreaRow))
}

export async function createArea(input: { frameworkId: string; name: string; description?: string; sortOrder?: number }): Promise<CompetencyArea> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('competency_areas')
    .insert({ framework_id: input.frameworkId, name: input.name, description: input.description ?? null, sort_order: input.sortOrder ?? 0, owning_user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return rowToArea(data as AreaRow)
}

export async function updateArea(id: string, input: { name?: string; description?: string; sortOrder?: number }): Promise<CompetencyArea> {
  const supabase = createClient()
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.description !== undefined) patch.description = input.description
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder
  const { data, error } = await supabase
    .from('competency_areas')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return rowToArea(data as AreaRow)
}

export async function deleteArea(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('competency_areas').delete().eq('id', id)
  if (error) throw error
}

export async function reorderAreas(areaIds: string[]): Promise<void> {
  const supabase = createClient()
  await Promise.all(
    areaIds.map((id, idx) =>
      supabase.from('competency_areas').update({ sort_order: idx }).eq('id', id)
    )
  )
}

// ─── Level Expectations CRUD ──────────────────────────────────────────────────

export async function getLevelsForArea(areaId: string): Promise<CompetencyLevel[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('competency_levels')
    .select('*')
    .eq('area_id', areaId)
  if (error) throw error
  return (data ?? []).map(r => rowToLevel(r as LevelRow))
}

export async function getLevelsForFramework(frameworkId: string): Promise<CompetencyLevel[]> {
  const supabase = createClient()
  const { data: areas } = await supabase
    .from('competency_areas')
    .select('id')
    .eq('framework_id', frameworkId)
  if (!areas || areas.length === 0) return []
  const areaIds = areas.map((a: { id: string }) => a.id)
  const { data, error } = await supabase
    .from('competency_levels')
    .select('*')
    .in('area_id', areaIds)
  if (error) throw error
  return (data ?? []).map(r => rowToLevel(r as LevelRow))
}

export async function upsertLevel(areaId: string, level: string, expectations: string): Promise<CompetencyLevel> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('competency_levels')
    .upsert({ area_id: areaId, level, expectations, owning_user_id: user.id }, { onConflict: 'area_id,level' })
    .select()
    .single()
  if (error) throw error
  return rowToLevel(data as LevelRow)
}

// ─── Assessments ──────────────────────────────────────────────────────────────

export async function getLatestAssessmentsForPerson(personId: string): Promise<CompetencyAssessment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('competency_assessments')
    .select('*, competency_areas(name)')
    .eq('person_id', personId)
    .order('assessed_at', { ascending: false })
  if (error) throw error
  const rows = (data ?? []) as AssessmentRow[]
  // Keep only latest per area
  const seen = new Set<string>()
  const latest: CompetencyAssessment[] = []
  for (const r of rows) {
    if (!seen.has(r.area_id)) { seen.add(r.area_id); latest.push(rowToAssessment(r)) }
  }
  return latest
}

export async function getAssessmentHistoryForPersonArea(personId: string, areaId: string): Promise<CompetencyAssessment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('competency_assessments')
    .select('*, competency_areas(name)')
    .eq('person_id', personId)
    .eq('area_id', areaId)
    .order('assessed_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => rowToAssessment(r as AssessmentRow))
}

export async function getAssessmentsForTeam(personIds: string[]): Promise<CompetencyAssessment[]> {
  if (personIds.length === 0) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from('competency_assessments')
    .select('*, competency_areas(name)')
    .in('person_id', personIds)
    .order('assessed_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => rowToAssessment(r as AssessmentRow))
}

// ─── Team Competency Snapshot ─────────────────────────────────────────────────

export interface CompetencyAreaSnapshot {
  areaName: string
  totalAssessed: number
  belowExpected: number
  atExpected: number
  aboveExpected: number
  avgGap: number          // negative = below, 0 = at, positive = above
  pctBelowExpected: number
}

export interface TeamCompetencySnapshot {
  areas: CompetencyAreaSnapshot[]
  totalPeople: number
  assessedPeople: number
  teamId: string | null   // null = all teams
}

/**
 * Aggregate competency assessments across active people, optionally filtered by team.
 * Uses each person's expected level from their `level` field to compute gap.
 * Returns areas ranked by % below expected (highest gap first).
 */
export async function getTeamCompetencySnapshot(
  personIds: string[],
  teamId: string | null = null
): Promise<TeamCompetencySnapshot> {
  if (personIds.length === 0) {
    return { areas: [], totalPeople: 0, assessedPeople: 0, teamId }
  }

  const supabase = createClient()

  // Fetch all assessments for these people, keeping only latest per person+area
  const { data: rawAssessments, error: assessErr } = await supabase
    .from('competency_assessments')
    .select('person_id, area_id, assessed_level, score, competency_areas(name)')
    .in('person_id', personIds)
    .order('assessed_at', { ascending: false })
  if (assessErr) throw assessErr

  // Fetch people levels to compute expected score
  const { data: rawPeople, error: peopleErr } = await supabase
    .from('people')
    .select('id, level')
    .in('id', personIds)
  if (peopleErr) throw peopleErr

  const personLevelMap = new Map<string, string>(
    (rawPeople ?? []).map((p: { id: string; level: string | null }) => [p.id, p.level ?? 'Mid'])
  )

  // Deduplicate: keep latest assessment per (person, area)
  type RawRow = { person_id: string; area_id: string; assessed_level: string; score: number; competency_areas: { name: string } | null }
  const seen = new Map<string, RawRow>()
  for (const row of (rawAssessments ?? []) as unknown as RawRow[]) {
    const key = `${row.person_id}|${row.area_id}`
    if (!seen.has(key)) seen.set(key, row)
  }

  // Group by area
  const byArea = new Map<string, { areaName: string; gaps: number[] }>()
  for (const row of seen.values()) {
    const areaName = row.competency_areas?.name ?? row.area_id
    const expectedScore = levelToScore(personLevelMap.get(row.person_id) ?? 'Mid')
    const gap = row.score - expectedScore

    if (!byArea.has(row.area_id)) {
      byArea.set(row.area_id, { areaName, gaps: [] })
    }
    byArea.get(row.area_id)!.gaps.push(gap)
  }

  const assessedPeopleSet = new Set<string>(
    Array.from(seen.values()).map(r => r.person_id)
  )

  const areas: CompetencyAreaSnapshot[] = Array.from(byArea.entries())
    .map(([, { areaName, gaps }]) => {
      const totalAssessed = gaps.length
      const belowExpected = gaps.filter(g => g < 0).length
      const atExpected = gaps.filter(g => g === 0).length
      const aboveExpected = gaps.filter(g => g > 0).length
      const avgGap = totalAssessed > 0 ? gaps.reduce((a, b) => a + b, 0) / totalAssessed : 0
      const pctBelowExpected = totalAssessed > 0 ? (belowExpected / totalAssessed) * 100 : 0
      return { areaName, totalAssessed, belowExpected, atExpected, aboveExpected, avgGap, pctBelowExpected }
    })
    .sort((a, b) => b.pctBelowExpected - a.pctBelowExpected)

  return {
    areas,
    totalPeople: personIds.length,
    assessedPeople: assessedPeopleSet.size,
    teamId,
  }
}

export async function upsertAssessment(input: {
  personId: string
  areaId: string
  assessedLevel: string
  notes?: string
  evidenceIds?: string[]
}): Promise<CompetencyAssessment> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const score = levelToScore(input.assessedLevel)
  const today = new Date().toISOString().slice(0, 10)

  // Find most recent assessment for this person+area
  const { data: existing } = await supabase
    .from('competency_assessments')
    .select('id, assessed_at, evidence_ids')
    .eq('person_id', input.personId)
    .eq('area_id', input.areaId)
    .order('assessed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const isRecent = existing && new Date(existing.assessed_at) >= thirtyDaysAgo

  if (isRecent) {
    // Update in place — same checkpoint
    const { data, error } = await supabase
      .from('competency_assessments')
      .update({
        assessed_level: input.assessedLevel,
        score,
        notes: input.notes ?? null,
        assessed_at: today,
        evidence_ids: input.evidenceIds ?? existing.evidence_ids ?? [],
      })
      .eq('id', existing.id)
      .select('*, competency_areas(name)')
      .single()
    if (error) throw error
    return rowToAssessment(data as AssessmentRow)
  } else {
    // New row — preserve history
    const { data, error } = await supabase
      .from('competency_assessments')
      .insert({
        person_id: input.personId,
        area_id: input.areaId,
        assessed_level: input.assessedLevel,
        score,
        notes: input.notes ?? null,
        assessed_at: today,
        evidence_ids: input.evidenceIds ?? [],
        owning_user_id: user.id,
      })
      .select('*, competency_areas(name)')
      .single()
    if (error) throw error
    return rowToAssessment(data as AssessmentRow)
  }
}

export async function updateAssessmentEvidenceIds(id: string, evidenceIds: string[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('competency_assessments')
    .update({ evidence_ids: evidenceIds })
    .eq('id', id)
  if (error) throw error
}

// ─── Growth Plans ─────────────────────────────────────────────────────────────

export async function getGrowthPlansForPerson(personId: string): Promise<GrowthPlan[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('growth_plans')
    .select('*, competency_areas(name)')
    .eq('person_id', personId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(r => rowToGrowthPlan(r as GrowthPlanRow))
}

export async function createGrowthPlan(input: {
  personId: string
  areaId?: string
  title: string
  description?: string
  targetLevel?: string
  targetDate?: string
}): Promise<GrowthPlan> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('growth_plans')
    .insert({
      person_id: input.personId,
      area_id: input.areaId ?? null,
      title: input.title,
      description: input.description ?? null,
      target_level: input.targetLevel ?? null,
      target_date: input.targetDate ?? null,
      owning_user_id: user.id,
    })
    .select('*, competency_areas(name)')
    .single()
  if (error) throw error
  return rowToGrowthPlan(data as GrowthPlanRow)
}

export async function updateGrowthPlan(id: string, input: Partial<{
  title: string
  description: string
  areaId: string | null
  targetLevel: string | null
  targetDate: string | null
  status: GrowthPlan['status']
  progressNotes: string
}>): Promise<GrowthPlan> {
  const supabase = createClient()
  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.description !== undefined) patch.description = input.description
  if (input.areaId !== undefined) patch.area_id = input.areaId
  if (input.targetLevel !== undefined) patch.target_level = input.targetLevel
  if (input.targetDate !== undefined) patch.target_date = input.targetDate
  if (input.status !== undefined) patch.status = input.status
  if (input.progressNotes !== undefined) patch.progress_notes = input.progressNotes
  const { data, error } = await supabase
    .from('growth_plans')
    .update(patch)
    .eq('id', id)
    .select('*, competency_areas(name)')
    .single()
  if (error) throw error
  return rowToGrowthPlan(data as GrowthPlanRow)
}

export async function deleteGrowthPlan(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('growth_plans').delete().eq('id', id)
  if (error) throw error
}

// ─── Promotion readiness ──────────────────────────────────────────────────────

export interface PromotionReadiness {
  total: number
  atNextLevel: number
  nextLevel: Level | null
  signal: 'strong' | 'growing' | 'early'
  label: string
}

export function computePromotionReadiness(
  currentLevel: string,
  latestAssessments: CompetencyAssessment[]
): PromotionReadiness {
  const next = nextLevel(currentLevel)
  const total = latestAssessments.length
  if (!next || total === 0) {
    return { total, atNextLevel: 0, nextLevel: next, signal: 'early', label: 'No assessments yet' }
  }
  const nextScore = levelToScore(next)
  const atNextLevel = latestAssessments.filter(a => a.score >= nextScore).length
  const ratio = atNextLevel / total
  const signal: PromotionReadiness['signal'] = ratio > 0.66 ? 'strong' : ratio > 0.33 ? 'growing' : 'early'
  const label = signal === 'strong'
    ? `Strong ${next} signal`
    : signal === 'growing'
    ? `Growing toward ${next}`
    : `Not yet demonstrating ${next}`
  return { total, atNextLevel, nextLevel: next, signal, label }
}

// ─── Starter templates ────────────────────────────────────────────────────────

export interface FrameworkTemplate {
  name: string
  areas: Array<{
    name: string
    description: string
    levels: Partial<Record<Level, string>>
  }>
}

export const FRAMEWORK_TEMPLATES: FrameworkTemplate[] = [
  {
    name: 'General Engineering',
    areas: [
      {
        name: 'Technical Execution',
        description: 'Ability to deliver working software reliably and on time.',
        levels: {
          Junior: 'Completes well-scoped tasks with guidance. Asks for help when stuck.',
          Mid: 'Works independently on mid-sized features. Delivers to estimates.',
          Senior: 'Leads delivery of complex features. Unblocks the team. Raises risks early.',
          Staff: 'Owns delivery across multiple teams or services. Removes systemic blockers.',
          Principal: 'Sets the delivery culture and standards across the org.',
        },
      },
      {
        name: 'System Design',
        description: 'Ability to design scalable, maintainable systems and services.',
        levels: {
          Junior: 'Understands existing system design. Asks good questions.',
          Mid: 'Designs components within an existing system. Considers performance basics.',
          Senior: 'Designs new services or major features end-to-end. Reviews others\' designs.',
          Staff: 'Designs systems across service boundaries. Identifies cross-cutting concerns.',
          Principal: 'Defines architectural strategy across the engineering org.',
        },
      },
      {
        name: 'Code Quality',
        description: 'Produces readable, well-tested, maintainable code.',
        levels: {
          Junior: 'Writes code that works. Accepts and applies feedback from reviews.',
          Mid: 'Writes clean, readable code. Writes unit tests. Gives basic code review.',
          Senior: 'Sets quality standards for the team. Finds systemic quality issues.',
          Staff: 'Drives quality initiatives across teams. Defines testing strategy.',
          Principal: 'Defines org-wide engineering quality standards and practices.',
        },
      },
      {
        name: 'Communication',
        description: 'Communicates clearly with teammates and stakeholders.',
        levels: {
          Junior: 'Communicates status in standups. Asks clear questions.',
          Mid: 'Writes clear design docs. Communicates trade-offs to the team.',
          Senior: 'Influences decisions through clear written and verbal communication.',
          Staff: 'Communicates effectively with leadership and across teams.',
          Principal: 'Sets communication standards. Represents engineering to the company.',
        },
      },
      {
        name: 'Collaboration',
        description: 'Works well with others to achieve shared goals.',
        levels: {
          Junior: 'Participates in team rituals. Receptive to feedback.',
          Mid: 'Partners across the team on shared work. Gives constructive feedback.',
          Senior: 'Builds relationships across teams. Resolves disagreements constructively.',
          Staff: 'Aligns multiple teams around shared goals.',
          Principal: 'Builds a collaborative culture across the engineering org.',
        },
      },
      {
        name: 'Mentorship & Leadership',
        description: 'Helps others grow and takes on informal leadership.',
        levels: {
          Junior: 'Open to mentoring. Supports onboarding of new teammates.',
          Mid: 'Mentors junior engineers. Runs small projects.',
          Senior: 'Mentors across the team. Leads projects. Grows other engineers.',
          Staff: 'Grows senior engineers. Sets the technical direction for the team.',
          Principal: 'Builds a culture of mentorship. Develops future staff engineers.',
        },
      },
      {
        name: 'Project Management',
        description: 'Manages scope, risk, and delivery of projects.',
        levels: {
          Junior: 'Understands project goals. Tracks their own tasks.',
          Mid: 'Manages their own delivery. Flags risks to the team.',
          Senior: 'Breaks down large projects. Manages dependencies and risks.',
          Staff: 'Owns multi-team projects. Manages stakeholder expectations.',
          Principal: 'Sets project management standards. Owns major programmes of work.',
        },
      },
      {
        name: 'Business Impact',
        description: 'Connects engineering work to business outcomes.',
        levels: {
          Junior: 'Understands how their work fits the team\'s goals.',
          Mid: 'Understands team objectives and prioritises accordingly.',
          Senior: 'Connects technical decisions to business value. Influences prioritisation.',
          Staff: 'Owns measurable business outcomes across a domain.',
          Principal: 'Drives engineering strategy aligned with company goals.',
        },
      },
    ],
  },
  {
    name: 'Engineering Leadership (Staff+)',
    areas: [
      {
        name: 'Technical Strategy',
        description: 'Sets and executes the long-term technical direction.',
        levels: {
          Staff: 'Defines strategy for a domain. Aligns the team around it.',
          Principal: 'Sets org-wide technical strategy. Aligns with company direction.',
        },
      },
      {
        name: 'Architecture & Systems Thinking',
        description: 'Designs for the long term, considering trade-offs and evolution.',
        levels: {
          Staff: 'Designs systems that scale across teams. Considers long-term maintainability.',
          Principal: 'Defines architectural principles and patterns for the org.',
        },
      },
      {
        name: 'Cross-team Influence',
        description: 'Drives outcomes through teams they don\'t directly manage.',
        levels: {
          Staff: 'Influences adjacent teams through expertise and relationships.',
          Principal: 'Influences across the entire engineering org and beyond.',
        },
      },
      {
        name: 'Mentoring & Growing Others',
        description: 'Actively develops the engineers around them.',
        levels: {
          Staff: 'Grows senior engineers into staff. Provides technical career guidance.',
          Principal: 'Develops future staff and principal engineers. Builds a growth culture.',
        },
      },
      {
        name: 'Organisational Impact',
        description: 'Makes the whole engineering org better, not just their team.',
        levels: {
          Staff: 'Identifies and fixes systemic problems beyond their team.',
          Principal: 'Transforms how engineering works at the company level.',
        },
      },
      {
        name: 'Technical Decision Making',
        description: 'Makes high-quality technical decisions under uncertainty.',
        levels: {
          Staff: 'Makes sound technical decisions for a domain. Documents trade-offs.',
          Principal: 'Makes org-level technical decisions. Sets decision-making culture.',
        },
      },
      {
        name: 'Stakeholder Management',
        description: 'Works effectively with non-engineering stakeholders.',
        levels: {
          Staff: 'Manages relationships with product, design, and data stakeholders.',
          Principal: 'Partners with C-level stakeholders. Represents engineering externally.',
        },
      },
      {
        name: 'Culture & Team Building',
        description: 'Builds high-performing, inclusive engineering teams.',
        levels: {
          Staff: 'Shapes team culture and norms. Recruits and retains talent.',
          Principal: 'Defines the engineering culture across the org.',
        },
      },
    ],
  },
  {
    name: 'Minimal',
    areas: [
      {
        name: 'Delivery',
        description: 'Ships features reliably and to expectations.',
        levels: {
          Junior: 'Completes tasks with guidance.',
          Mid: 'Delivers features independently.',
          Senior: 'Leads delivery of complex projects.',
          Staff: 'Owns delivery across a domain.',
          Principal: 'Drives delivery culture org-wide.',
        },
      },
      {
        name: 'Quality',
        description: 'Produces high-quality, maintainable work.',
        levels: {
          Junior: 'Writes working code with basic tests.',
          Mid: 'Writes well-tested, readable code.',
          Senior: 'Sets quality standards for the team.',
          Staff: 'Drives quality across multiple teams.',
          Principal: 'Defines quality standards for the org.',
        },
      },
      {
        name: 'Communication',
        description: 'Communicates clearly and effectively.',
        levels: {
          Junior: 'Asks clear questions and shares status.',
          Mid: 'Writes clear docs and raises concerns early.',
          Senior: 'Influences decisions through communication.',
          Staff: 'Aligns teams through clear communication.',
          Principal: 'Sets communication standards org-wide.',
        },
      },
      {
        name: 'Growth',
        description: 'Actively improves their own skills and helps others grow.',
        levels: {
          Junior: 'Actively learns and applies feedback.',
          Mid: 'Mentors newer engineers and seeks stretch work.',
          Senior: 'Grows others and takes on leadership challenges.',
          Staff: 'Develops senior engineers into staff.',
          Principal: 'Builds a culture of continuous growth.',
        },
      },
    ],
  },
]

export async function applyTemplate(frameworkId: string, template: FrameworkTemplate): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  for (let i = 0; i < template.areas.length; i++) {
    const t = template.areas[i]
    const { data: areaData, error: areaError } = await supabase
      .from('competency_areas')
      .insert({ framework_id: frameworkId, name: t.name, description: t.description, sort_order: i, owning_user_id: user.id })
      .select()
      .single()
    if (areaError) throw areaError

    const levelInserts = (Object.entries(t.levels) as [Level, string][]).map(([level, expectations]) => ({
      area_id: areaData.id,
      level,
      expectations,
      owning_user_id: user.id,
    }))
    if (levelInserts.length > 0) {
      const { error: levError } = await supabase.from('competency_levels').insert(levelInserts)
      if (levError) throw levError
    }
  }
}
