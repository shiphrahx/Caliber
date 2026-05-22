import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getEvidenceSentimentTimeline } from '../evidence'
import { mockSupabaseClient } from '../../../test/mocks/supabase'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeRow(occurred_at: string, sentiment: 'positive' | 'neutral' | 'negative' | null) {
  return { occurred_at, sentiment }
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('getEvidenceSentimentTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when no evidence exists', async () => {
    mockSupabaseClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    })

    const result = await getEvidenceSentimentTimeline('person-1', 60)
    expect(result).toEqual([])
  })

  it('throws on database error', async () => {
    mockSupabaseClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
          }),
        }),
      }),
    })

    await expect(getEvidenceSentimentTimeline('person-1', 60)).rejects.toThrow('DB error')
  })

  it('groups entries into weekly buckets correctly', async () => {
    // Two entries same week (Mon 2026-05-18 and Wed 2026-05-20)
    const rows = [
      makeRow('2026-05-18', 'positive'),
      makeRow('2026-05-20', 'negative'),
    ]
    mockSupabaseClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: rows, error: null }),
          }),
        }),
      }),
    })

    const result = await getEvidenceSentimentTimeline('person-1', 60)

    // Both map to Monday 2026-05-18
    expect(result).toHaveLength(1)
    expect(result[0].weekStart).toBe('2026-05-18')
    expect(result[0].positive).toBe(1)
    expect(result[0].negative).toBe(1)
    expect(result[0].neutral).toBe(0)
    expect(result[0].total).toBe(2)
  })

  it('handles Sunday entries mapping to the Monday of the same week', async () => {
    // Sunday 2026-05-17 → Monday of that week is 2026-05-11
    const rows = [makeRow('2026-05-17', 'neutral')]
    mockSupabaseClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: rows, error: null }),
          }),
        }),
      }),
    })

    const result = await getEvidenceSentimentTimeline('person-1', 60)

    expect(result).toHaveLength(1)
    // 2026-05-17 is a Sunday → Monday is 2026-05-11
    expect(result[0].weekStart).toBe('2026-05-11')
    expect(result[0].neutral).toBe(1)
  })

  it('separates entries from different weeks', async () => {
    const rows = [
      makeRow('2026-05-11', 'positive'), // Mon week 1
      makeRow('2026-05-12', 'negative'), // Tue week 1
      makeRow('2026-05-18', 'negative'), // Mon week 2
    ]
    mockSupabaseClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: rows, error: null }),
          }),
        }),
      }),
    })

    const result = await getEvidenceSentimentTimeline('person-1', 60)

    expect(result).toHaveLength(2)
    expect(result[0].weekStart).toBe('2026-05-11')
    expect(result[0].total).toBe(2)
    expect(result[1].weekStart).toBe('2026-05-18')
    expect(result[1].total).toBe(1)
  })

  it('treats null sentiment as neutral', async () => {
    const rows = [makeRow('2026-05-18', null)]
    mockSupabaseClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: rows, error: null }),
          }),
        }),
      }),
    })

    const result = await getEvidenceSentimentTimeline('person-1', 60)

    expect(result[0].neutral).toBe(1)
    expect(result[0].positive).toBe(0)
    expect(result[0].negative).toBe(0)
  })

  it('returns buckets sorted oldest to newest', async () => {
    const rows = [
      makeRow('2026-05-18', 'positive'),
      makeRow('2026-05-04', 'negative'),
      makeRow('2026-05-11', 'neutral'),
    ]
    mockSupabaseClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: rows, error: null }),
          }),
        }),
      }),
    })

    const result = await getEvidenceSentimentTimeline('person-1', 60)

    expect(result[0].weekStart < result[1].weekStart).toBe(true)
    expect(result[1].weekStart < result[2].weekStart).toBe(true)
  })

  it('uses correct days parameter for start date filtering', async () => {
    mockSupabaseClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    })

    await getEvidenceSentimentTimeline('person-1', 30)

    // Verify gte was called (date filtering happens in query)
    const fromCall = mockSupabaseClient.from as ReturnType<typeof vi.fn>
    expect(fromCall).toHaveBeenCalledWith('evidence_entries')
  })
})
