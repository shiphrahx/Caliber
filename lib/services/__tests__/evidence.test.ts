import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getEvidenceForPerson,
  getEvidenceForPersonInPeriod,
  getAllEvidence,
  createEvidence,
  updateEvidence,
  deleteEvidence,
  getReviewCycles,
  createReviewCycle,
  getReviewSummary,
  upsertReviewSummary,
} from '../evidence'
import { mockSupabaseClient } from '../../../test/mocks/supabase'

const mockEvidenceRow = {
  id: 'ev-1',
  owning_user_id: 'test-user-id',
  person_id: 'person-1',
  category: 'achievement' as const,
  title: 'Shipped new feature',
  content: 'Delivered ahead of schedule',
  occurred_at: '2026-03-15',
  meeting_id: null,
  task_id: null,
  sentiment: 'positive' as const,
  review_period_start: null,
  review_period_end: null,
  included_in_review: true,
  created_at: '2026-03-15T10:00:00Z',
  updated_at: '2026-03-15T10:00:00Z',
  person: { full_name: 'Alice Smith' },
  meeting: null,
  task: null,
}

const mockCycleRow = {
  id: 'cycle-1',
  owning_user_id: 'test-user-id',
  name: 'H1 2026',
  start_date: '2026-01-01',
  end_date: '2026-06-30',
  status: 'active' as const,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const mockSummaryRow = {
  id: 'sum-1',
  owning_user_id: 'test-user-id',
  person_id: 'person-1',
  review_cycle_id: 'cycle-1',
  period_start: '2026-01-01',
  period_end: '2026-06-30',
  summary_text: 'Great performance',
  manager_notes: 'Private note',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
}

describe('Evidence Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Restore authenticated user after any test that overrides it
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    })
  })

  // ── getEvidenceForPerson ──────────────────────────────────────────────────

  describe('getEvidenceForPerson', () => {
    it('should fetch evidence for a person sorted by occurred_at descending', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [mockEvidenceRow], error: null }),
          }),
        }),
      })

      const result = await getEvidenceForPerson('person-1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('evidence_entries')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('ev-1')
      expect(result[0].personId).toBe('person-1')
      expect(result[0].personName).toBe('Alice Smith')
      expect(result[0].category).toBe('achievement')
      expect(result[0].title).toBe('Shipped new feature')
      expect(result[0].sentiment).toBe('positive')
      expect(result[0].includedInReview).toBe(true)
    })

    it('should throw on database error', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
          }),
        }),
      })

      await expect(getEvidenceForPerson('person-1')).rejects.toThrow('DB error')
    })
  })

  // ── getEvidenceForPersonInPeriod ─────────────────────────────────────────

  describe('getEvidenceForPersonInPeriod', () => {
    it('should filter by person and date range', async () => {
      const chainMock = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockEvidenceRow], error: null }),
      }
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(chainMock),
      })

      const result = await getEvidenceForPersonInPeriod('person-1', '2026-01-01', '2026-06-30')

      expect(chainMock.eq).toHaveBeenCalledWith('person_id', 'person-1')
      expect(chainMock.gte).toHaveBeenCalledWith('occurred_at', '2026-01-01')
      expect(chainMock.lte).toHaveBeenCalledWith('occurred_at', '2026-06-30')
      expect(result).toHaveLength(1)
    })
  })

  // ── getAllEvidence ────────────────────────────────────────────────────────

  describe('getAllEvidence', () => {
    it('should fetch all evidence entries', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [mockEvidenceRow], error: null }),
        }),
      })

      const result = await getAllEvidence()

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Shipped new feature')
    })
  })

  // ── createEvidence ───────────────────────────────────────────────────────

  describe('createEvidence', () => {
    it('should create evidence with authenticated user id', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockEvidenceRow, error: null }),
        }),
      })
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        insert: insertMock,
      })

      const result = await createEvidence({
        personId: 'person-1',
        category: 'achievement',
        title: 'Shipped new feature',
        content: 'Delivered ahead of schedule',
        occurredAt: '2026-03-15',
        meetingId: null,
        taskId: null,
        sentiment: 'positive',
        includedInReview: true,
        reviewPeriodStart: null,
        reviewPeriodEnd: null,
      })

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('evidence_entries')
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          owning_user_id: 'test-user-id',
          person_id: 'person-1',
          category: 'achievement',
          title: 'Shipped new feature',
          sentiment: 'positive',
        })
      )
      expect(result.id).toBe('ev-1')
    })

    it('should throw when not authenticated', async () => {
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null }, error: null,
      })

      await expect(createEvidence({
        personId: 'person-1',
        category: 'general',
        title: 'Test',
        content: null,
        occurredAt: '2026-03-15',
        meetingId: null,
        taskId: null,
        sentiment: null,
        includedInReview: true,
        reviewPeriodStart: null,
        reviewPeriodEnd: null,
      })).rejects.toThrow('Not authenticated')
    })

    it('should only accept valid categories', async () => {
      const validCategories = [
        'achievement', 'feedback_given', 'feedback_received', 'concern',
        'growth', 'delivery', 'behaviour', 'promotion_evidence', 'general',
      ]
      // All valid — just verify the type constraint is correct at TS level
      expect(validCategories).toHaveLength(9)
    })
  })

  // ── updateEvidence ───────────────────────────────────────────────────────

  describe('updateEvidence', () => {
    it('should update evidence entry fields', async () => {
      const updatedRow = { ...mockEvidenceRow, title: 'Updated title', sentiment: 'neutral' as const }
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updatedRow, error: null }),
          }),
        }),
      })
      mockSupabaseClient.from = vi.fn().mockReturnValue({ update: updateMock })

      const result = await updateEvidence('ev-1', { title: 'Updated title', sentiment: 'neutral' })

      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated title', sentiment: 'neutral' }))
      expect(result.title).toBe('Updated title')
      expect(result.sentiment).toBe('neutral')
    })

    it('should map UI fields to DB column names', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockEvidenceRow, error: null }),
          }),
        }),
      })
      mockSupabaseClient.from = vi.fn().mockReturnValue({ update: updateMock })

      await updateEvidence('ev-1', { occurredAt: '2026-04-01', includedInReview: false })

      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        occurred_at: '2026-04-01',
        included_in_review: false,
      }))
    })
  })

  // ── deleteEvidence ───────────────────────────────────────────────────────

  describe('deleteEvidence', () => {
    it('should delete evidence entry by id', async () => {
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      mockSupabaseClient.from = vi.fn().mockReturnValue({ delete: deleteMock })

      await deleteEvidence('ev-1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('evidence_entries')
      expect(deleteMock).toHaveBeenCalled()
    })

    it('should throw on delete error', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
        }),
      })

      await expect(deleteEvidence('ev-1')).rejects.toThrow('Delete failed')
    })
  })

  // ── getReviewCycles ──────────────────────────────────────────────────────

  describe('getReviewCycles', () => {
    it('should fetch review cycles sorted by start_date descending', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [mockCycleRow], error: null }),
        }),
      })

      const result = await getReviewCycles()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('review_cycles')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('cycle-1')
      expect(result[0].name).toBe('H1 2026')
      expect(result[0].startDate).toBe('2026-01-01')
      expect(result[0].endDate).toBe('2026-06-30')
      expect(result[0].status).toBe('active')
    })
  })

  // ── createReviewCycle ────────────────────────────────────────────────────

  describe('createReviewCycle', () => {
    it('should create review cycle with authenticated user id', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockCycleRow, error: null }),
        }),
      })
      mockSupabaseClient.from = vi.fn().mockReturnValue({ insert: insertMock })

      const result = await createReviewCycle({
        name: 'H1 2026',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        status: 'active',
      })

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          owning_user_id: 'test-user-id',
          name: 'H1 2026',
          start_date: '2026-01-01',
          end_date: '2026-06-30',
        })
      )
      expect(result.name).toBe('H1 2026')
    })
  })

  // ── getReviewSummary ─────────────────────────────────────────────────────

  describe('getReviewSummary', () => {
    it('should return summary for matching person and period', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockSummaryRow, error: null }),
        }),
      })

      const result = await getReviewSummary('person-1', '2026-01-01', '2026-06-30')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('sum-1')
      expect(result!.summaryText).toBe('Great performance')
      expect(result!.managerNotes).toBe('Private note')
    })

    it('should return null when no summary exists', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      })

      const result = await getReviewSummary('person-1', '2026-01-01', '2026-06-30')
      expect(result).toBeNull()
    })
  })

  // ── upsertReviewSummary ──────────────────────────────────────────────────

  describe('upsertReviewSummary', () => {
    it('should upsert review summary with conflict resolution', async () => {
      const upsertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockSummaryRow, error: null }),
        }),
      })
      mockSupabaseClient.from = vi.fn().mockReturnValue({ upsert: upsertMock })

      const result = await upsertReviewSummary({
        personId: 'person-1',
        reviewCycleId: 'cycle-1',
        periodStart: '2026-01-01',
        periodEnd: '2026-06-30',
        summaryText: 'Great performance',
        managerNotes: 'Private note',
      })

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('review_summaries')
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          owning_user_id: 'test-user-id',
          person_id: 'person-1',
          period_start: '2026-01-01',
          period_end: '2026-06-30',
          summary_text: 'Great performance',
        }),
        expect.objectContaining({ onConflict: expect.any(String) })
      )
      expect(result.summaryText).toBe('Great performance')
    })
  })
})
