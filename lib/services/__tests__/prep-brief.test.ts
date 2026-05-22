/**
 * Unit tests for prep-brief service
 * Mocks callAI and supabase — no live network calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generatePrepBrief, getPrepBriefContext } from '../prep-brief'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/services/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/ai')>()
  return { ...actual, callAI: vi.fn() }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

import { callAI } from '@/lib/services/ai'
import { createClient } from '@/lib/supabase/client'
const mockCallAI = vi.mocked(callAI)
const mockCreateClient = vi.mocked(createClient)

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PERSON_ROW = { id: 'person-1', full_name: 'Alice Chen', role: 'Senior Engineer', level: 'Senior' }

const MEETINGS_ROWS = [
  { title: '1:1 with Alice', meeting_date: '2026-05-16', notes: 'Discussed roadmap.', action_items: 'Alice to write spec.' },
]

const FOLLOW_UP_ROWS = [
  { title: 'Check on promo timeline', created_at: '2026-05-01T00:00:00Z' },
]

const EVIDENCE_ROWS = [
  { category: 'achievement', title: 'Led auth migration', occurred_at: '2026-05-10' },
]

const ASSESSMENT_ROWS = [
  { assessed_level: 'Mid', competency_areas: { name: 'System Design' } },
]

function makeChain(resolvedValue: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const methods = ['select', 'eq', 'gte', 'order', 'limit', 'single', 'not']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // Terminal resolution points: single (person), limit (all list queries)
  chain['single'].mockResolvedValue(resolvedValue)
  chain['limit'].mockResolvedValue(resolvedValue)
  return chain
}

const TABLE_RESULTS: Record<string, unknown> = {
  people:                   { data: PERSON_ROW, error: null },
  meetings:                 { data: MEETINGS_ROWS, error: null },
  follow_ups:               { data: FOLLOW_UP_ROWS, error: null },
  evidence_entries:         { data: EVIDENCE_ROWS, error: null },
  competency_assessments:   { data: ASSESSMENT_ROWS, error: null },
}

function makeSupabaseMock() {
  const client = {
    from: vi.fn().mockImplementation((table: string) => {
      const result = TABLE_RESULTS[table] ?? { data: [], error: null }
      return makeChain(result)
    }),
    auth: { getUser: vi.fn() },
  }
  return client
}

const AI_RESPONSE = {
  content: '**Carry-over topics**\n- Check on promo timeline\n\n**Questions to ask**\n- How is the spec coming along?',
  tokensUsed: { input: 400, output: 120 },
  model: 'claude-sonnet-4-6',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getPrepBriefContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockReturnValue(makeSupabaseMock() as unknown as ReturnType<typeof createClient>)
  })

  it('returns correct person name and role', async () => {
    const ctx = await getPrepBriefContext('person-1')
    expect(ctx.personName).toBe('Alice Chen')
    expect(ctx.role).toBe('Senior Engineer')
    expect(ctx.level).toBe('Senior')
  })

  it('maps meeting rows to camelCase shape', async () => {
    const ctx = await getPrepBriefContext('person-1')
    expect(ctx.recentMeetings[0].meetingDate).toBe('2026-05-16')
    expect(ctx.recentMeetings[0].actionItems).toBe('Alice to write spec.')
  })

  it('maps follow-up rows correctly', async () => {
    const ctx = await getPrepBriefContext('person-1')
    expect(ctx.openFollowUps[0].title).toBe('Check on promo timeline')
  })

  it('maps evidence rows correctly', async () => {
    const ctx = await getPrepBriefContext('person-1')
    expect(ctx.recentEvidence[0].occurredAt).toBe('2026-05-10')
    expect(ctx.recentEvidence[0].category).toBe('achievement')
  })

  it('includes competency gap when assessed level is below person level', async () => {
    const ctx = await getPrepBriefContext('person-1')
    // Alice is Senior, assessment is Mid → gap
    expect(ctx.competencyGaps.some((g) => g.areaName === 'System Design')).toBe(true)
  })
})

describe('generatePrepBrief', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockReturnValue(makeSupabaseMock() as unknown as ReturnType<typeof createClient>)
    mockCallAI.mockResolvedValue(AI_RESPONSE)
  })

  it('returns brief with personName, content, and generatedAt', async () => {
    const brief = await generatePrepBrief('person-1')
    expect(brief.personId).toBe('person-1')
    expect(brief.personName).toBe('Alice Chen')
    expect(brief.content).toContain('Carry-over topics')
    expect(brief.generatedAt).toBeTruthy()
  })

  it('calls callAI with ONE_ON_ONE_PREP_SYSTEM', async () => {
    await generatePrepBrief('person-1')
    expect(mockCallAI).toHaveBeenCalledOnce()
    const [req] = mockCallAI.mock.calls[0]
    expect(req.systemPrompt).toContain('Carry-over topics')
  })

  it('user prompt includes person name', async () => {
    await generatePrepBrief('person-1')
    const [req] = mockCallAI.mock.calls[0]
    expect(req.userPrompt).toContain('Alice Chen')
  })

  it('passes AbortSignal through to callAI', async () => {
    const controller = new AbortController()
    await generatePrepBrief('person-1', controller.signal)
    const [, signal] = mockCallAI.mock.calls[0]
    expect(signal).toBe(controller.signal)
  })

  it('propagates callAI errors', async () => {
    mockCallAI.mockRejectedValue(new Error('AI unavailable'))
    await expect(generatePrepBrief('person-1')).rejects.toThrow('AI unavailable')
  })

  it('generatedAt is a valid ISO timestamp', async () => {
    const brief = await generatePrepBrief('person-1')
    expect(() => new Date(brief.generatedAt).toISOString()).not.toThrow()
  })
})
