/**
 * prioritiseTasks service — unit tests
 * Mocks callAI; does NOT make real network calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prioritiseTasks } from '../tasks'
import type { TaskPrioritisationInput } from '../tasks'

// ─── Mock callAI ──────────────────────────────────────────────────────────────

vi.mock('@/lib/services/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/ai')>()
  return {
    ...actual,
    callAI: vi.fn(),
  }
})

// Mock supabase (required by tasks.ts module import chain)
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: vi.fn(),
  })),
}))

import { callAI } from '@/lib/services/ai'
const mockCallAI = vi.mocked(callAI)

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TASKS: TaskPrioritisationInput[] = [
  { id: 'task-1', title: 'Write Q2 performance reviews', priority: 'Very High', dueDate: '2026-05-20', category: 'People', status: 'Not started' },
  { id: 'task-2', title: 'Update team roadmap', priority: 'Medium', dueDate: '2026-06-01', category: 'Task', status: 'Not started' },
  { id: 'task-3', title: 'Fix CI pipeline', priority: 'High', dueDate: null, category: 'Task', status: 'In progress', linkedPersonName: 'Alice', personOpenTaskCount: 8 },
]

const VALID_RESPONSE = {
  content: JSON.stringify({
    rankings: [
      { taskId: 'task-1', rank: 1, reason: 'Overdue and Very High priority.' },
      { taskId: 'task-3', rank: 2, reason: 'High priority with team member overloaded.' },
      { taskId: 'task-2', rank: 3, reason: 'Medium priority with future due date.' },
    ],
  }),
  tokensUsed: { input: 300, output: 80 },
  model: 'claude-sonnet-4-6',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('prioritiseTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array for empty task list (no AI call)', async () => {
    const result = await prioritiseTasks([], '2026-05-23')
    expect(result).toEqual([])
    expect(mockCallAI).not.toHaveBeenCalled()
  })

  it('returns rankings sorted by rank ascending', async () => {
    mockCallAI.mockResolvedValue(VALID_RESPONSE)
    const result = await prioritiseTasks(TASKS, '2026-05-23')
    expect(result[0].taskId).toBe('task-1')
    expect(result[1].taskId).toBe('task-3')
    expect(result[2].taskId).toBe('task-2')
    expect(result[0].rank).toBe(1)
    expect(result[2].rank).toBe(3)
  })

  it('returns reason string for each ranking', async () => {
    mockCallAI.mockResolvedValue(VALID_RESPONSE)
    const result = await prioritiseTasks(TASKS, '2026-05-23')
    for (const r of result) {
      expect(typeof r.reason).toBe('string')
      expect(r.reason.length).toBeGreaterThan(0)
    }
  })

  it('calls callAI with correct system prompt and temperature:0', async () => {
    mockCallAI.mockResolvedValue(VALID_RESPONSE)
    await prioritiseTasks(TASKS, '2026-05-23')
    expect(mockCallAI).toHaveBeenCalledOnce()
    const [req] = mockCallAI.mock.calls[0]
    expect(req.temperature).toBe(0)
    expect(req.systemPrompt).toContain('"rankings"')
  })

  it('user prompt contains all task IDs', async () => {
    mockCallAI.mockResolvedValue(VALID_RESPONSE)
    await prioritiseTasks(TASKS, '2026-05-23')
    const [req] = mockCallAI.mock.calls[0]
    expect(req.userPrompt).toContain('task-1')
    expect(req.userPrompt).toContain('task-2')
    expect(req.userPrompt).toContain('task-3')
  })

  it('strips markdown code fences from AI response', async () => {
    mockCallAI.mockResolvedValue({
      ...VALID_RESPONSE,
      content: '```json\n' + JSON.stringify({ rankings: [{ taskId: 'task-1', rank: 1, reason: 'Top priority.' }] }) + '\n```',
    })
    const result = await prioritiseTasks([TASKS[0]], '2026-05-23')
    expect(result[0].taskId).toBe('task-1')
  })

  it('throws on invalid JSON from AI', async () => {
    mockCallAI.mockResolvedValue({ ...VALID_RESPONSE, content: 'not json at all' })
    await expect(prioritiseTasks(TASKS, '2026-05-23')).rejects.toThrow('invalid JSON')
  })

  it('throws when rankings array is missing from response', async () => {
    mockCallAI.mockResolvedValue({ ...VALID_RESPONSE, content: JSON.stringify({ something_else: [] }) })
    await expect(prioritiseTasks(TASKS, '2026-05-23')).rejects.toThrow('missing rankings array')
  })

  it('filters out malformed ranking entries', async () => {
    mockCallAI.mockResolvedValue({
      ...VALID_RESPONSE,
      content: JSON.stringify({
        rankings: [
          { taskId: 'task-1', rank: 1, reason: 'Valid entry.' },
          { taskId: 123, rank: 2, reason: 'Bad taskId type — should be filtered.' }, // invalid: taskId not string
          { taskId: 'task-3', rank: 3 }, // missing reason — filtered
        ],
      }),
    })
    const result = await prioritiseTasks(TASKS, '2026-05-23')
    expect(result).toHaveLength(1)
    expect(result[0].taskId).toBe('task-1')
  })

  it('passes AbortSignal through to callAI', async () => {
    mockCallAI.mockResolvedValue(VALID_RESPONSE)
    const controller = new AbortController()
    await prioritiseTasks(TASKS, '2026-05-23', controller.signal)
    const [, signal] = mockCallAI.mock.calls[0]
    expect(signal).toBe(controller.signal)
  })

  it('uses current date when today param is omitted', async () => {
    mockCallAI.mockResolvedValue(VALID_RESPONSE)
    await prioritiseTasks(TASKS)
    const [req] = mockCallAI.mock.calls[0]
    const todayPattern = /Today: \d{4}-\d{2}-\d{2}/
    expect(req.userPrompt).toMatch(todayPattern)
  })
})
