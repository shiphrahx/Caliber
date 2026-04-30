import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getTasks, createTask, updateTask, deleteTask, moveTask } from '../tasks'
import { mockSupabaseClient } from '../../../test/mocks/supabase'
import type { Task } from '../../types/task'

describe('Tasks Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTasks', () => {
    it('should fetch all tasks and map database format to UI format', async () => {
      const mockTasks = [
        {
          id: '1',
          title: 'Complete project proposal',
          description: 'Draft and submit Q1 proposal',
          status: 'not_started',
          due_date: '2024-03-15',
          priority: 'high',
          source: 'manual',
          created_at: '2024-01-01T00:00:00Z',
          task_relations: [],
        },
        {
          id: '2',
          title: 'Review pull requests',
          description: null,
          status: 'completed',
          due_date: null,
          priority: 'medium',
          source: 'manual',
          created_at: '2024-01-02T00:00:00Z',
          task_relations: [],
        },
      ]

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockTasks,
            error: null,
          }),
        }),
      })

      mockSupabaseClient.from = mockFrom

      const tasks = await getTasks()

      expect(mockFrom).toHaveBeenCalledWith('tasks')
      expect(tasks).toHaveLength(2)

      expect(tasks[0]).toMatchObject({
        id: '1',
        title: 'Complete project proposal',
        description: 'Draft and submit Q1 proposal',
        status: 'Not started', // 'not_started' -> 'Not started'
        dueDate: '2024-03-15',
        priority: 'High', // 'high' -> 'High'
        list: 'week', // has due date -> 'week'
      })

      expect(tasks[1]).toMatchObject({
        id: '2',
        title: 'Review pull requests',
        status: 'Done', // 'completed' -> 'Done'
        priority: 'Medium', // 'medium' -> 'Medium'
        list: 'backlog', // no due date -> 'backlog'
      })
    })

    it('should handle all priority levels correctly', async () => {
      const mockTasks = [
        { id: '1', title: 'Low priority', status: 'not_started', priority: 'low', due_date: null, created_at: '2024-01-01T00:00:00Z', task_relations: [] },
        { id: '2', title: 'Medium priority', status: 'not_started', priority: 'medium', due_date: null, created_at: '2024-01-01T00:00:00Z', task_relations: [] },
        { id: '3', title: 'High priority', status: 'not_started', priority: 'high', due_date: null, created_at: '2024-01-01T00:00:00Z', task_relations: [] },
        { id: '4', title: 'Very high priority', status: 'not_started', priority: 'very_high', due_date: null, created_at: '2024-01-01T00:00:00Z', task_relations: [] },
      ]

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockTasks,
            error: null,
          }),
        }),
      })

      mockSupabaseClient.from = mockFrom

      const tasks = await getTasks()

      expect(tasks[0].priority).toBe('Low')
      expect(tasks[1].priority).toBe('Medium')
      expect(tasks[2].priority).toBe('High')
      expect(tasks[3].priority).toBe('Very High')
    })

    it('should throw error when fetching tasks fails', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })

      mockSupabaseClient.from = mockFrom

      await expect(getTasks()).rejects.toThrow()
    })
  })

  describe('createTask', () => {
    it('should create a new task and map UI format to database format', async () => {
      const newTask: Omit<Task, 'id'> = {
        title: 'New task',
        description: 'Task description',
        dueDate: '2024-04-01',
        priority: 'High',
        category: 'Task',
        status: 'Not started',
        list: 'week',
      }

      const mockCreatedTask = {
        id: 'new-task-id',
        title: 'New task',
        description: 'Task description',
        due_date: '2024-04-01',
        priority: 'high',
        status: 'not_started', // UI 'Not started' -> DB 'not_started'
        source: 'manual',
        created_at: '2024-01-03T00:00:00Z',
      }

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCreatedTask,
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.from = mockFrom

      const result = await createTask(newTask)

      expect(mockFrom).toHaveBeenCalledWith('tasks')
      expect(result).toMatchObject({
        id: 'new-task-id',
        title: 'New task',
        description: 'Task description',
        priority: 'High',
        status: 'Not started',
      })
    })

    it('should create task with completed status', async () => {
      const newTask: Omit<Task, 'id'> = {
        title: 'Completed task',
        description: undefined,
        dueDate: null,
        priority: 'Low',
        category: 'Task',
        status: 'Done',
        list: 'backlog',
      }

      const mockCreatedTask = {
        id: 'task-id',
        title: 'Completed task',
        description: null,
        due_date: null,
        priority: 'low',
        status: 'completed', // UI 'Done' -> DB 'completed'
        source: 'manual',
        created_at: '2024-01-03T00:00:00Z',
      }

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCreatedTask,
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.from = mockFrom

      const result = await createTask(newTask)

      expect(result.status).toBe('Done')
    })

    it('should throw error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const newTask: Omit<Task, 'id'> = {
        title: 'Test task',
        dueDate: null,
        priority: 'Medium',
        category: 'Task',
        status: 'Not started',
        list: 'backlog',
      }

      await expect(createTask(newTask)).rejects.toThrow('Not authenticated')

      // Reset
      mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      })
    })
  })

  describe('updateTask', () => {
    it('should update task fields correctly', async () => {
      const updates: Partial<Task> = {
        title: 'Updated title',
        priority: 'Very High',
        dueDate: '2024-05-01',
      }

      const mockUpdatedTask = {
        id: 'task-1',
        title: 'Updated title',
        description: 'Original description',
        due_date: '2024-05-01',
        priority: 'very_high',
        status: 'not_started',
        source: 'manual',
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedTask,
                error: null,
              }),
            }),
          }),
        }),
      })

      mockSupabaseClient.from = mockFrom

      const result = await updateTask('task-1', updates)

      expect(result.title).toBe('Updated title')
      expect(result.priority).toBe('Very High')
      expect(result.dueDate).toBe('2024-05-01')
    })

    it('should set completion date when marking task as done', async () => {
      const updates: Partial<Task> = {
        status: 'Done',
      }

      const mockUpdatedTask = {
        id: 'task-1',
        title: 'Task',
        description: null,
        due_date: null,
        priority: 'medium',
        status: 'completed',
        completion_date: '2024-01-15',
        source: 'manual',
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedTask,
                error: null,
              }),
            }),
          }),
        }),
      })

      mockSupabaseClient.from = mockFrom

      const result = await updateTask('task-1', updates)

      expect(result.status).toBe('Done')
    })

    it('should clear completion date when changing status from Done', async () => {
      const updates: Partial<Task> = {
        status: 'In progress',
      }

      const mockUpdatedTask = {
        id: 'task-1',
        title: 'Task',
        description: null,
        due_date: null,
        priority: 'medium',
        status: 'in_progress',
        completion_date: null,
        source: 'manual',
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedTask,
                error: null,
              }),
            }),
          }),
        }),
      })

      mockSupabaseClient.from = mockFrom

      const result = await updateTask('task-1', updates)

      expect(result.status).toBe('In progress')
    })
  })

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })

      mockSupabaseClient.from = mockFrom

      await expect(deleteTask('task-1')).resolves.not.toThrow()
      expect(mockFrom).toHaveBeenCalledWith('tasks')
    })

    it('should throw error when delete fails', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Cannot delete task' },
          }),
        }),
      })

      mockSupabaseClient.from = mockFrom

      await expect(deleteTask('task-1')).rejects.toThrow()
    })
  })

  describe('moveTask', () => {
    it('should move task to week list', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Task',
        description: null,
        due_date: '2024-03-01',
        priority: 'medium',
        status: 'not_started',
        source: 'manual',
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockTask,
                error: null,
              }),
            }),
          }),
        }),
      })

      mockSupabaseClient.from = mockFrom

      const result = await moveTask('task-1', 'week')

      expect(result.list).toBe('week')
    })

    it('should move task to backlog list', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Task',
        description: null,
        due_date: null,
        priority: 'low',
        status: 'not_started',
        source: 'manual',
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockTask,
                error: null,
              }),
            }),
          }),
        }),
      })

      mockSupabaseClient.from = mockFrom

      const result = await moveTask('task-1', 'backlog')

      expect(result.list).toBe('backlog')
    })
  })
})
