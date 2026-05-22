/**
 * Unit tests for getUpcoming1on1s
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getUpcoming1on1s } from '../meetings'
import { createClient } from '@/lib/supabase/client'

vi.mock('@/lib/supabase/client')

const mockMeetingRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'meeting-1',
  title: '1:1 with Alice',
  meeting_type: '1:1',
  meeting_date: '2026-05-23',
  next_meeting_date: null,
  recurrence: null,
  action_items: null,
  notes: null,
  person_id: 'person-1',
  team_id: null,
  person: { full_name: 'Alice Chen' },
  team: null,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  ...overrides,
})

function makeMockSupabase(rows: unknown[]) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: rows, error: null }),
  }
  return {
    from: vi.fn().mockReturnValue(chain),
    auth: { getUser: vi.fn() },
    _chain: chain,
  }
}

describe('getUpcoming1on1s', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns upcoming 1:1s for today and tomorrow', async () => {
    const mockSupabase = makeMockSupabase([mockMeetingRow()])
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase)

    const result = await getUpcoming1on1s('2026-05-23')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('meeting-1')
    expect(result[0].meetingType).toBe('1:1')
    expect(result[0].personName).toBe('Alice Chen')
  })

  it('queries only meeting_type=1:1 with person_id', async () => {
    const mockSupabase = makeMockSupabase([])
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase)

    await getUpcoming1on1s('2026-05-23')

    const chain = mockSupabase._chain
    // eq called with meeting_type = '1:1'
    expect(chain.eq).toHaveBeenCalledWith('meeting_type', '1:1')
    // not called to filter person_id not null
    expect(chain.not).toHaveBeenCalledWith('person_id', 'is', null)
  })

  it('queries date range today to tomorrow', async () => {
    const mockSupabase = makeMockSupabase([])
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase)

    await getUpcoming1on1s('2026-05-23')

    const chain = mockSupabase._chain
    expect(chain.gte).toHaveBeenCalledWith('meeting_date', '2026-05-23')
    expect(chain.lte).toHaveBeenCalledWith('meeting_date', '2026-05-24')
  })

  it('returns empty array when no upcoming 1:1s', async () => {
    const mockSupabase = makeMockSupabase([])
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase)

    const result = await getUpcoming1on1s('2026-05-23')
    expect(result).toEqual([])
  })

  it('returns multiple meetings sorted by date', async () => {
    const today = mockMeetingRow({ id: 'a', meeting_date: '2026-05-23' })
    const tomorrow = mockMeetingRow({ id: 'b', meeting_date: '2026-05-24' })
    const mockSupabase = makeMockSupabase([today, tomorrow])
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase)

    const result = await getUpcoming1on1s('2026-05-23')
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('a')
    expect(result[1].id).toBe('b')
  })

  it('tomorrow date computed correctly at month boundary', async () => {
    const mockSupabase = makeMockSupabase([])
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase)

    await getUpcoming1on1s('2026-05-31')

    const chain = mockSupabase._chain
    expect(chain.lte).toHaveBeenCalledWith('meeting_date', '2026-06-01')
  })

  it('throws on supabase error', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }
    const mockSupabase = { from: vi.fn().mockReturnValue(chain), auth: { getUser: vi.fn() } }
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase)

    await expect(getUpcoming1on1s('2026-05-23')).rejects.toMatchObject({ message: 'DB error' })
  })

  it('uses current date when today param is omitted', async () => {
    const mockSupabase = makeMockSupabase([])
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase)

    await getUpcoming1on1s()

    const chain = mockSupabase._chain
    const today = new Date().toISOString().split('T')[0]
    expect(chain.gte).toHaveBeenCalledWith('meeting_date', today)
  })
})
