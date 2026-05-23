// All AI system prompts and context assembly functions.
// Centralised here so prompts can be updated without touching components.

import { truncateToTokenBudget } from '@/lib/services/ai'

// ─── Review Draft ─────────────────────────────────────────────────────────────

export const REVIEW_DRAFT_SYSTEM = `You are an expert engineering manager writing a performance review. You write in a direct, evidence-based style. Every claim is backed by specific examples with dates. You are fair, balanced, and constructive.

Write a performance review for the following period. Structure it with these markdown sections:
## Summary
## Impact & Delivery
## Strengths
## Growth Areas
## Overall Assessment

Rules:
- Reference specific dates and examples from the evidence provided
- Be direct and specific, not vague or generic
- Balance positive and constructive feedback
- If evidence is thin for any section, note that explicitly rather than fabricating
- Use the person's first name
- Keep total length under 800 words`

export function buildReviewDraftPrompt(args: {
  name: string
  role: string | null
  level: string | null
  teams: string[]
  startDate: string | null
  periodStart: string
  periodEnd: string
  evidence: Array<{ category: string; title: string; occurredAt: string; content?: string | null }>
  meetings: Array<{ meetingType: string; title: string; meetingDate: string; notes?: string | null }>
}): string {
  const evidenceText = args.evidence.length > 0
    ? args.evidence.map(e => `[${e.category}] ${e.title} (${e.occurredAt})${e.content ? ': ' + e.content.slice(0, 300) : ''}`).join('\n')
    : 'No evidence entries in this period.'

  const meetingText = args.meetings.length > 0
    ? args.meetings.slice(0, 20).map(m => {
        const notes = (m.notes ?? '').slice(0, 400)
        return `${m.meetingType}: ${m.title} (${m.meetingDate})${notes ? '\n  ' + notes : ''}`
      }).join('\n')
    : 'No meeting notes in this period.'

  const prompt = `Person: ${args.name}, ${args.role ?? 'Engineer'}, ${args.level ?? 'unknown'} level${args.teams.length ? ', team: ' + args.teams.join(', ') : ''}${args.startDate ? ', started ' + args.startDate : ''}
Review period: ${args.periodStart} to ${args.periodEnd}

=== Evidence Entries ===
${evidenceText}

=== Meeting Notes ===
${meetingText}`

  return truncateToTokenBudget(prompt, 6000)
}

// ─── 1:1 Prep ─────────────────────────────────────────────────────────────────

export const ONE_ON_ONE_PREP_SYSTEM = `You are helping an engineering manager prepare for a 1:1 meeting. Generate a concise prep brief with:

- **Carry-over topics**: unresolved items from the last meeting
- **Follow-up check-ins**: commitments from previous meetings that need updating
- **Suggested discussion topics**: based on recent evidence, competency gaps, or patterns
- **Questions to ask**: 2-3 thoughtful questions based on the person's current situation

Rules:
- Be concise — this is a prep note, not an essay
- Flag anything that looks like it needs attention (repeated concerns, stalled growth plans)
- Reference specific previous discussions where relevant
- Keep total length under 400 words`

export function buildOneonOnePrepPrompt(args: {
  name: string
  role: string | null
  level: string | null
  recentMeetings: Array<{ title: string; meetingDate: string; notes?: string | null; actionItems?: string | null }>
  openFollowUps: Array<{ title: string; createdAt: string }>
  recentEvidence: Array<{ category: string; title: string; occurredAt: string }>
  competencyGaps: Array<{ areaName: string; assessedLevel: string; expectedLevel: string }>
}): string {
  const meetingText = args.recentMeetings.slice(0, 3).map(m => {
    const notes = (m.notes ?? '').slice(0, 300)
    const actions = (m.actionItems ?? '').slice(0, 200)
    return `${m.title} (${m.meetingDate})${notes ? '\n  Notes: ' + notes : ''}${actions ? '\n  Action items: ' + actions : ''}`
  }).join('\n\n') || 'No recent 1:1 notes.'

  const followUpText = args.openFollowUps.length > 0
    ? args.openFollowUps.slice(0, 5).map(f => `- ${f.title} (open since ${f.createdAt.slice(0, 10)})`).join('\n')
    : 'No open follow-ups.'

  const evidenceText = args.recentEvidence.length > 0
    ? args.recentEvidence.slice(0, 8).map(e => `[${e.category}] ${e.title} (${e.occurredAt})`).join('\n')
    : 'No recent evidence.'

  const gapText = args.competencyGaps.length > 0
    ? args.competencyGaps.map(g => `${g.areaName}: assessed ${g.assessedLevel}, expected ${g.expectedLevel}`).join('\n')
    : 'No competency gaps.'

  return truncateToTokenBudget(`Person: ${args.name}, ${args.role ?? 'Engineer'} (${args.level ?? 'unknown level'})

=== Last 3 Meeting Notes ===
${meetingText}

=== Open Follow-ups ===
${followUpText}

=== Recent Evidence (last 30 days) ===
${evidenceText}

=== Competency Gaps ===
${gapText}`, 4000)
}

// ─── Promotion Packet ─────────────────────────────────────────────────────────

export const PROMOTION_PACKET_SYSTEM = `You are helping an engineering manager write a promotion case for one of their reports. Write a compelling, evidence-based promotion document.

Structure (use markdown):
## Recommendation
## Current Level Summary
## Case for Promotion
## Growth Trajectory
## Areas for Continued Development
## Supporting Evidence Summary

Rules:
- Every claim must reference specific evidence with dates
- Frame the case positively but honestly — do not overstate
- If evidence is thin for a competency area, note it explicitly
- Use the person's first name
- Keep total length under 1000 words`

export function buildPromotionPacketPrompt(args: {
  name: string
  role: string | null
  currentLevel: string
  targetLevel: string
  assessments: Array<{ areaName: string; assessedLevel: string; expectedLevel: string; notes?: string | null }>
  evidence: Array<{ category: string; title: string; occurredAt: string; content?: string | null }>
}): string {
  const assessmentText = args.assessments.map(a =>
    `${a.areaName}: ${a.assessedLevel} (expected ${a.expectedLevel})${a.notes ? ' — ' + a.notes.slice(0, 150) : ''}`
  ).join('\n') || 'No assessments.'

  const evidenceText = args.evidence
    .filter(e => ['promotion_evidence', 'achievement', 'delivery'].includes(e.category))
    .slice(0, 20)
    .map(e => `[${e.category}] ${e.title} (${e.occurredAt})${e.content ? ': ' + e.content.slice(0, 250) : ''}`)
    .join('\n') || 'No promotion evidence logged.'

  return truncateToTokenBudget(`Person: ${args.name}, ${args.role ?? 'Engineer'}
Current level: ${args.currentLevel} → Proposed: ${args.targetLevel}

=== Competency Assessments ===
${assessmentText}

=== Promotion Evidence ===
${evidenceText}`, 6000)
}

// ─── Follow-up Draft ─────────────────────────────────────────────────────────

export type FollowUpDraftTone = 'formal' | 'casual' | 'slack'

export const FOLLOW_UP_DRAFT_SYSTEM = `You are an engineering manager writing a follow-up message to a direct report after a 1:1 or meeting.

Write a concise, professional follow-up message the manager can send directly. The message should:
- Open with a brief acknowledgement of the meeting
- Reference specific action items and commitments made (by name, not vaguely)
- List next steps clearly so the recipient knows what to expect
- Close naturally

Rules:
- Keep under 200 words
- Do not fabricate items not mentioned in the input
- If there are no action items or follow-ups, write a general summary of what was discussed
- Do not use em-dashes or corporate filler phrases ("as per our discussion", "going forward")
- Output plain text only — no markdown headers

Tone variants:
- formal: professional, third-person-neutral, full sentences
- casual: warm, first-person, conversational — as if sent to someone you know well
- slack: very short, bullet-point friendly, Slack-ready (you may use emoji sparingly)`

export interface FollowUpDraftArgs {
  personName: string
  meetingTitle: string
  meetingDate: string
  notes: string | null | undefined
  actionItems: string | null | undefined
  followUps: Array<{ title: string }>
  tone: FollowUpDraftTone
}

export function buildFollowUpDraftPrompt(args: FollowUpDraftArgs): string {
  const hasNotes = args.notes && args.notes.trim().length > 0
  const hasActionItems = args.actionItems && args.actionItems.trim().length > 0
  const hasFollowUps = args.followUps.length > 0

  const followUpLines = hasFollowUps
    ? args.followUps.map(f => `- ${f.title}`).join('\n')
    : null

  const sections = [
    `Person: ${args.personName}`,
    `Meeting: ${args.meetingTitle} (${args.meetingDate})`,
    `Tone: ${args.tone}`,
    '',
    hasNotes
      ? `=== Meeting Notes ===\n${args.notes!.slice(0, 1500)}`
      : '=== Meeting Notes ===\nNo notes recorded.',
    '',
    hasActionItems
      ? `=== Action Items ===\n${args.actionItems!.slice(0, 800)}`
      : '=== Action Items ===\nNone recorded.',
    '',
    followUpLines
      ? `=== Manager Commitments (Follow-ups) ===\n${followUpLines}`
      : '=== Manager Commitments (Follow-ups) ===\nNone recorded.',
  ]

  return truncateToTokenBudget(sections.join('\n'), 4000)
}

// ─── Action Item Extraction ───────────────────────────────────────────────────

export const ACTION_ITEM_EXTRACTION_SYSTEM = `Extract action items from meeting notes. An action item is something someone committed to DO — not a discussion point or observation.

For each action item return:
- title: concise description
- assignee: person responsible (must be one of the attendees, or "unassigned")
- due_date_hint: timeframe mentioned ("by Friday", "next sprint") or null

Return ONLY a JSON object:
{
  "action_items": [{"title": "...", "assignee": "...", "due_date_hint": "..."}],
  "follow_ups": [{"title": "...", "person": "...", "due_date_hint": "..."}]
}

follow_ups are commitments the MANAGER made ("I'll check on...", "Let me find out about...").
If none found, return empty arrays. No other text.`

export function buildActionItemPrompt(args: {
  meetingTitle: string
  meetingType: string
  attendees: string[]
  notes: string
  actionItems: string
}): string {
  return `Meeting: ${args.meetingTitle} (${args.meetingType})
Attendees: ${args.attendees.join(', ') || 'unknown'}

Notes:
${(args.notes + '\n\n' + args.actionItems).slice(0, 3000)}`
}

// ─── Meeting Notes Cleanup ────────────────────────────────────────────────────

export const NOTES_CLEANUP_SYSTEM = `Clean up the following meeting notes. Fix grammar, spelling, and punctuation. Organise into clear sections if the notes are unstructured. Preserve all factual content — do not add, remove, or change any information. Keep the same level of detail. Use markdown formatting.`

// ─── Evidence Categorisation ──────────────────────────────────────────────────

export const EVIDENCE_CATEGORISATION_SYSTEM = `Given an evidence entry about an employee, suggest:
1. category: one of [achievement, feedback_given, feedback_received, concern, growth, delivery, behaviour, promotion_evidence, general]
2. sentiment: one of [positive, neutral, negative]

Return ONLY JSON: {"category": "...", "sentiment": "..."}`

// ─── Summary Rewriting ────────────────────────────────────────────────────────

export const SUMMARY_REWRITE_PROMPTS: Record<string, string> = {
  'skip-level': 'Rewrite this weekly status update for a skip-level audience (the manager\'s manager). Focus on strategic progress, key decisions, risks, and team health. Remove tactical details. Keep to 200-300 words.',
  'slack':      'Compress this weekly status update into a concise Slack post. Use bullet points. Lead with the most important items. Keep to 5-8 bullets maximum. Casual but professional tone. Include emoji sparingly for scannability.',
  'team':       'Rewrite this weekly status update as a team-facing update. Focus on what was delivered, what\'s coming next, and any blockers the team should know about. Positive and forward-looking tone. Keep to 300-400 words.',
}

export const SUMMARY_REWRITE_LABELS: Record<string, string> = {
  'skip-level': 'Skip-level update',
  'slack':      'Slack post',
  'team':       'Team update',
  'custom':     'Custom…',
}

// ─── Growth Plan Suggestion ───────────────────────────────────────────────────

export const GROWTH_PLAN_SYSTEM = `Suggest a growth plan for an engineer who needs to develop in a competency area. The plan should be specific, actionable, and achievable within 3-6 months.

Return ONLY JSON:
{
  "title": "...",
  "description": "...",
  "actions": ["...", "...", "..."],
  "success_criteria": "...",
  "suggested_timeline": "..."
}

Be specific to the competency area and level gap. Avoid generic advice. Focus on on-the-job practice and measurable behaviours.`

export function buildGrowthPlanPrompt(args: {
  name: string
  role: string | null
  currentLevel: string
  targetLevel: string
  areaName: string
  areaDescription: string
  currentExpectations: string
  targetExpectations: string
}): string {
  return `Engineer: ${args.name}, ${args.role ?? 'Engineer'}, currently at ${args.currentLevel}, working toward ${args.targetLevel}
Competency area: ${args.areaName} — ${args.areaDescription}

Current level (${args.currentLevel}) expectations:
${args.currentExpectations || 'Not defined'}

Target level (${args.targetLevel}) expectations:
${args.targetExpectations || 'Not defined'}`
}

// ─── Competency Assessment Reasoning ─────────────────────────────────────────

export const ASSESSMENT_REASONING_SYSTEM = `Draft assessment reasoning for a competency area based on evidence. The reasoning should:
- Cite specific evidence entries by title and date
- Explain why the assessed level is appropriate
- Be 2-4 sentences
- Be direct and factual

If evidence is thin, note that the assessment is based on limited data.`

// ─── Weekly Reflection Prompts ────────────────────────────────────────────────

export const REFLECTION_PROMPTS_SYSTEM = `Based on a manager's week, generate 3-4 reflection prompts to help them think about their week. Each prompt should be:
- Specific to what actually happened (not generic)
- Thought-provoking, not just restating facts
- One sentence each

Return ONLY a JSON array of strings: ["...", "...", "..."]

Example: "You completed 12 tasks but had no 1:1s — was that a conscious trade-off or did something slip?"`

// ─── Recurring Topics ─────────────────────────────────────────────────────────

export const RECURRING_TOPICS_SYSTEM = `Analyse these meeting notes chronologically and identify recurring topics — themes, concerns, or subjects that appear across multiple meetings. Only flag topics that appear in 3 or more separate meetings.

For each recurring topic return:
- topic: concise description
- frequency: how many meetings mention it
- first_seen: date of the first meeting
- latest: date of the most recent meeting
- escalating: boolean — is the topic becoming more prominent or urgent over time?

Return ONLY a JSON array. If no recurring topics, return [].`

// ─── Task Prioritisation ──────────────────────────────────────────────────────

export const TASK_PRIORITISATION_SYSTEM = `You are helping an engineering manager prioritise their task backlog. Rank tasks by importance using the following signals:

1. **Urgency** — How soon is it due? Overdue tasks rank highest.
2. **Priority field** — Very High > High > Medium > Low. Weight this heavily.
3. **Person workload** — Tasks linked to people with high open-task counts are more important to resolve.
4. **Category** — People-related tasks (1:1s, performance, career) rank above general tasks when urgency is equal.

Return ONLY a JSON object:
{
  "rankings": [
    { "taskId": "...", "rank": 1, "reason": "..." },
    ...
  ]
}

Rules:
- Every task in the input must appear in rankings exactly once
- rank 1 = highest priority
- reason must be one concise sentence (max 15 words) explaining why this rank
- Do not fabricate tasks that were not in the input
- No other text outside the JSON`

export interface TaskPrioritisationInput {
  id: string
  title: string
  priority: string
  dueDate: string | null
  category: string
  status: string
  linkedPersonName?: string
  personOpenTaskCount?: number
}

export interface TaskRanking {
  taskId: string
  rank: number
  reason: string
}

export interface TaskPrioritisationResult {
  rankings: TaskRanking[]
}

export function buildTaskPrioritisationPrompt(args: {
  tasks: TaskPrioritisationInput[]
  today: string
}): string {
  if (args.tasks.length === 0) return 'No tasks to prioritise.'

  const taskLines = args.tasks.map(t => {
    const due = t.dueDate
      ? (t.dueDate < args.today ? `OVERDUE (was ${t.dueDate})` : `due ${t.dueDate}`)
      : 'no due date'
    const person = t.linkedPersonName
      ? `, linked to ${t.linkedPersonName}${t.personOpenTaskCount != null ? ` (${t.personOpenTaskCount} open tasks)` : ''}`
      : ''
    return `- id:${t.id} | "${t.title}" | priority:${t.priority} | ${due} | category:${t.category} | status:${t.status}${person}`
  }).join('\n')

  return truncateToTokenBudget(`Today: ${args.today}

Tasks to rank:
${taskLines}`, 4000)
}

// ─── Natural Language Task Creation ──────────────────────────────────────────

export const NATURAL_LANGUAGE_TASK_SYSTEM = `You are helping an engineering manager create structured tasks from natural language descriptions.

Parse the input and return a structured task. Use the following rules:
- **title**: A concise, action-oriented task title (max 80 characters). Remove filler words like "I need to" or "Remember to".
- **priority**: One of "Low", "Medium", "High", "Very High". Default to "Medium" if no urgency signals.
- **category**: One of "Task", "Meeting", "Career Growth", "People". Use "People" for tasks about team members, "Meeting" for meeting-related tasks, "Career Growth" for development tasks, "Task" for everything else.
- **dueDate**: ISO 8601 date string (YYYY-MM-DD) resolved from the input relative to today, or null if no date mentioned. Examples: "next Friday", "end of week", "tomorrow", "in 2 weeks".
- **assigneeId**: ID of the person this task relates to, matched from the people list, or null if no person mentioned or matched.
- **list**: "week" if due this week or overdue, "backlog" otherwise. Default to "backlog" if no date.

Return ONLY a JSON object with no other text:
{
  "title": "...",
  "priority": "Low" | "Medium" | "High" | "Very High",
  "category": "Task" | "Meeting" | "Career Growth" | "People",
  "dueDate": "YYYY-MM-DD" | null,
  "assigneeId": "person-uuid" | null,
  "list": "week" | "backlog",
  "confidence": "high" | "medium" | "low"
}

confidence reflects how certain you are about the parse:
- high: all fields clearly stated
- medium: some inference required (e.g. relative date resolved, name partially matched)
- low: significant ambiguity, user should review carefully`

export interface NaturalLanguageTaskPerson {
  id: string
  name: string
}

export interface NaturalLanguageTaskResult {
  title: string
  priority: string
  category: string
  dueDate: string | null
  assigneeId: string | null
  list: 'week' | 'backlog'
  confidence: 'high' | 'medium' | 'low'
}

export function buildNaturalLanguageTaskPrompt(args: {
  input: string
  today: string
  people: NaturalLanguageTaskPerson[]
}): string {
  const peopleList = args.people.length > 0
    ? args.people.map(p => `- ${p.name} (id: ${p.id})`).join('\n')
    : 'No people in directory.'

  return `Today: ${args.today}

User input: "${args.input}"

Active people directory (for name matching):
${peopleList}`
}

// ─── Team Competency Summary ──────────────────────────────────────────────────

export const TEAM_COMPETENCY_SUMMARY_SYSTEM = `You are a strategic advisor helping an engineering manager understand their team's competency health. You write concise, skip-level-ready summaries based on aggregate data.

Generate a 3-5 bullet narrative identifying:
- The top 2-3 systemic skill gaps (areas with the highest % below expected)
- Notable patterns across areas (e.g. execution vs. communication imbalance)
- Suggested focus areas for training investment or hiring

Rules:
- Never name individuals — aggregate only
- Use clear, direct language suitable for sharing with senior leadership
- Ground every point in the data provided
- If data is limited (< 3 people assessed), note this caveat
- Return plain markdown bullets — no headers, no JSON`

export interface TeamCompetencySummaryArea {
  areaName: string
  totalAssessed: number
  belowExpected: number
  atExpected: number
  aboveExpected: number
  avgGap: number
  pctBelowExpected: number
}

export function buildTeamCompetencySummaryPrompt(args: {
  teamName: string
  totalPeople: number
  assessedPeople: number
  areas: TeamCompetencySummaryArea[]
}): string {
  if (args.areas.length === 0) {
    return `Team: ${args.teamName}\nTotal people: ${args.totalPeople}\nNo competency assessments recorded yet.`
  }

  const areaLines = args.areas
    .slice(0, 15)
    .map(a => {
      const pct = Math.round(a.pctBelowExpected)
      const avg = a.avgGap.toFixed(1)
      return `- ${a.areaName}: ${pct}% below expected (${a.belowExpected}/${a.totalAssessed} people), avg gap ${avg > '0' ? '+' : ''}${avg} levels`
    })
    .join('\n')

  return truncateToTokenBudget(`Team: ${args.teamName}
People: ${args.totalPeople} total, ${args.assessedPeople} assessed

Competency areas ranked by % below expected level:
${areaLines}`, 3000)
}

export function buildTeamCompetencySummaryPromptFromSnapshot(args: {
  teamName: string
  snapshot: { totalPeople: number; assessedPeople: number; areas: TeamCompetencySummaryArea[] }
}): string {
  return buildTeamCompetencySummaryPrompt({
    teamName: args.teamName,
    totalPeople: args.snapshot.totalPeople,
    assessedPeople: args.snapshot.assessedPeople,
    areas: args.snapshot.areas,
  })
}

// ─── Meeting TL;DR ────────────────────────────────────────────────────────────

export const MEETING_TLDR_SYSTEM = `You are summarising a meeting for an engineering manager. Write a TL;DR of exactly 2 sentences.

Rules:
- Lead with the main decision or outcome (not "We discussed…")
- Mention 1-2 key topics discussed
- Do NOT list every action item — that is captured elsewhere
- Plain text only — no markdown, no bullet points, no headers
- Maximum 60 words total`

export function buildMeetingTldrPrompt(args: {
  title: string
  meetingType: string
  notes: string
  actionItems?: string | null
}): string {
  const actionText = args.actionItems?.trim()
    ? `\nAction items: ${args.actionItems.slice(0, 400)}`
    : ''
  return truncateToTokenBudget(
    `Meeting: ${args.title} (${args.meetingType})\n\nNotes:\n${args.notes}${actionText}`,
    3000
  )
}

// ─── Batch Evidence Extraction ────────────────────────────────────────────────

export const BATCH_EVIDENCE_EXTRACTION_SYSTEM = `You are helping an engineering manager extract evidence entries from raw text (Slack threads, emails, doc excerpts, or meeting notes).

Extract concrete, specific observations about individual contributors. For each distinct observation return:
- title: concise 1-line summary (max 80 chars)
- content: the relevant verbatim or paraphrased detail (max 300 chars), or null
- category: one of [achievement, feedback_given, feedback_received, concern, growth, delivery, behaviour, promotion_evidence, general]
- sentiment: one of [positive, neutral, negative]
- occurredAt: ISO date (YYYY-MM-DD). Infer from context clues or default to today.
- personName: the person this observation is about. Must match one of the provided names, or null if unclear.

Rules:
- Only extract CONCRETE, SPECIFIC observations — not generic praise or vague statements
- One entry per distinct observation
- If a passage mentions the same person doing multiple distinct things, create separate entries
- If no extractable evidence, return an empty array
- Return ONLY a JSON array with no other text:

[{"title":"...","content":"...","category":"...","sentiment":"...","occurredAt":"YYYY-MM-DD","personName":"..."}]`

export interface BatchExtractedEvidence {
  title: string
  content: string | null
  category: string
  sentiment: string
  occurredAt: string
  personName: string | null
}

export function buildBatchEvidencePrompt(args: {
  text: string
  people: Array<{ id: string; name: string }>
  today: string
  contextPersonName?: string
}): string {
  const peopleList = args.people.length > 0
    ? `Active people (use these names exactly):\n${args.people.map(p => `- ${p.name}`).join('\n')}`
    : 'No people directory provided.'

  const contextNote = args.contextPersonName
    ? `\nContext: this text is primarily about ${args.contextPersonName} unless another name is clearly identified.`
    : ''

  return truncateToTokenBudget(
    `Today: ${args.today}${contextNote}\n\n${peopleList}\n\n=== Text to extract from ===\n${args.text}`,
    4000
  )
}

// ─── Team Health Narrative ────────────────────────────────────────────────────

export const TEAM_HEALTH_NARRATIVE_SYSTEM = `You are a strategic advisor summarising team health for an engineering manager.

Write 2-3 sentences of plain English describing overall team health and the top concern.

Rules:
- Use aggregate language only — no individual names
- Reference role/level if needed (e.g. "a mid-level engineer")
- Lead with the overall state
- Identify the single most urgent concern in the second sentence
- If healthy, say so and mention what is going well
- Plain text only, no markdown`

export interface TeamHealthInput {
  score: number
  label: string
  breakdown: { tasks: number; people: number; followUps: number; goals: number }
  topSignals: Array<{ type: string; severity: string; message: string }>
}

export function buildTeamHealthNarrativePrompt(args: TeamHealthInput): string {
  const topSignalText = args.topSignals.length > 0
    ? args.topSignals
        .slice(0, 5)
        .map(s => `- [${s.severity}] ${s.type}: ${s.message}`)
        .join('\n')
    : 'No active signals.'

  return `Team health score: ${args.score}/100 (${args.label})

Signal breakdown:
- Tasks: ${args.breakdown.tasks} signals
- People: ${args.breakdown.people} signals
- Follow-ups: ${args.breakdown.followUps} signals
- Goals: ${args.breakdown.goals} signals

Top signals:
${topSignalText}`
}
