import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getCareerGoalsProfile,
  upsertCareerGoalsProfile,
  getGapAnalysisCategories,
  createGapAnalysisCategory,
  updateGapAnalysisCategory,
  deleteGapAnalysisCategory,
  upsertFocusDistribution,
  getCareerGoals,
  createCareerGoal,
  updateCareerGoal,
  deleteCareerGoal,
  getAchievements,
  createAchievement,
  getGoalsWithLastEvidenceDate,
} from '../career-goals'
import { mockSupabaseClient } from '../../../test/mocks/supabase'

describe('Career Goals Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })
  })

  // ============================================================================
  // PROFILE
  // ============================================================================

  describe('getCareerGoalsProfile', () => {
    it('should return null when no profile exists (PGRST116)', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows found' },
          }),
        }),
      })

      const result = await getCareerGoalsProfile()
      expect(result).toBeNull()
    })

    it('should return a mapped profile when one exists', async () => {
      const row = {
        id: 'profile-1',
        where_you_are: 'Senior Engineer',
        where_you_want_to_go: 'Staff Engineer',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: row, error: null }),
        }),
      })

      const result = await getCareerGoalsProfile()

      expect(result).toMatchObject({
        id: 'profile-1',
        whereYouAre: 'Senior Engineer',
        whereYouWantToGo: 'Staff Engineer',
      })
    })

    it('should throw on unexpected database errors', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '42P01', message: 'Table does not exist' },
          }),
        }),
      })

      await expect(getCareerGoalsProfile()).rejects.toMatchObject({ code: '42P01' })
    })
  })

  describe('upsertCareerGoalsProfile', () => {
    it('should upsert and return the profile', async () => {
      const row = {
        id: 'profile-1',
        where_you_are: 'Updated',
        where_you_want_to_go: 'Goal',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: row, error: null }),
          }),
        }),
      })

      const result = await upsertCareerGoalsProfile({ whereYouAre: 'Updated', whereYouWantToGo: 'Goal' })

      expect(result.whereYouAre).toBe('Updated')
    })

    it('should throw when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await expect(
        upsertCareerGoalsProfile({ whereYouAre: 'x' })
      ).rejects.toThrow('Not authenticated')
    })
  })

  // ============================================================================
  // GAP ANALYSIS CATEGORIES
  // ============================================================================

  describe('getGapAnalysisCategories', () => {
    it('should return mapped categories', async () => {
      const rows = [
        { id: 'cat-1', category: 'Leadership', current_state: 'Learning', desired_state: 'Leading', display_order: 1, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      ]

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: rows, error: null }),
          }),
        }),
      })

      const result = await getGapAnalysisCategories()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'cat-1',
        category: 'Leadership',
        currentState: 'Learning',
        desiredState: 'Leading',
        displayOrder: 1,
      })
    })
  })

  describe('createGapAnalysisCategory', () => {
    it('should insert and return a new category', async () => {
      const row = { id: 'cat-new', category: 'Technical', current_state: 'Mid', desired_state: 'Expert', display_order: 0, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: row, error: null }),
          }),
        }),
      })

      const result = await createGapAnalysisCategory({
        category: 'Technical',
        currentState: 'Mid',
        desiredState: 'Expert',
        displayOrder: 0,
      })

      expect(result.category).toBe('Technical')
      expect(result.id).toBe('cat-new')
    })

    it('should throw when not authenticated', async () => {
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })
      await expect(
        createGapAnalysisCategory({ category: 'x', currentState: '', desiredState: '', displayOrder: 0 })
      ).rejects.toThrow('Not authenticated')
    })
  })

  describe('updateGapAnalysisCategory', () => {
    it('should update and return the category', async () => {
      const row = { id: 'cat-1', category: 'Updated', current_state: 'New', desired_state: 'Future', display_order: 2, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-02T00:00:00Z' }

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: row, error: null }),
            }),
          }),
        }),
      })

      const result = await updateGapAnalysisCategory('cat-1', { category: 'Updated' })
      expect(result.category).toBe('Updated')
    })
  })

  describe('deleteGapAnalysisCategory', () => {
    it('should delete without error', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      })

      await expect(deleteGapAnalysisCategory('cat-1')).resolves.not.toThrow()
    })
  })

  // ============================================================================
  // FOCUS DISTRIBUTIONS
  // ============================================================================

  describe('upsertFocusDistribution', () => {
    it('should upsert and return the distribution', async () => {
      const row = {
        id: 'dist-1',
        time_period: 'short_term',
        category_id: 'cat-1',
        focus_percent: 40,
        why: 'Priority area',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        gap_analysis_categories: { category: 'Leadership' },
      }

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: row, error: null }),
          }),
        }),
      })

      const result = await upsertFocusDistribution({
        timePeriod: 'short_term',
        categoryId: 'cat-1',
        focusPercent: 40,
        why: 'Priority area',
      })

      expect(result.focusPercent).toBe(40)
      expect(result.category).toBe('Leadership')
    })

    it('should clamp focusPercent to 0–100', async () => {
      const row = {
        id: 'dist-1',
        time_period: 'short_term',
        category_id: 'cat-1',
        focus_percent: 100,
        why: '',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        gap_analysis_categories: { category: 'Tech' },
      }

      const mockUpsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: row, error: null }),
        }),
      })
      mockSupabaseClient.from = vi.fn().mockReturnValue({ upsert: mockUpsert })

      await upsertFocusDistribution({ timePeriod: 'short_term', categoryId: 'cat-1', focusPercent: 150, why: '' })

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ focus_percent: 100 }),
        expect.anything()
      )
    })
  })

  // ============================================================================
  // CAREER GOALS
  // ============================================================================

  describe('getCareerGoals', () => {
    it('should return mapped goals for a time period', async () => {
      const rows = [
        {
          id: 'goal-1',
          time_period: 'short_term',
          goal: 'Ship a major feature',
          type: 'Core',
          category_id: 'cat-1',
          status: 'Not started',
          display_order: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          gap_analysis_categories: { category: 'Technical' },
        },
      ]

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: rows, error: null }),
            }),
          }),
        }),
      })

      const result = await getCareerGoals('short_term')

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'goal-1',
        goal: 'Ship a major feature',
        type: 'Core',
        status: 'Not started',
        category: 'Technical',
      })
    })
  })

  describe('createCareerGoal', () => {
    it('should insert and return the new goal', async () => {
      const row = {
        id: 'goal-new',
        time_period: 'mid_term',
        goal: 'Mentor two engineers',
        type: 'Stretch',
        category_id: 'cat-1',
        status: 'Not started',
        display_order: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        gap_analysis_categories: { category: 'Leadership' },
      }

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: row, error: null }),
          }),
        }),
      })

      const result = await createCareerGoal({
        timePeriod: 'mid_term',
        goal: 'Mentor two engineers',
        type: 'Stretch',
        categoryId: 'cat-1',
        status: 'Not started',
        displayOrder: 1,
      })

      expect(result.goal).toBe('Mentor two engineers')
      expect(result.type).toBe('Stretch')
    })

    it('should throw when not authenticated', async () => {
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })
      await expect(
        createCareerGoal({ timePeriod: 'short_term', goal: '', type: 'Core', categoryId: '', status: 'Not started', displayOrder: 0 })
      ).rejects.toThrow('Not authenticated')
    })
  })

  describe('updateCareerGoal', () => {
    it('should update status and return the goal', async () => {
      const row = {
        id: 'goal-1',
        time_period: 'short_term',
        goal: 'Goal text',
        type: 'Core',
        category_id: 'cat-1',
        status: 'In progress',
        display_order: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        gap_analysis_categories: { category: 'Technical' },
      }

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: row, error: null }),
            }),
          }),
        }),
      })

      const result = await updateCareerGoal('goal-1', { status: 'In progress' })
      expect(result.status).toBe('In progress')
    })
  })

  describe('deleteCareerGoal', () => {
    it('should delete without error', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      })

      await expect(deleteCareerGoal('goal-1')).resolves.not.toThrow()
    })
  })

  // ============================================================================
  // ACHIEVEMENTS
  // ============================================================================

  describe('getAchievements', () => {
    it('should return mapped achievements', async () => {
      const rows = [
        {
          id: 'ach-1',
          type: 'Book',
          description: 'The Manager\'s Path',
          achievement_date: '2024-01-15',
          key_takeaway: 'Great leadership insights',
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        },
      ]

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: rows, error: null }),
          }),
        }),
      })

      const result = await getAchievements()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'ach-1',
        type: 'Book',
        description: 'The Manager\'s Path',
        achievementDate: '2024-01-15',
        keyTakeaway: 'Great leadership insights',
      })
    })
  })

  describe('createAchievement', () => {
    it('should insert and return the achievement', async () => {
      const row = {
        id: 'ach-new',
        type: 'Course',
        description: 'AWS Solutions Architect',
        achievement_date: '2024-03-01',
        key_takeaway: 'Cloud architecture patterns',
        created_at: '2024-03-01T00:00:00Z',
        updated_at: '2024-03-01T00:00:00Z',
      }

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: row, error: null }),
          }),
        }),
      })

      const result = await createAchievement({
        type: 'Course',
        description: 'AWS Solutions Architect',
        achievementDate: '2024-03-01',
        keyTakeaway: 'Cloud architecture patterns',
      })

      expect(result.type).toBe('Course')
      expect(result.keyTakeaway).toBe('Cloud architecture patterns')
    })

    it('should throw when not authenticated', async () => {
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })
      await expect(
        createAchievement({ type: 'Book', description: '', achievementDate: '', keyTakeaway: '' })
      ).rejects.toThrow('Not authenticated')
    })
  })

  // ============================================================================
  // GOALS WITH LAST EVIDENCE DATE (STALENESS)
  // ============================================================================

  describe('getGoalsWithLastEvidenceDate', () => {
    it('returns empty array when no non-completed goals exist', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      })

      const result = await getGoalsWithLastEvidenceDate()
      expect(result).toEqual([])
    })

    it('maps database rows to GoalStalenessRecord shape', async () => {
      const rows = [
        {
          id: 'goal-1',
          goal: 'Learn system design',
          time_period: 'short_term',
          status: 'In progress',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ]

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: rows, error: null }),
          }),
        }),
      })

      const result = await getGoalsWithLastEvidenceDate()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        goalId: 'goal-1',
        goalTitle: 'Learn system design',
        timePeriod: 'short_term',
        status: 'In progress',
        lastUpdatedAt: '2024-01-15',
      })
    })

    it('strips time component from updated_at', async () => {
      const rows = [
        {
          id: 'goal-2',
          goal: 'Get promoted',
          time_period: 'long_term',
          status: 'Not started',
          updated_at: '2024-06-01T23:59:59.999Z',
        },
      ]

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: rows, error: null }),
          }),
        }),
      })

      const result = await getGoalsWithLastEvidenceDate()
      expect(result[0].lastUpdatedAt).toBe('2024-06-01')
    })

    it('maps multiple goals including different time periods', async () => {
      const rows = [
        {
          id: 'g1',
          goal: 'Short goal',
          time_period: 'short_term',
          status: 'Not started',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'g2',
          goal: 'Mid goal',
          time_period: 'mid_term',
          status: 'In progress',
          updated_at: '2024-02-01T00:00:00Z',
        },
        {
          id: 'g3',
          goal: 'Long goal',
          time_period: 'long_term',
          status: 'Not started',
          updated_at: '2024-03-01T00:00:00Z',
        },
      ]

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: rows, error: null }),
          }),
        }),
      })

      const result = await getGoalsWithLastEvidenceDate()

      expect(result).toHaveLength(3)
      expect(result.map(r => r.timePeriod)).toEqual(['short_term', 'mid_term', 'long_term'])
      expect(result.map(r => r.goalId)).toEqual(['g1', 'g2', 'g3'])
    })

    it('throws on database error', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '42P01', message: 'relation does not exist' },
            }),
          }),
        }),
      })

      await expect(getGoalsWithLastEvidenceDate()).rejects.toMatchObject({ code: '42P01' })
    })

    it('excludes Completed goals (query uses neq Completed)', async () => {
      // The function queries with .neq('status', 'Completed')
      // We verify the neq call is made with correct arguments
      const neqMock = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ neq: neqMock }),
      })

      await getGoalsWithLastEvidenceDate()

      expect(neqMock).toHaveBeenCalledWith('status', 'Completed')
    })
  })
})
