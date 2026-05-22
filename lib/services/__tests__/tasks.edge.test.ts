/**
 * Tasks Service — Edge Case Evals
 * Covers gaps not addressed by the main tasks.test.ts:
 * - Very high priority mapping
 * - Null/undefined field handling
 * - List assignment logic (week vs backlog)
 * - Task with linked meeting (task_relations)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getTasks, createTask, updateTask } from '../tasks'
import { mockSupabaseClient } from '../../../test/mocks/supabase'

describe('Tasks Service — edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('priority mapping', () => {
    it('maps very_high DB value to "Very High" UI value', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{
              id: '1', title: 'Urgent', status: 'not_started', priority: 'very_high',
              due_date: null, created_at: '2026-01-01T00:00:00Z', task_relations: [],
            }],
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom
      const tasks = await getTasks()
      expect(tasks[0].priority).toBe('Very High')
    })

    it('maps low DB value to "Low" UI value', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{
              id: '1', title: 'Minor', status: 'not_started', priority: 'low',
              due_date: null, created_at: '2026-01-01T00:00:00Z', task_relations: [],
            }],
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom
      const tasks = await getTasks()
      expect(tasks[0].priority).toBe('Low')
    })
  })

  describe('list assignment', () => {
    it('assigns task with no due_date to "backlog"', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{
              id: '1', title: 'No due date', status: 'not_started', priority: 'medium',
              due_date: null, created_at: '2026-01-01T00:00:00Z', task_relations: [],
            }],
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom
      const tasks = await getTasks()
      expect(tasks[0].list).toBe('backlog')
    })

    it('assigns task with due_date in current week to "week"', async () => {
      // Use today's date — guaranteed to be within current week
      const today = new Date().toISOString().slice(0, 10)
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{
              id: '1', title: 'Due today', status: 'not_started', priority: 'medium',
              due_date: today, created_at: '2026-01-01T00:00:00Z', task_relations: [],
            }],
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom
      const tasks = await getTasks()
      expect(tasks[0].list).toBe('week')
    })

    it('assigns task with far-future due_date to "backlog"', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{
              id: '1', title: 'Far future', status: 'not_started', priority: 'medium',
              due_date: '2099-12-31', created_at: '2026-01-01T00:00:00Z', task_relations: [],
            }],
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom
      const tasks = await getTasks()
      expect(tasks[0].list).toBe('backlog')
    })
  })

  describe('status mapping', () => {
    const statusCases: Array<[string, string]> = [
      ['not_started', 'Not started'],
      ['in_progress', 'In progress'],
      ['blocked', 'Blocked'],
      ['completed', 'Done'],
    ]

    it.each(statusCases)('maps DB status "%s" to UI status "%s"', async (dbStatus, uiStatus) => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{
              id: '1', title: 'Task', status: dbStatus, priority: 'medium',
              due_date: null, created_at: '2026-01-01T00:00:00Z', task_relations: [],
            }],
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom
      const tasks = await getTasks()
      expect(tasks[0].status).toBe(uiStatus)
    })
  })

  describe('null field handling', () => {
    it('handles null description gracefully', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{
              id: '1', title: 'No description', description: null, status: 'not_started',
              priority: 'medium', due_date: null, created_at: '2026-01-01T00:00:00Z', task_relations: [],
            }],
            error: null,
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom
      const tasks = await getTasks()
      expect(tasks[0].description).toBeUndefined()
    })
  })

  describe('createTask UI→DB mapping', () => {
    it('maps "Very High" UI priority to "very_high" DB value', async () => {
      let capturedInsertData: Record<string, unknown> = {}
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
          capturedInsertData = data
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: '1', ...data, task_relations: [] },
                error: null,
              }),
            }),
          }
        }),
      })
      mockSupabaseClient.from = mockFrom
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } }, error: null,
      })

      await createTask({ title: 'Critical', priority: 'Very High', status: 'Not started', list: 'week', dueDate: null, category: 'Task' })
      expect(capturedInsertData).toMatchObject({ priority: 'very_high' })
    })

    it('maps "Done" UI status to "completed" DB value', async () => {
      let capturedInsertData: Record<string, unknown> = {}
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
          capturedInsertData = data
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: '1', ...data, task_relations: [] },
                error: null,
              }),
            }),
          }
        }),
      })
      mockSupabaseClient.from = mockFrom
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } }, error: null,
      })

      await createTask({ title: 'Already done', priority: 'Low', status: 'Done', list: 'backlog', dueDate: null, category: 'Task' })
      expect(capturedInsertData).toMatchObject({ status: 'completed' })
    })
  })

  describe('updateTask', () => {
    it('throws when DB update returns error', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
            }),
          }),
        }),
      })
      mockSupabaseClient.from = mockFrom
      await expect(updateTask('task-1', { title: 'New title' })).rejects.toThrow()
    })
  })
})
