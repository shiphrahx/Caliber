export type TaskStatus = "Not started" | "In progress" | "Blocked" | "Done"
export type TaskPriority = "Low" | "Medium" | "High" | "Very High"
export type TaskCategory =
  | "Task"
  | "Meeting"
  | "Career Growth"
  | "People"
export type TaskList = "week" | "backlog"

export interface Task {
  id: string
  title: string
  description?: string
  dueDate: string | null
  priority: TaskPriority
  category: TaskCategory
  status: TaskStatus
  list: TaskList
}

export const TASK_STATUSES: TaskStatus[] = ["Not started", "In progress", "Blocked", "Done"]
export const TASK_PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Very High"]
export const TASK_CATEGORIES: TaskCategory[] = [
  "Task",
  "Meeting",
  "Career Growth",
  "People",
]
