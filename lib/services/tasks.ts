/**
 * Tasks Service
 * Handles all database operations for tasks
 */

import { createClient } from '@/lib/supabase/client'
import type { Task, TaskStatus, TaskPriority, TaskCategory } from '@/lib/types/task'

// Determine list based on due date — 'week' if due date is this week or overdue
function resolveList(dueDate: string | null): 'week' | 'backlog' {
  if (!dueDate) return 'backlog'
  const due = new Date(dueDate)
  const now = new Date()
  // Get start of current week (Monday)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  startOfWeek.setHours(0, 0, 0, 0)
  // Get end of current week (Sunday)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)
  // 'week' if overdue or due this week
  return due <= endOfWeek ? 'week' : 'backlog'
}

// Resolve list, letting due-date-derived 'week' override the stored value
function effectiveList(storedList: string | null, dueDate: string | null): 'week' | 'backlog' {
  const derived = resolveList(dueDate)
  // If the task is due this week (or overdue), always show in week board
  if (derived === 'week') return 'week'
  // Otherwise respect the stored list (user may have manually moved it)
  return (storedList as 'week' | 'backlog') || 'backlog'
}

// Map database status to UI status
function mapDbStatusToUi(status: string): TaskStatus {
  const map: Record<string, TaskStatus> = {
    not_started: 'Not started',
    in_progress: 'In progress',
    blocked: 'Blocked',
    completed: 'Done',
  }
  return map[status] ?? 'Not started'
}

// Map UI status to database status
function mapUiStatusToDb(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    'Not started': 'not_started',
    'In progress': 'in_progress',
    'Blocked': 'blocked',
    'Done': 'completed',
  }
  return map[status]
}

// Map database priority to UI priority
function mapDbPriorityToUi(priority: 'low' | 'medium' | 'high' | 'very_high'): TaskPriority {
  const map: Record<string, TaskPriority> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    very_high: 'Very High'
  }
  return map[priority] || 'Medium'
}

// Map UI priority to database priority
function mapUiPriorityToDb(priority: TaskPriority): 'low' | 'medium' | 'high' | 'very_high' {
  const map: Record<TaskPriority, 'low' | 'medium' | 'high' | 'very_high'> = {
    'Low': 'low',
    'Medium': 'medium',
    'High': 'high',
    'Very High': 'very_high'
  }
  return map[priority] || 'medium'
}

// Map DB source to UI category
function mapDbSourceToCategory(source: string): TaskCategory {
  const map: Record<string, TaskCategory> = {
    manual: 'Task',
    meeting_action: 'Meeting',
    recurring_meeting: 'Meeting',
    growth: 'Career Growth',
    performance: 'People',
  }
  return map[source] ?? 'Task'
}

// Map UI category to DB source
function mapCategoryToDbSource(category: TaskCategory): string {
  const map: Record<TaskCategory, string> = {
    'Task': 'manual',
    'Meeting': 'meeting_action',
    'Career Growth': 'growth',
    'People': 'performance',
  }
  return map[category] ?? 'manual'
}

/**
 * Get all tasks for the current user
 */
export async function getTasks(): Promise<Task[]> {
  const supabase = createClient()

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_relations(
        entity_type,
        entity_id
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  return tasks.map((task: any) => ({
    id: task.id,
    title: task.title,
    description: task.description || undefined,
    dueDate: task.due_date,
    priority: mapDbPriorityToUi(task.priority),
    category: mapDbSourceToCategory(task.source),
    status: mapDbStatusToUi(task.status),
    list: effectiveList(task.list, task.due_date),
  }))
}

/**
 * Create a new task
 */
export async function createTask(task: Omit<Task, 'id'>): Promise<Task> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: task.title,
      description: task.description || null,
      due_date: task.dueDate || null,
      priority: mapUiPriorityToDb(task.priority),
      status: mapUiStatusToDb(task.status),
      list: effectiveList(task.list || null, task.dueDate || null),
      source: mapCategoryToDbSource(task.category),
      owning_user_id: user.id,
    } as any)
    .select()
    .single()

  if (error) throw error

  return {
    id: (data as any).id,
    title: (data as any).title,
    description: (data as any).description || undefined,
    dueDate: (data as any).due_date,
    priority: mapDbPriorityToUi((data as any).priority),
    category: mapDbSourceToCategory((data as any).source),
    status: mapDbStatusToUi((data as any).status),
    list: effectiveList((data as any).list, (data as any).due_date),
  }
}

/**
 * Update an existing task
 */
export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const supabase = createClient()

  const dbUpdates: any = {}
  if (updates.title !== undefined) dbUpdates.title = updates.title
  if (updates.description !== undefined) dbUpdates.description = updates.description || null
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate || null
  if (updates.priority !== undefined) dbUpdates.priority = mapUiPriorityToDb(updates.priority)
  if (updates.list !== undefined) dbUpdates.list = updates.list
  if (updates.category !== undefined) dbUpdates.source = mapCategoryToDbSource(updates.category)
  if (updates.status !== undefined) {
    dbUpdates.status = mapUiStatusToDb(updates.status)
    // Set completion date if marking as done
    if (updates.status === 'Done') {
      dbUpdates.completion_date = new Date().toISOString().split('T')[0]
    } else {
      dbUpdates.completion_date = null
    }
  }

  const { data, error } = await (supabase
    .from('tasks') as any)
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return {
    id: (data as any).id,
    title: (data as any).title,
    description: (data as any).description || undefined,
    dueDate: (data as any).due_date,
    priority: mapDbPriorityToUi((data as any).priority),
    category: mapDbSourceToCategory((data as any).source),
    status: mapDbStatusToUi((data as any).status),
    list: effectiveList((data as any).list, (data as any).due_date),
  }
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Move task between lists (week/backlog)
 */
export async function moveTask(id: string, toList: 'week' | 'backlog'): Promise<Task> {
  return updateTask(id, { list: toList })
}
