/**
 * Tasks Service
 * Handles all database operations for tasks
 */

import { createClient } from '@/lib/supabase/client'
import type { Task, TaskStatus, TaskPriority, TaskCategory } from '@/lib/types/task'
import { callAI } from '@/lib/services/ai'
import {
  TASK_PRIORITISATION_SYSTEM,
  buildTaskPrioritisationPrompt,
  type TaskPrioritisationInput,
  type TaskRanking,
  type TaskPrioritisationResult,
} from '@/lib/ai/prompts'

export type { TaskPrioritisationInput, TaskRanking, TaskPrioritisationResult }

type DbPriority = 'low' | 'medium' | 'high' | 'very_high'
type DbStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed'
type DbSource = 'manual' | 'meeting_action' | 'recurring_meeting' | 'growth' | 'performance'
type DbList = 'week' | 'backlog'

type TaskRow = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  priority: DbPriority
  status: DbStatus
  source: DbSource
  list: DbList | null
  owning_user_id: string
  created_at: string
  updated_at: string
}

type TaskInsert = {
  title: string
  description: string | null
  due_date: string | null
  priority: DbPriority
  status: DbStatus
  list: DbList
  source: DbSource
  owning_user_id: string
}

type TaskUpdate = Partial<Pick<TaskInsert, 'title' | 'description' | 'due_date' | 'priority' | 'status' | 'list' | 'source'> & {
  completion_date: string | null
}>

// Determine list based on due date — 'week' if due date is this week or overdue
function resolveList(dueDate: string | null): DbList {
  if (!dueDate) return 'backlog'
  const due = new Date(dueDate)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)
  return due <= endOfWeek ? 'week' : 'backlog'
}

// Resolve list, letting due-date-derived 'week' override the stored value
function effectiveList(storedList: DbList | null, dueDate: string | null): DbList {
  const derived = resolveList(dueDate)
  if (derived === 'week') return 'week'
  return storedList ?? 'backlog'
}

function mapDbStatusToUi(status: DbStatus): TaskStatus {
  const map: Record<DbStatus, TaskStatus> = {
    not_started: 'Not started',
    in_progress: 'In progress',
    blocked: 'Blocked',
    completed: 'Done',
  }
  return map[status]
}

function mapUiStatusToDb(status: TaskStatus): DbStatus {
  const map: Record<TaskStatus, DbStatus> = {
    'Not started': 'not_started',
    'In progress': 'in_progress',
    'Blocked': 'blocked',
    'Done': 'completed',
  }
  return map[status]
}

function mapDbPriorityToUi(priority: DbPriority): TaskPriority {
  const map: Record<DbPriority, TaskPriority> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    very_high: 'Very High',
  }
  return map[priority]
}

function mapUiPriorityToDb(priority: TaskPriority): DbPriority {
  const map: Record<TaskPriority, DbPriority> = {
    'Low': 'low',
    'Medium': 'medium',
    'High': 'high',
    'Very High': 'very_high',
  }
  return map[priority]
}

function mapDbSourceToCategory(source: DbSource): TaskCategory {
  const map: Record<DbSource, TaskCategory> = {
    manual: 'Task',
    meeting_action: 'Meeting',
    recurring_meeting: 'Meeting',
    growth: 'Career Growth',
    performance: 'People',
  }
  return map[source]
}

function mapCategoryToDbSource(category: TaskCategory): DbSource {
  const map: Record<TaskCategory, DbSource> = {
    'Task': 'manual',
    'Meeting': 'meeting_action',
    'Career Growth': 'growth',
    'People': 'performance',
  }
  return map[category]
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    dueDate: row.due_date,
    priority: mapDbPriorityToUi(row.priority),
    category: mapDbSourceToCategory(row.source),
    status: mapDbStatusToUi(row.status),
    list: effectiveList(row.list, row.due_date),
  }
}

export async function getTasks(): Promise<Task[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_relations(entity_type, entity_id)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as TaskRow[]).map(rowToTask)
}

export async function createTask(task: Omit<Task, 'id'>): Promise<Task> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const insert: TaskInsert = {
    title: task.title,
    description: task.description ?? null,
    due_date: task.dueDate ?? null,
    priority: mapUiPriorityToDb(task.priority),
    status: mapUiStatusToDb(task.status),
    list: effectiveList(task.list ?? null, task.dueDate ?? null),
    source: mapCategoryToDbSource(task.category),
    owning_user_id: user.id,
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(insert)
    .select()
    .single()
  if (error) throw error
  return rowToTask(data as TaskRow)
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const supabase = createClient()

  const dbUpdates: TaskUpdate = {}
  if (updates.title !== undefined) dbUpdates.title = updates.title
  if (updates.description !== undefined) dbUpdates.description = updates.description ?? null
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate ?? null
  if (updates.priority !== undefined) dbUpdates.priority = mapUiPriorityToDb(updates.priority)
  if (updates.list !== undefined) dbUpdates.list = updates.list
  if (updates.category !== undefined) dbUpdates.source = mapCategoryToDbSource(updates.category)
  if (updates.status !== undefined) {
    dbUpdates.status = mapUiStatusToDb(updates.status)
    dbUpdates.completion_date = updates.status === 'Done'
      ? new Date().toISOString().split('T')[0]
      : null
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return rowToTask(data as TaskRow)
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function moveTask(id: string, toList: 'week' | 'backlog'): Promise<Task> {
  return updateTask(id, { list: toList })
}

/**
 * Prioritise a list of tasks using AI.
 * Returns rankings ordered by rank (1 = highest priority).
 * Throws if the AI response cannot be parsed.
 */
export async function prioritiseTasks(
  tasks: TaskPrioritisationInput[],
  today: string = new Date().toISOString().split('T')[0],
  signal?: AbortSignal
): Promise<TaskRanking[]> {
  if (tasks.length === 0) return []

  const userPrompt = buildTaskPrioritisationPrompt({ tasks, today })

  const response = await callAI(
    {
      systemPrompt: TASK_PRIORITISATION_SYSTEM,
      userPrompt,
      maxTokens: 1000,
      temperature: 0,
    },
    signal
  )

  let parsed: TaskPrioritisationResult
  try {
    // Strip markdown code fences if present
    const cleaned = response.content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    parsed = JSON.parse(cleaned) as TaskPrioritisationResult
  } catch {
    throw new Error('AI returned invalid JSON for task prioritisation')
  }

  if (!Array.isArray(parsed.rankings)) {
    throw new Error('AI response missing rankings array')
  }

  // Validate and sort by rank
  const rankings = parsed.rankings
    .filter((r): r is TaskRanking =>
      typeof r.taskId === 'string' &&
      typeof r.rank === 'number' &&
      typeof r.reason === 'string'
    )
    .sort((a, b) => a.rank - b.rank)

  return rankings
}
