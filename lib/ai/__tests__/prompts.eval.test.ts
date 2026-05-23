/**
 * AI Prompt Evals
 *
 * Tests prompt builder output structure and completeness — NOT live AI calls.
 * Verifies that prompts contain required context, stay within token budgets,
 * and produce parseable output shapes for each AI feature.
 */

import { describe, it, expect } from 'vitest'
import {
  buildReviewDraftPrompt,
  buildOneonOnePrepPrompt,
  buildPromotionPacketPrompt,
  buildActionItemPrompt,
  buildGrowthPlanPrompt,
  buildTaskPrioritisationPrompt,
  buildNaturalLanguageTaskPrompt,
  REVIEW_DRAFT_SYSTEM,
  ONE_ON_ONE_PREP_SYSTEM,
  PROMOTION_PACKET_SYSTEM,
  ACTION_ITEM_EXTRACTION_SYSTEM,
  EVIDENCE_CATEGORISATION_SYSTEM,
  GROWTH_PLAN_SYSTEM,
  REFLECTION_PROMPTS_SYSTEM,
  RECURRING_TOPICS_SYSTEM,
  SUMMARY_REWRITE_PROMPTS,
  TASK_PRIORITISATION_SYSTEM,
  NATURAL_LANGUAGE_TASK_SYSTEM,
  type TaskPrioritisationInput,
  type NaturalLanguageTaskPerson,
} from '../prompts'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PERSON = {
  name: 'Alice Chen',
  role: 'Senior Engineer',
  level: 'Senior',
  teams: ['Platform'],
  startDate: '2023-01-15',
}

const EVIDENCE = [
  { category: 'achievement', title: 'Led migration to new auth system', occurredAt: '2026-03-10', content: 'Completed 2 weeks ahead of schedule with zero incidents.' },
  { category: 'feedback_received', title: 'Positive feedback from design team', occurredAt: '2026-02-14', content: 'Proactive communication on API contract changes.' },
  { category: 'concern', title: 'Late PRs two sprints running', occurredAt: '2026-01-20', content: null },
]

const MEETINGS = [
  { meetingType: '1:1', title: '1:1 with Alice', meetingDate: '2026-04-01', notes: 'Discussed career goals. Alice wants to move into Staff.', actionItems: 'Alice to draft skills gap doc by Apr 15.' },
  { meetingType: '1:1', title: '1:1 with Alice', meetingDate: '2026-03-04', notes: 'Retro follow-up. Process improvements going well.', actionItems: null },
]

const ASSESSMENTS = [
  { areaName: 'Technical Leadership', assessedLevel: 'Mid', expectedLevel: 'Senior', notes: 'Good mentoring but limited system design ownership.' },
  { areaName: 'Communication', assessedLevel: 'Senior', expectedLevel: 'Senior', notes: null },
]

// ─── Review Draft Prompt ──────────────────────────────────────────────────────

describe('buildReviewDraftPrompt', () => {
  it('includes person name, role, and level', () => {
    const prompt = buildReviewDraftPrompt({
      ...PERSON,
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
      evidence: EVIDENCE,
      meetings: MEETINGS,
    })
    expect(prompt).toContain('Alice Chen')
    expect(prompt).toContain('Senior Engineer')
    expect(prompt).toContain('Senior')
  })

  it('includes review period dates', () => {
    const prompt = buildReviewDraftPrompt({
      ...PERSON,
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
      evidence: EVIDENCE,
      meetings: MEETINGS,
    })
    expect(prompt).toContain('2026-01-01')
    expect(prompt).toContain('2026-03-31')
  })

  it('includes evidence titles', () => {
    const prompt = buildReviewDraftPrompt({
      ...PERSON,
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
      evidence: EVIDENCE,
      meetings: MEETINGS,
    })
    expect(prompt).toContain('Led migration to new auth system')
    expect(prompt).toContain('Late PRs two sprints running')
  })

  it('falls back gracefully with no evidence', () => {
    const prompt = buildReviewDraftPrompt({
      ...PERSON,
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
      evidence: [],
      meetings: [],
    })
    expect(prompt).toContain('No evidence entries in this period')
    expect(prompt).toContain('No meeting notes in this period')
  })

  it('stays within 6000 token budget (~24000 chars)', () => {
    const largeEvidence = Array.from({ length: 100 }, (_, i) => ({
      category: 'achievement',
      title: `Evidence item ${i}`,
      occurredAt: '2026-01-01',
      content: 'x'.repeat(500),
    }))
    const prompt = buildReviewDraftPrompt({
      ...PERSON,
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
      evidence: largeEvidence,
      meetings: [],
    })
    // ~4 chars per token; 6000 tokens ≈ 24000 chars
    expect(prompt.length).toBeLessThanOrEqual(24500)
  })

  it('system prompt contains all required sections', () => {
    expect(REVIEW_DRAFT_SYSTEM).toContain('## Summary')
    expect(REVIEW_DRAFT_SYSTEM).toContain('## Impact & Delivery')
    expect(REVIEW_DRAFT_SYSTEM).toContain('## Strengths')
    expect(REVIEW_DRAFT_SYSTEM).toContain('## Growth Areas')
    expect(REVIEW_DRAFT_SYSTEM).toContain('## Overall Assessment')
  })
})

// ─── 1:1 Prep Prompt ──────────────────────────────────────────────────────────

describe('buildOneonOnePrepPrompt', () => {
  it('includes name and role', () => {
    const prompt = buildOneonOnePrepPrompt({
      name: 'Alice Chen',
      role: 'Senior Engineer',
      level: 'Senior',
      recentMeetings: MEETINGS,
      openFollowUps: [{ title: 'Check on promotion timeline', createdAt: '2026-03-01' }],
      recentEvidence: EVIDENCE,
      competencyGaps: ASSESSMENTS,
    })
    expect(prompt).toContain('Alice Chen')
    expect(prompt).toContain('Senior Engineer')
  })

  it('includes open follow-ups', () => {
    const prompt = buildOneonOnePrepPrompt({
      name: 'Alice Chen',
      role: null,
      level: null,
      recentMeetings: [],
      openFollowUps: [{ title: 'Check on promotion timeline', createdAt: '2026-03-01' }],
      recentEvidence: [],
      competencyGaps: [],
    })
    expect(prompt).toContain('Check on promotion timeline')
  })

  it('includes competency gaps', () => {
    const prompt = buildOneonOnePrepPrompt({
      name: 'Alice Chen',
      role: null,
      level: null,
      recentMeetings: [],
      openFollowUps: [],
      recentEvidence: [],
      competencyGaps: ASSESSMENTS,
    })
    expect(prompt).toContain('Technical Leadership')
    expect(prompt).toContain('Mid')
  })

  it('gracefully handles empty inputs', () => {
    const prompt = buildOneonOnePrepPrompt({
      name: 'Bob',
      role: null,
      level: null,
      recentMeetings: [],
      openFollowUps: [],
      recentEvidence: [],
      competencyGaps: [],
    })
    expect(prompt).toContain('No recent 1:1 notes')
    expect(prompt).toContain('No open follow-ups')
    expect(prompt).toContain('No competency gaps')
  })

  it('limits meeting notes to 3 most recent', () => {
    const manyMeetings = Array.from({ length: 10 }, (_, i) => ({
      title: `Meeting ${i}`,
      meetingDate: `2026-0${(i % 3) + 1}-01`,
      notes: `Notes for meeting ${i}`,
      actionItems: null,
    }))
    const prompt = buildOneonOnePrepPrompt({
      name: 'Alice',
      role: null,
      level: null,
      recentMeetings: manyMeetings,
      openFollowUps: [],
      recentEvidence: [],
      competencyGaps: [],
    })
    // Should only include Meeting 0, 1, 2
    expect(prompt).toContain('Meeting 0')
    expect(prompt).not.toContain('Meeting 9')
  })
})

// ─── Promotion Packet Prompt ──────────────────────────────────────────────────

describe('buildPromotionPacketPrompt', () => {
  it('includes current and target level', () => {
    const prompt = buildPromotionPacketPrompt({
      name: 'Alice Chen',
      role: 'Senior Engineer',
      currentLevel: 'Senior',
      targetLevel: 'Staff',
      assessments: ASSESSMENTS,
      evidence: EVIDENCE,
    })
    expect(prompt).toContain('Senior')
    expect(prompt).toContain('Staff')
  })

  it('includes competency assessments', () => {
    const prompt = buildPromotionPacketPrompt({
      name: 'Alice Chen',
      role: null,
      currentLevel: 'Senior',
      targetLevel: 'Staff',
      assessments: ASSESSMENTS,
      evidence: EVIDENCE,
    })
    expect(prompt).toContain('Technical Leadership')
    expect(prompt).toContain('Mid')
  })

  it('filters evidence to promotion-relevant categories', () => {
    const mixedEvidence = [
      { category: 'achievement', title: 'Led auth migration', occurredAt: '2026-03-10', content: null },
      { category: 'concern', title: 'Should not appear prominently', occurredAt: '2026-01-01', content: null },
      { category: 'promotion_evidence', title: 'Staff-level scope on new infra', occurredAt: '2026-04-01', content: null },
    ]
    const prompt = buildPromotionPacketPrompt({
      name: 'Alice',
      role: null,
      currentLevel: 'Senior',
      targetLevel: 'Staff',
      assessments: [],
      evidence: mixedEvidence,
    })
    expect(prompt).toContain('Led auth migration')
    expect(prompt).toContain('Staff-level scope on new infra')
  })

  it('handles empty assessments gracefully', () => {
    const prompt = buildPromotionPacketPrompt({
      name: 'Alice',
      role: null,
      currentLevel: 'Mid',
      targetLevel: 'Senior',
      assessments: [],
      evidence: [],
    })
    expect(prompt).toContain('No assessments')
    expect(prompt).toContain('No promotion evidence logged')
  })
})

// ─── Action Item Extraction Prompt ───────────────────────────────────────────

describe('buildActionItemPrompt', () => {
  it('includes meeting title and type', () => {
    const prompt = buildActionItemPrompt({
      meetingTitle: 'Sprint Planning',
      meetingType: 'Team Sync',
      attendees: ['Alice', 'Bob'],
      notes: 'We discussed the roadmap.',
      actionItems: 'Alice to write the spec.',
    })
    expect(prompt).toContain('Sprint Planning')
    expect(prompt).toContain('Team Sync')
  })

  it('includes all attendees', () => {
    const prompt = buildActionItemPrompt({
      meetingTitle: '1:1',
      meetingType: '1:1',
      attendees: ['Alice', 'Bob', 'Carol'],
      notes: '',
      actionItems: '',
    })
    expect(prompt).toContain('Alice')
    expect(prompt).toContain('Bob')
    expect(prompt).toContain('Carol')
  })

  it('combines notes and action items in prompt', () => {
    const prompt = buildActionItemPrompt({
      meetingTitle: 'Retro',
      meetingType: 'Retro',
      attendees: [],
      notes: 'Team velocity dropped.',
      actionItems: 'Fix the CI pipeline.',
    })
    expect(prompt).toContain('Team velocity dropped')
    expect(prompt).toContain('Fix the CI pipeline')
  })

  it('system prompt demands JSON-only output', () => {
    expect(ACTION_ITEM_EXTRACTION_SYSTEM).toContain('"action_items"')
    expect(ACTION_ITEM_EXTRACTION_SYSTEM).toContain('"follow_ups"')
    expect(ACTION_ITEM_EXTRACTION_SYSTEM).toContain('No other text')
  })

  it('handles empty attendees gracefully', () => {
    const prompt = buildActionItemPrompt({
      meetingTitle: 'Solo Review',
      meetingType: 'Other',
      attendees: [],
      notes: 'Just me.',
      actionItems: '',
    })
    expect(prompt).toContain('unknown')
  })
})

// ─── Growth Plan Prompt ───────────────────────────────────────────────────────

describe('buildGrowthPlanPrompt', () => {
  it('includes competency area details', () => {
    const prompt = buildGrowthPlanPrompt({
      name: 'Alice',
      role: 'Engineer',
      currentLevel: 'Mid',
      targetLevel: 'Senior',
      areaName: 'System Design',
      areaDescription: 'Ability to design scalable distributed systems',
      currentExpectations: 'Designs components with guidance',
      targetExpectations: 'Independently designs cross-team systems',
    })
    expect(prompt).toContain('System Design')
    expect(prompt).toContain('Mid')
    expect(prompt).toContain('Senior')
    expect(prompt).toContain('Designs components with guidance')
  })

  it('system prompt demands JSON output with required fields', () => {
    expect(GROWTH_PLAN_SYSTEM).toContain('"title"')
    expect(GROWTH_PLAN_SYSTEM).toContain('"actions"')
    expect(GROWTH_PLAN_SYSTEM).toContain('"success_criteria"')
    expect(GROWTH_PLAN_SYSTEM).toContain('"suggested_timeline"')
  })
})

// ─── System Prompt Structure Evals ───────────────────────────────────────────

describe('system prompt structure', () => {
  it('evidence categorisation demands valid JSON with category + sentiment', () => {
    expect(EVIDENCE_CATEGORISATION_SYSTEM).toContain('"category"')
    expect(EVIDENCE_CATEGORISATION_SYSTEM).toContain('"sentiment"')
    expect(EVIDENCE_CATEGORISATION_SYSTEM).toContain('ONLY JSON')
  })

  it('evidence categorisation lists all valid categories', () => {
    const categories = ['achievement', 'feedback_given', 'feedback_received', 'concern', 'growth', 'delivery', 'behaviour', 'promotion_evidence', 'general']
    for (const cat of categories) {
      expect(EVIDENCE_CATEGORISATION_SYSTEM).toContain(cat)
    }
  })

  it('reflection prompts demands JSON array output', () => {
    expect(REFLECTION_PROMPTS_SYSTEM).toContain('JSON array')
  })

  it('recurring topics demands JSON array with required fields', () => {
    // Fields listed in prose format (- topic:) not quoted JSON keys
    expect(RECURRING_TOPICS_SYSTEM).toContain('topic')
    expect(RECURRING_TOPICS_SYSTEM).toContain('frequency')
    expect(RECURRING_TOPICS_SYSTEM).toContain('escalating')
    expect(RECURRING_TOPICS_SYSTEM).toContain('JSON array')
  })

  it('promotion packet system prompt contains all required sections', () => {
    expect(PROMOTION_PACKET_SYSTEM).toContain('## Recommendation')
    expect(PROMOTION_PACKET_SYSTEM).toContain('## Case for Promotion')
    expect(PROMOTION_PACKET_SYSTEM).toContain('## Supporting Evidence Summary')
  })

  it('all summary rewrite variants are defined', () => {
    expect(SUMMARY_REWRITE_PROMPTS['skip-level']).toBeTruthy()
    expect(SUMMARY_REWRITE_PROMPTS['slack']).toBeTruthy()
    expect(SUMMARY_REWRITE_PROMPTS['team']).toBeTruthy()
  })

  it('1:1 prep system prompt covers all required sections', () => {
    expect(ONE_ON_ONE_PREP_SYSTEM).toContain('Carry-over topics')
    expect(ONE_ON_ONE_PREP_SYSTEM).toContain('Follow-up check-ins')
    expect(ONE_ON_ONE_PREP_SYSTEM).toContain('Suggested discussion topics')
    expect(ONE_ON_ONE_PREP_SYSTEM).toContain('Questions to ask')
  })

  it('task prioritisation system prompt demands JSON-only output', () => {
    expect(TASK_PRIORITISATION_SYSTEM).toContain('"rankings"')
    expect(TASK_PRIORITISATION_SYSTEM).toContain('"taskId"')
    expect(TASK_PRIORITISATION_SYSTEM).toContain('"rank"')
    expect(TASK_PRIORITISATION_SYSTEM).toContain('"reason"')
    expect(TASK_PRIORITISATION_SYSTEM).toContain('No other text')
  })

  it('task prioritisation system prompt describes all ranking signals', () => {
    expect(TASK_PRIORITISATION_SYSTEM).toContain('Urgency')
    expect(TASK_PRIORITISATION_SYSTEM).toContain('Priority field')
    expect(TASK_PRIORITISATION_SYSTEM).toContain('Person workload')
    expect(TASK_PRIORITISATION_SYSTEM).toContain('Category')
  })
})

// ─── Task Prioritisation Prompt ───────────────────────────────────────────────

const TASKS: TaskPrioritisationInput[] = [
  { id: 'task-1', title: 'Write Q2 performance reviews', priority: 'Very High', dueDate: '2026-05-20', category: 'People', status: 'Not started' },
  { id: 'task-2', title: 'Update team roadmap doc', priority: 'Medium', dueDate: '2026-06-01', category: 'Task', status: 'Not started' },
  { id: 'task-3', title: 'Fix CI pipeline', priority: 'High', dueDate: null, category: 'Task', status: 'In progress', linkedPersonName: 'Alice', personOpenTaskCount: 8 },
]

describe('buildTaskPrioritisationPrompt', () => {
  it('includes all task IDs in prompt', () => {
    const prompt = buildTaskPrioritisationPrompt({ tasks: TASKS, today: '2026-05-23' })
    expect(prompt).toContain('task-1')
    expect(prompt).toContain('task-2')
    expect(prompt).toContain('task-3')
  })

  it('marks overdue tasks explicitly', () => {
    const prompt = buildTaskPrioritisationPrompt({ tasks: TASKS, today: '2026-05-23' })
    // task-1 due 2026-05-20, today is 2026-05-23 → overdue
    expect(prompt).toContain('OVERDUE')
    expect(prompt).toContain('2026-05-20')
  })

  it('includes linked person name and open task count', () => {
    const prompt = buildTaskPrioritisationPrompt({ tasks: TASKS, today: '2026-05-23' })
    expect(prompt).toContain('Alice')
    expect(prompt).toContain('8 open tasks')
  })

  it('includes today date in prompt', () => {
    const prompt = buildTaskPrioritisationPrompt({ tasks: TASKS, today: '2026-05-23' })
    expect(prompt).toContain('Today: 2026-05-23')
  })

  it('includes priority and category for each task', () => {
    const prompt = buildTaskPrioritisationPrompt({ tasks: TASKS, today: '2026-05-23' })
    expect(prompt).toContain('Very High')
    expect(prompt).toContain('People')
    expect(prompt).toContain('Medium')
  })

  it('returns early message for empty task list', () => {
    const prompt = buildTaskPrioritisationPrompt({ tasks: [], today: '2026-05-23' })
    expect(prompt).toContain('No tasks to prioritise')
  })

  it('stays within 4000 token budget (~16000 chars)', () => {
    const largeTasks: TaskPrioritisationInput[] = Array.from({ length: 200 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i} with a reasonably long title that could bloat the prompt`,
      priority: 'High',
      dueDate: '2026-06-01',
      category: 'Task',
      status: 'Not started',
      linkedPersonName: 'Alice Smith',
      personOpenTaskCount: 12,
    }))
    const prompt = buildTaskPrioritisationPrompt({ tasks: largeTasks, today: '2026-05-23' })
    expect(prompt.length).toBeLessThanOrEqual(16500)
  })

  it('handles tasks with no due date gracefully', () => {
    const tasks: TaskPrioritisationInput[] = [
      { id: 'task-x', title: 'No deadline task', priority: 'Low', dueDate: null, category: 'Task', status: 'Not started' },
    ]
    const prompt = buildTaskPrioritisationPrompt({ tasks, today: '2026-05-23' })
    expect(prompt).toContain('no due date')
  })

  it('handles tasks without linked person', () => {
    const tasks: TaskPrioritisationInput[] = [
      { id: 'task-y', title: 'Standalone task', priority: 'Medium', dueDate: '2026-06-15', category: 'Task', status: 'Not started' },
    ]
    const prompt = buildTaskPrioritisationPrompt({ tasks, today: '2026-05-23' })
    // No person info — should not contain "linked to"
    expect(prompt).not.toContain('linked to')
  })
})

// ─── Natural Language Task Prompt ─────────────────────────────────────────────

const NL_PEOPLE: NaturalLanguageTaskPerson[] = [
  { id: 'person-alice', name: 'Alice Chen' },
  { id: 'person-bob', name: 'Bob Smith' },
]

describe('buildNaturalLanguageTaskPrompt', () => {
  it('includes user input in prompt', () => {
    const prompt = buildNaturalLanguageTaskPrompt({
      input: 'Follow up with Alice about the deploy',
      today: '2026-05-23',
      people: NL_PEOPLE,
    })
    expect(prompt).toContain('Follow up with Alice about the deploy')
  })

  it('includes today date', () => {
    const prompt = buildNaturalLanguageTaskPrompt({
      input: 'Write team update',
      today: '2026-05-23',
      people: NL_PEOPLE,
    })
    expect(prompt).toContain('Today: 2026-05-23')
  })

  it('includes all people with their IDs', () => {
    const prompt = buildNaturalLanguageTaskPrompt({
      input: 'Check in with Bob',
      today: '2026-05-23',
      people: NL_PEOPLE,
    })
    expect(prompt).toContain('Alice Chen')
    expect(prompt).toContain('person-alice')
    expect(prompt).toContain('Bob Smith')
    expect(prompt).toContain('person-bob')
  })

  it('handles empty people list gracefully', () => {
    const prompt = buildNaturalLanguageTaskPrompt({
      input: 'Write docs',
      today: '2026-05-23',
      people: [],
    })
    expect(prompt).toContain('No people in directory')
  })

  it('wraps user input in quotes', () => {
    const prompt = buildNaturalLanguageTaskPrompt({
      input: 'some task',
      today: '2026-05-23',
      people: [],
    })
    expect(prompt).toContain('"some task"')
  })
})

describe('NATURAL_LANGUAGE_TASK_SYSTEM', () => {
  it('specifies all valid priority values', () => {
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('Low')
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('Medium')
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('High')
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('Very High')
  })

  it('specifies all valid category values', () => {
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('Task')
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('Meeting')
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('Career Growth')
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('People')
  })

  it('demands JSON-only output', () => {
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('"title"')
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('"priority"')
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('"category"')
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('"dueDate"')
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('"list"')
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('"confidence"')
  })

  it('includes confidence levels', () => {
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('"high"')
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('"medium"')
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('"low"')
  })

  it('describes ISO 8601 date format', () => {
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('YYYY-MM-DD')
  })

  it('mentions relative date examples', () => {
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('next Friday')
  })

  it('lists week and backlog as valid list values', () => {
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('"week"')
    expect(NATURAL_LANGUAGE_TASK_SYSTEM).toContain('"backlog"')
  })
})
