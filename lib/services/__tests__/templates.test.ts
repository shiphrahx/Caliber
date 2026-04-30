import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  softDeleteTemplate,
  restoreTemplate,
  seedDefaultTemplates,
} from '../templates'
import { mockSupabaseClient } from '../../../test/mocks/supabase'

describe('Templates Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })
  })

  describe('getTemplates', () => {
    it('should split active and soft-deleted templates', async () => {
      const mockRows = [
        { id: '1', name: 'Weekly 1:1', notes: 'Notes...', is_deleted: false },
        { id: '2', name: 'Team Retro', notes: 'Retro notes', is_deleted: false },
        { id: '3', name: 'Old Template', notes: '', is_deleted: true },
      ]

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
        }),
      })

      const result = await getTemplates()

      expect(result.active).toHaveLength(2)
      expect(result.deleted).toHaveLength(1)
      expect(result.active[0]).toEqual({ id: '1', name: 'Weekly 1:1', notes: 'Notes...' })
      expect(result.deleted[0]).toEqual({ id: '3', name: 'Old Template', notes: '' })
    })

    it('should return empty lists when no templates exist', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      })

      const result = await getTemplates()

      expect(result.active).toHaveLength(0)
      expect(result.deleted).toHaveLength(0)
    })

    it('should throw when the database returns an error', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      })

      await expect(getTemplates()).rejects.toMatchObject({ message: 'DB error' })
    })
  })

  describe('createTemplate', () => {
    it('should insert a template and return the created record', async () => {
      const created = { id: 'new-id', name: '1:1 Template', notes: 'Check-in notes' }

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: created, error: null }),
          }),
        }),
      })

      const result = await createTemplate({ name: '1:1 Template', notes: 'Check-in notes' })

      expect(result).toEqual({ id: 'new-id', name: '1:1 Template', notes: 'Check-in notes' })
    })

    it('should throw when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await expect(
        createTemplate({ name: 'Template', notes: '' })
      ).rejects.toThrow('Not authenticated')
    })

    it('should throw when insert fails', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
          }),
        }),
      })

      await expect(
        createTemplate({ name: 'Template', notes: '' })
      ).rejects.toMatchObject({ message: 'Insert failed' })
    })
  })

  describe('updateTemplate', () => {
    it('should update name and notes', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      })
      mockSupabaseClient.from = mockFrom

      await expect(
        updateTemplate('template-1', { name: 'Updated Name', notes: 'Updated notes' })
      ).resolves.not.toThrow()

      expect(mockFrom).toHaveBeenCalledWith('meeting_templates')
    })

    it('should throw when update fails', async () => {
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
        }),
      })

      await expect(
        updateTemplate('template-1', { name: 'Name' })
      ).rejects.toMatchObject({ message: 'Update failed' })
    })
  })

  describe('softDeleteTemplate', () => {
    it('should set is_deleted to true', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      mockSupabaseClient.from = vi.fn().mockReturnValue({ update: mockUpdate })

      await softDeleteTemplate('template-1')

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_deleted: true }))
    })
  })

  describe('restoreTemplate', () => {
    it('should set is_deleted to false', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      mockSupabaseClient.from = vi.fn().mockReturnValue({ update: mockUpdate })

      await restoreTemplate('template-1')

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ is_deleted: false }))
    })
  })

  describe('seedDefaultTemplates', () => {
    it('should insert multiple templates and return them', async () => {
      const defaults = [
        { id: '', name: 'Template A', notes: 'Notes A' },
        { id: '', name: 'Template B', notes: 'Notes B' },
      ]
      const created = [
        { id: 'id-a', name: 'Template A', notes: 'Notes A' },
        { id: 'id-b', name: 'Template B', notes: 'Notes B' },
      ]

      mockSupabaseClient.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: created, error: null }),
        }),
      })

      const result = await seedDefaultTemplates(defaults)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ id: 'id-a', name: 'Template A', notes: 'Notes A' })
    })

    it('should throw when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await expect(seedDefaultTemplates([])).rejects.toThrow('Not authenticated')
    })
  })
})
