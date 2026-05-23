/**
 * getTeamCompetencySnapshot — unit tests
 * Tests the pure aggregation logic via mocked Supabase.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getTeamCompetencySnapshot } from '../competency'
import { mockSupabaseClient } from '../../../test/mocks/supabase'

describe('getTeamCompetencySnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty snapshot when personIds is empty', async () => {
    const result = await getTeamCompetencySnapshot([])
    expect(result.areas).toEqual([])
    expect(result.totalPeople).toBe(0)
    expect(result.assessedPeople).toBe(0)
    expect(result.teamId).toBeNull()
  })

  it('returns empty areas when no assessments exist for people', async () => {
    mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'competency_assessments') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      }
      if (table === 'people') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'p1', level: 'Mid' }],
              error: null,
            }),
          }),
        }
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const result = await getTeamCompetencySnapshot(['p1'])
    expect(result.areas).toHaveLength(0)
    expect(result.totalPeople).toBe(1)
    expect(result.assessedPeople).toBe(0)
  })

  it('computes belowExpected / atExpected / aboveExpected correctly', async () => {
    // Person p1 is Mid (expected score=2), assessed at Junior (score=1) → gap=-1 → below
    // Person p2 is Mid (expected score=2), assessed at Mid (score=2) → gap=0 → at
    // Person p3 is Mid (expected score=2), assessed at Senior (score=3) → gap=+1 → above
    const assessments = [
      { person_id: 'p1', area_id: 'a1', assessed_level: 'Junior', score: 1, competency_areas: { name: 'System Design' } },
      { person_id: 'p2', area_id: 'a1', assessed_level: 'Mid',    score: 2, competency_areas: { name: 'System Design' } },
      { person_id: 'p3', area_id: 'a1', assessed_level: 'Senior', score: 3, competency_areas: { name: 'System Design' } },
    ]
    const people = [
      { id: 'p1', level: 'Mid' },
      { id: 'p2', level: 'Mid' },
      { id: 'p3', level: 'Mid' },
    ]

    mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'competency_assessments') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: assessments, error: null }),
            }),
          }),
        }
      }
      if (table === 'people') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: people, error: null }),
          }),
        }
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const result = await getTeamCompetencySnapshot(['p1', 'p2', 'p3'])
    expect(result.areas).toHaveLength(1)
    const area = result.areas[0]
    expect(area.areaName).toBe('System Design')
    expect(area.totalAssessed).toBe(3)
    expect(area.belowExpected).toBe(1)
    expect(area.atExpected).toBe(1)
    expect(area.aboveExpected).toBe(1)
    expect(area.pctBelowExpected).toBeCloseTo(33.33, 1)
    expect(area.avgGap).toBeCloseTo(0, 5)
  })

  it('deduplicates: keeps only latest assessment per person+area', async () => {
    // p1 has two assessments for a1 — the first (Junior) is newer, second (Mid) is older
    // order is descending by assessed_at, so first row wins
    const assessments = [
      { person_id: 'p1', area_id: 'a1', assessed_level: 'Junior', score: 1, competency_areas: { name: 'Delivery' } },
      { person_id: 'p1', area_id: 'a1', assessed_level: 'Mid',    score: 2, competency_areas: { name: 'Delivery' } },
    ]
    const people = [{ id: 'p1', level: 'Senior' }]

    mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'competency_assessments') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: assessments, error: null }),
            }),
          }),
        }
      }
      if (table === 'people') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: people, error: null }),
          }),
        }
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const result = await getTeamCompetencySnapshot(['p1'])
    expect(result.areas).toHaveLength(1)
    // Only one row kept — totalAssessed should be 1
    expect(result.areas[0].totalAssessed).toBe(1)
    // Junior (1) vs Senior expected (3) → gap = -2 → below
    expect(result.areas[0].belowExpected).toBe(1)
    expect(result.areas[0].atExpected).toBe(0)
  })

  it('sorts areas by pctBelowExpected descending', async () => {
    // area-A: 2/2 below = 100%
    // area-B: 1/2 below = 50%
    // area-C: 0/2 below = 0%
    const assessments = [
      { person_id: 'p1', area_id: 'a1', assessed_level: 'Junior', score: 1, competency_areas: { name: 'Area-A' } },
      { person_id: 'p2', area_id: 'a1', assessed_level: 'Junior', score: 1, competency_areas: { name: 'Area-A' } },
      { person_id: 'p1', area_id: 'a2', assessed_level: 'Junior', score: 1, competency_areas: { name: 'Area-B' } },
      { person_id: 'p2', area_id: 'a2', assessed_level: 'Senior', score: 3, competency_areas: { name: 'Area-B' } },
      { person_id: 'p1', area_id: 'a3', assessed_level: 'Senior', score: 3, competency_areas: { name: 'Area-C' } },
      { person_id: 'p2', area_id: 'a3', assessed_level: 'Senior', score: 3, competency_areas: { name: 'Area-C' } },
    ]
    const people = [{ id: 'p1', level: 'Mid' }, { id: 'p2', level: 'Mid' }]

    mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'competency_assessments') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: assessments, error: null }),
            }),
          }),
        }
      }
      if (table === 'people') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: people, error: null }),
          }),
        }
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const result = await getTeamCompetencySnapshot(['p1', 'p2'])
    expect(result.areas[0].areaName).toBe('Area-A')
    expect(result.areas[1].areaName).toBe('Area-B')
    expect(result.areas[2].areaName).toBe('Area-C')
    expect(result.areas[0].pctBelowExpected).toBe(100)
    expect(result.areas[2].pctBelowExpected).toBe(0)
  })

  it('counts assessed people correctly (distinct person_ids with assessments)', async () => {
    const assessments = [
      { person_id: 'p1', area_id: 'a1', assessed_level: 'Mid', score: 2, competency_areas: { name: 'Area-A' } },
      { person_id: 'p1', area_id: 'a2', assessed_level: 'Mid', score: 2, competency_areas: { name: 'Area-B' } },
      // p2 has no assessments
    ]
    const people = [{ id: 'p1', level: 'Mid' }, { id: 'p2', level: 'Mid' }]

    mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'competency_assessments') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: assessments, error: null }),
            }),
          }),
        }
      }
      if (table === 'people') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: people, error: null }),
          }),
        }
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const result = await getTeamCompetencySnapshot(['p1', 'p2'])
    expect(result.totalPeople).toBe(2)
    expect(result.assessedPeople).toBe(1)
  })

  it('propagates teamId to snapshot result', async () => {
    mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'competency_assessments') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      }
      if (table === 'people') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [{ id: 'p1', level: 'Mid' }], error: null }),
          }),
        }
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const result = await getTeamCompetencySnapshot(['p1'], 'team-42')
    expect(result.teamId).toBe('team-42')
  })

  it('falls back to Mid when person level is missing', async () => {
    // Person has null level — expected score should be Mid(2)
    const assessments = [
      { person_id: 'p1', area_id: 'a1', assessed_level: 'Junior', score: 1, competency_areas: { name: 'Delivery' } },
    ]
    const people = [{ id: 'p1', level: null }]

    mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'competency_assessments') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: assessments, error: null }),
            }),
          }),
        }
      }
      if (table === 'people') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: people, error: null }),
          }),
        }
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const result = await getTeamCompetencySnapshot(['p1'])
    expect(result.areas[0].belowExpected).toBe(1)   // Junior(1) < Mid(2)
    expect(result.areas[0].avgGap).toBe(-1)
  })

  it('throws when assessment query returns an error', async () => {
    mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
      if (table === 'competency_assessments') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
            }),
          }),
        }
      }
      if (table === 'people') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [{ id: 'p1', level: 'Mid' }], error: null }),
          }),
        }
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    await expect(getTeamCompetencySnapshot(['p1'])).rejects.toMatchObject({ message: 'DB error' })
  })
})
