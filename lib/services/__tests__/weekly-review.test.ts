import { describe, it, expect, beforeEach, vi } from 'vitest'
import '../../../test/mocks/supabase'
import { mockSupabaseClient } from '../../../test/mocks/supabase'
import {
  getMondayOfWeek,
  getSundayOfWeek,
  formatWeekRange,
  getOrCreateWeeklyReview,
  getWeeklyReview,
  updateReviewNotes,
  completeWeeklyReview,
  reopenWeeklyReview,
  getDismissedItems,
  dismissItem,
} from '../weekly-review'

describe('getMondayOfWeek', () => {
  it('returns current Monday for a Wednesday', () => {
    // 2026-04-29 is a Wednesday
    const result = getMondayOfWeek(new Date('2026-04-29'))
    expect(result).toBe('2026-04-27')
  })

  it('returns same day when called on Monday', () => {
    const result = getMondayOfWeek(new Date('2026-04-27'))
    expect(result).toBe('2026-04-27')
  })

  it('returns previous Monday when called on Sunday', () => {
    const result = getMondayOfWeek(new Date('2026-05-03'))
    expect(result).toBe('2026-04-27')
  })

  it('handles year boundary', () => {
    const result = getMondayOfWeek(new Date('2026-01-01'))
    expect(result).toBe('2025-12-29')
  })
})

describe('getSundayOfWeek', () => {
  it('returns Sunday 6 days after Monday', () => {
    const result = getSundayOfWeek(new Date('2026-04-27'))
    expect(result).toBe('2026-05-03')
  })
})

describe('formatWeekRange', () => {
  it('formats a week range correctly', () => {
    const result = formatWeekRange('2026-04-27')
    expect(result).toContain('27')
    expect(result).toContain('Apr')
    expect(result).toContain('3')
    expect(result).toContain('May')
  })

  it('includes year in output', () => {
    const result = formatWeekRange('2026-04-27')
    expect(result).toContain('2026')
  })
})

describe('Weekly Review Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockReviewRow = {
    id: 'review-1',
    user_id: 'test-user-id',
    week_start: '2026-04-27',
    status: 'in_progress' as const,
    completed_at: null,
    notes: null,
    snapshot: null,
    created_at: '2026-04-27T09:00:00Z',
    updated_at: '2026-04-27T09:00:00Z',
  }

  describe('getWeeklyReview', () => {
    it('returns null when no review exists', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      })

      const result = await getWeeklyReview('2026-04-27')
      expect(result).toBeNull()
    })

    it('maps row to WeeklyReview correctly', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: mockReviewRow, error: null }),
            }),
          }),
        }),
      })

      const result = await getWeeklyReview('2026-04-27')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('review-1')
      expect(result!.weekStart).toBe('2026-04-27')
      expect(result!.status).toBe('in_progress')
      expect(result!.userId).toBe('test-user-id')
    })
  })

  describe('getOrCreateWeeklyReview', () => {
    it('returns existing review if found', async () => {
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockReviewRow, error: null }),
          }),
        }),
      }
      mockSupabaseClient.from = vi.fn()
        .mockReturnValueOnce({ upsert: vi.fn().mockResolvedValue({ error: null }) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(selectChain) })

      const result = await getOrCreateWeeklyReview('2026-04-27')
      expect(result.id).toBe('review-1')
    })

    it('creates new review when none exists', async () => {
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockReviewRow, error: null }),
          }),
        }),
      }
      mockSupabaseClient.from = vi.fn()
        .mockReturnValueOnce({ upsert: vi.fn().mockResolvedValue({ error: null }) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(selectChain) })

      const result = await getOrCreateWeeklyReview('2026-04-27')
      expect(result.id).toBe('review-1')
    })
  })

  describe('completeWeeklyReview', () => {
    it('sets status to completed and saves snapshot', async () => {
      const completedRow = { ...mockReviewRow, status: 'completed' as const, completed_at: '2026-04-29T10:00:00Z', snapshot: { totalSignals: 3 } }
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: completedRow, error: null }),
            }),
          }),
        }),
      })

      const snapshot = {
        overdueTasks: 1, noRecent1on1: 1, unresolvedActions: 1,
        noEvidence: 0, upcomingDeadlines: 0, missingNotes: 0,
        totalSignals: 3, criticalSignals: 1, warningSignals: 2,
      }
      const result = await completeWeeklyReview('review-1', snapshot)
      expect(result.status).toBe('completed')
    })
  })

  describe('reopenWeeklyReview', () => {
    it('sets status back to in_progress', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockReviewRow, error: null }),
            }),
          }),
        }),
      })

      const result = await reopenWeeklyReview('review-1')
      expect(result.status).toBe('in_progress')
    })
  })

  describe('getDismissedItems', () => {
    it('returns empty array when no items dismissed', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      })

      const result = await getDismissedItems('review-1')
      expect(result).toEqual([])
    })

    it('maps dismissed rows correctly', async () => {
      const mockRow = {
        id: 'dismiss-1',
        user_id: 'test-user-id',
        weekly_review_id: 'review-1',
        item_type: 'overdue_task',
        reference_id: 'task-1',
        reference_type: 'task',
        dismissed_at: '2026-04-27T10:00:00Z',
        note: 'handled',
      }
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [mockRow], error: null }),
        }),
      })

      const result = await getDismissedItems('review-1')
      expect(result).toHaveLength(1)
      expect(result[0].itemType).toBe('overdue_task')
      expect(result[0].referenceId).toBe('task-1')
    })
  })

  describe('dismissItem', () => {
    it('inserts dismissed item and returns mapped result', async () => {
      const mockRow = {
        id: 'dismiss-2',
        user_id: 'test-user-id',
        weekly_review_id: 'review-1',
        item_type: 'no_recent_1on1',
        reference_id: 'person-1',
        reference_type: 'person',
        dismissed_at: '2026-04-27T11:00:00Z',
        note: 'on leave',
      }
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
          }),
        }),
      })

      const result = await dismissItem('review-1', 'no_recent_1on1', 'person-1', 'person', 'on leave')
      expect(result.itemType).toBe('no_recent_1on1')
      expect(result.note).toBe('on leave')
    })
  })

  describe('updateReviewNotes', () => {
    it('calls update with correct notes', async () => {
      const updateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      mockSupabaseClient.from = vi.fn().mockReturnValue({ update: updateFn })

      await updateReviewNotes('review-1', 'great week')
      expect(updateFn).toHaveBeenCalledWith({ notes: 'great week' })
    })
  })
})
