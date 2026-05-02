import { describe, it, expect, beforeEach, vi } from 'vitest'
import '../../../test/mocks/supabase'
import { mockSupabaseClient } from '../../../test/mocks/supabase'
import {
  getFollowUpsForPerson,
  getAllFollowUps,
  getOpenFollowUps,
  createFollowUp,
  updateFollowUp,
  completeFollowUp,
  cancelFollowUp,
  deleteFollowUp,
  markFollowUpSurfaced,
  markFollowUpsSurfaced,
} from '../follow-ups'

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  ...baseRow(),
  ...overrides,
})

function baseRow() {
  return {
    id: 'fu-1',
    user_id: 'user-1',
    person_id: 'person-1',
    title: 'Follow up on sprint velocity',
    description: null,
    source_type: null,
    source_id: null,
    status: 'open' as const,
    due_date: null,
    created_at: '2026-05-01T10:00:00Z',
    completed_at: null,
    cancelled_at: null,
    last_surfaced_at: null,
    times_surfaced: 0,
    updated_at: '2026-05-01T10:00:00Z',
    person: { full_name: 'Alice Smith' },
    meeting: null,
  }
}

function makeMock(data: any, error: any = null) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: vi.fn((resolve: any) => resolve({ data, error })),
  }
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getFollowUpsForPerson', () => {
  it('returns mapped follow-ups for a person', async () => {
    const row = makeRow()
    const chain = makeMock([row])
    vi.spyOn(mockSupabaseClient, 'from').mockReturnValue(chain)

    const result = await getFollowUpsForPerson('person-1')

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('follow_ups')
    expect(chain.eq).toHaveBeenCalledWith('person_id', 'person-1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('fu-1')
    expect(result[0].personName).toBe('Alice Smith')
    expect(result[0].status).toBe('open')
  })

  it('throws on error', async () => {
    const chain = makeMock(null, { message: 'DB error' })
    vi.spyOn(mockSupabaseClient, 'from').mockReturnValue(chain)
    await expect(getFollowUpsForPerson('person-1')).rejects.toThrow('DB error')
  })
})

describe('getAllFollowUps', () => {
  it('returns all follow-ups', async () => {
    const rows = [makeRow(), makeRow({ id: 'fu-2', person_id: 'person-2' })]
    const chain = makeMock(rows)
    vi.spyOn(mockSupabaseClient, 'from').mockReturnValue(chain)

    const result = await getAllFollowUps()
    expect(result).toHaveLength(2)
  })
})

describe('getOpenFollowUps', () => {
  it('filters to open status', async () => {
    const chain = makeMock([makeRow()])
    vi.spyOn(mockSupabaseClient, 'from').mockReturnValue(chain)

    await getOpenFollowUps()
    expect(chain.eq).toHaveBeenCalledWith('status', 'open')
  })
})

describe('createFollowUp', () => {
  it('inserts with user id and returns mapped follow-up', async () => {
    const row = makeRow({ source_type: 'meeting', source_id: 'mtg-1', meeting: { title: 'Sprint Retro' } })
    const chain = makeMock(row)
    chain.insert = vi.fn().mockReturnThis()
    chain.select = vi.fn().mockReturnThis()
    chain.single = vi.fn().mockResolvedValue({ data: row, error: null })
    vi.spyOn(mockSupabaseClient, 'from').mockReturnValue(chain)

    const result = await createFollowUp({
      personId: 'person-1',
      title: 'Follow up on sprint velocity',
      description: null,
      sourceType: 'meeting',
      sourceId: 'mtg-1',
      status: 'open',
      dueDate: null,
    })

    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'test-user-id',
      person_id: 'person-1',
      title: 'Follow up on sprint velocity',
      source_type: 'meeting',
      source_id: 'mtg-1',
    }))
    expect(result.sourceName).toBe('Sprint Retro')
  })

  it('throws when not authenticated', async () => {
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })
    const chain = makeMock(null)
    vi.spyOn(mockSupabaseClient, 'from').mockReturnValue(chain)

    await expect(createFollowUp({
      personId: 'p1', title: 'Test', description: null,
      sourceType: null, sourceId: null, status: 'open', dueDate: null,
    })).rejects.toThrow('Not authenticated')

    // restore
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } }, error: null,
    })
  })
})

describe('updateFollowUp', () => {
  it('maps camelCase to snake_case fields', async () => {
    const row = makeRow({ status: 'completed', completed_at: '2026-05-02T10:00:00Z' })
    const chain = makeMock(row)
    chain.update = vi.fn().mockReturnThis()
    chain.eq = vi.fn().mockReturnThis()
    chain.select = vi.fn().mockReturnThis()
    chain.single = vi.fn().mockResolvedValue({ data: row, error: null })
    vi.spyOn(mockSupabaseClient, 'from').mockReturnValue(chain)

    const result = await updateFollowUp('fu-1', { status: 'completed', dueDate: '2026-05-10' })

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
      due_date: '2026-05-10',
      completed_at: expect.any(String),
    }))
    expect(result.status).toBe('completed')
  })

  it('sets cancelled_at when cancelling', async () => {
    const row = makeRow({ status: 'cancelled', cancelled_at: '2026-05-02T10:00:00Z' })
    const chain = makeMock(row)
    chain.update = vi.fn().mockReturnThis()
    chain.eq = vi.fn().mockReturnThis()
    chain.select = vi.fn().mockReturnThis()
    chain.single = vi.fn().mockResolvedValue({ data: row, error: null })
    vi.spyOn(mockSupabaseClient, 'from').mockReturnValue(chain)

    await updateFollowUp('fu-1', { status: 'cancelled' })

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'cancelled',
      cancelled_at: expect.any(String),
    }))
  })
})

describe('completeFollowUp', () => {
  it('delegates to updateFollowUp with completed status', async () => {
    const row = makeRow({ status: 'completed', completed_at: '2026-05-02T10:00:00Z' })
    const chain = makeMock(row)
    chain.update = vi.fn().mockReturnThis()
    chain.eq = vi.fn().mockReturnThis()
    chain.select = vi.fn().mockReturnThis()
    chain.single = vi.fn().mockResolvedValue({ data: row, error: null })
    vi.spyOn(mockSupabaseClient, 'from').mockReturnValue(chain)

    const result = await completeFollowUp('fu-1')
    expect(result.status).toBe('completed')
  })
})

describe('cancelFollowUp', () => {
  it('delegates to updateFollowUp with cancelled status', async () => {
    const row = makeRow({ status: 'cancelled', cancelled_at: '2026-05-02T10:00:00Z' })
    const chain = makeMock(row)
    chain.update = vi.fn().mockReturnThis()
    chain.eq = vi.fn().mockReturnThis()
    chain.select = vi.fn().mockReturnThis()
    chain.single = vi.fn().mockResolvedValue({ data: row, error: null })
    vi.spyOn(mockSupabaseClient, 'from').mockReturnValue(chain)

    const result = await cancelFollowUp('fu-1')
    expect(result.status).toBe('cancelled')
  })
})

describe('deleteFollowUp', () => {
  it('calls delete with correct id', async () => {
    const chain = makeMock(null)
    chain.delete = vi.fn().mockReturnThis()
    chain.eq = vi.fn().mockResolvedValue({ error: null })
    vi.spyOn(mockSupabaseClient, 'from').mockReturnValue(chain)

    await deleteFollowUp('fu-1')
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'fu-1')
  })

  it('throws on error', async () => {
    const chain = makeMock(null)
    chain.delete = vi.fn().mockReturnThis()
    chain.eq = vi.fn().mockResolvedValue({ error: { message: 'delete failed' } })
    vi.spyOn(mockSupabaseClient, 'from').mockReturnValue(chain)

    await expect(deleteFollowUp('fu-1')).rejects.toThrow('delete failed')
  })
})

describe('markFollowUpSurfaced', () => {
  it('increments times_surfaced and sets last_surfaced_at', async () => {
    const chain = makeMock(null)
    chain.update = vi.fn().mockReturnThis()
    chain.eq = vi.fn().mockResolvedValue({ error: null })
    vi.spyOn(mockSupabaseClient, 'from').mockReturnValue(chain)

    await markFollowUpSurfaced('fu-1', 2)

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
      times_surfaced: 3,
      last_surfaced_at: expect.any(String),
    }))
    expect(chain.eq).toHaveBeenCalledWith('id', 'fu-1')
  })
})

describe('markFollowUpsSurfaced', () => {
  it('marks multiple follow-ups in parallel', async () => {
    const chain = makeMock(null)
    chain.update = vi.fn().mockReturnThis()
    chain.eq = vi.fn().mockResolvedValue({ error: null })
    vi.spyOn(mockSupabaseClient, 'from').mockReturnValue(chain)

    await markFollowUpsSurfaced([
      { id: 'fu-1', timesSurfaced: 0 },
      { id: 'fu-2', timesSurfaced: 1 },
    ])

    expect(chain.update).toHaveBeenCalledTimes(2)
  })
})
