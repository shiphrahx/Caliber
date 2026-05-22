/**
 * Prep Brief Service
 * Loads all context needed to generate a 1:1 prep brief for a person,
 * then calls AI using the existing ONE_ON_ONE_PREP_SYSTEM prompt.
 */

import { createClient } from '@/lib/supabase/client'
import { callAI } from '@/lib/services/ai'
import { ONE_ON_ONE_PREP_SYSTEM, buildOneonOnePrepPrompt } from '@/lib/ai/prompts'

export interface PrepBriefContext {
  personId: string
  personName: string
  role: string | null
  level: string | null
  recentMeetings: Array<{
    title: string
    meetingDate: string
    notes?: string | null
    actionItems?: string | null
  }>
  openFollowUps: Array<{ title: string; createdAt: string }>
  recentEvidence: Array<{ category: string; title: string; occurredAt: string }>
  competencyGaps: Array<{ areaName: string; assessedLevel: string; expectedLevel: string }>
}

export interface PrepBrief {
  personId: string
  personName: string
  content: string
  generatedAt: string
}

/**
 * Load all raw context for a person needed to build a 1:1 prep brief.
 * Runs all queries in parallel.
 */
export async function getPrepBriefContext(personId: string): Promise<PrepBriefContext> {
  const supabase = createClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  const [personResult, meetingsResult, followUpsResult, evidenceResult, assessmentsResult] =
    await Promise.all([
      // Person details
      supabase
        .from('people')
        .select('id, full_name, role, level')
        .eq('id', personId)
        .single(),

      // Last 3 1:1 meetings with notes
      supabase
        .from('meetings')
        .select('title, meeting_date, notes, action_items')
        .eq('person_id', personId)
        .eq('meeting_type', '1:1')
        .order('meeting_date', { ascending: false })
        .limit(3),

      // Open follow-ups for this person
      supabase
        .from('follow_ups')
        .select('title, created_at')
        .eq('person_id', personId)
        .eq('status', 'open')
        .order('created_at', { ascending: true })
        .limit(5),

      // Recent evidence (last 30 days)
      supabase
        .from('evidence_entries')
        .select('category, title, occurred_at')
        .eq('person_id', personId)
        .gte('occurred_at', thirtyDaysAgoStr)
        .order('occurred_at', { ascending: false })
        .limit(8),

      // Competency gaps (assessed < expected)
      supabase
        .from('competency_assessments')
        .select(`
          assessed_level,
          competency_areas!inner(name)
        `)
        .eq('person_id', personId)
        .order('assessed_at', { ascending: false }),
    ])

  if (personResult.error) throw personResult.error

  const person = personResult.data as {
    id: string; full_name: string; role: string | null; level: string | null
  }

  const meetings = (meetingsResult.data ?? []).map((m: {
    title: string; meeting_date: string; notes: string | null; action_items: string | null
  }) => ({
    title: m.title,
    meetingDate: m.meeting_date,
    notes: m.notes,
    actionItems: m.action_items,
  }))

  const followUps = (followUpsResult.data ?? []).map((f: {
    title: string; created_at: string
  }) => ({
    title: f.title,
    createdAt: f.created_at,
  }))

  const evidence = (evidenceResult.data ?? []).map((e: {
    category: string; title: string; occurred_at: string
  }) => ({
    category: e.category,
    title: e.title,
    occurredAt: e.occurred_at,
  }))

  // Resolve competency gaps: only include where person's level < their expected level
  // We use the person's level as the "expected" baseline from the people record
  const LEVEL_ORDER = ['Junior', 'Mid', 'Senior', 'Staff', 'Principal']
  const personLevelIdx = person.level ? LEVEL_ORDER.indexOf(person.level) : -1

  const competencyGaps = (assessmentsResult.data ?? [])
    .map((a: { assessed_level: string; competency_areas: { name: string } | { name: string }[] | null }) => {
      const areaName = Array.isArray(a.competency_areas)
        ? a.competency_areas[0]?.name ?? 'Unknown'
        : (a.competency_areas as { name: string } | null)?.name ?? 'Unknown'
      return {
        areaName,
        assessedLevel: a.assessed_level,
        expectedLevel: person.level ?? 'Senior',
      }
    })
    .filter((g: { areaName: string; assessedLevel: string; expectedLevel: string }) => {
      const assessedIdx = LEVEL_ORDER.indexOf(g.assessedLevel)
      return personLevelIdx !== -1 && assessedIdx !== -1 && assessedIdx < personLevelIdx
    })
    .slice(0, 5)

  return {
    personId: person.id,
    personName: person.full_name,
    role: person.role,
    level: person.level,
    recentMeetings: meetings,
    openFollowUps: followUps,
    recentEvidence: evidence,
    competencyGaps,
  }
}

/**
 * Generate a 1:1 prep brief for a person using the existing prompt infrastructure.
 * Returns the generated markdown content.
 */
export async function generatePrepBrief(
  personId: string,
  signal?: AbortSignal
): Promise<PrepBrief> {
  const context = await getPrepBriefContext(personId)

  const userPrompt = buildOneonOnePrepPrompt({
    name: context.personName,
    role: context.role,
    level: context.level,
    recentMeetings: context.recentMeetings,
    openFollowUps: context.openFollowUps,
    recentEvidence: context.recentEvidence,
    competencyGaps: context.competencyGaps,
  })

  const response = await callAI(
    {
      systemPrompt: ONE_ON_ONE_PREP_SYSTEM,
      userPrompt,
      maxTokens: 600,
      temperature: 0.3,
    },
    signal
  )

  return {
    personId,
    personName: context.personName,
    content: response.content,
    generatedAt: new Date().toISOString(),
  }
}
