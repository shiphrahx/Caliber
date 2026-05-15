"use client"

import { useState, useEffect, useRef } from "react"
import { Task, TaskStatus, TASK_STATUSES } from "@/lib/types/task"
import { getTasks, createTask, updateTask, deleteTask as deleteTaskService } from "@/lib/services/tasks"
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
  rectIntersection,
  CollisionDetection
} from "@dnd-kit/core"
import { BoardColumn } from "@/components/tasks/board-column"
import { BacklogTable } from "@/components/tasks/backlog-table"
import { TaskModal } from "@/components/tasks/task-modal"
import { TaskCard } from "@/components/tasks/task-card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalDefaults, setModalDefaults] = useState<Partial<Task>>({})
  const [isMounted, setIsMounted] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [, setIsLoading] = useState(true)
  const mountedRef = useRef(true)

  // Load tasks from Supabase on mount
  useEffect(() => {
    mountedRef.current = true
    loadTasks()
    return () => { mountedRef.current = false }
  }, [])

  const loadTasks = async () => {
    try {
      setIsLoading(true)
      const data = await getTasks()
      setTasks(data)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Only enable DnD on client to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Small threshold to prevent accidental drags
        delay: 0,
        tolerance: 5,
      },
    })
  )

  // Custom collision detection strategy - combines pointer and rect intersection
  const collisionDetectionStrategy: CollisionDetection = (args) => {
    // First, use pointer-based detection for precise insertion
    const pointerCollisions = pointerWithin(args)

    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }

    // Fallback to rectangle intersection
    const rectCollisions = rectIntersection(args)

    if (rectCollisions.length > 0) {
      return rectCollisions
    }

    // Final fallback to closest center
    return closestCenter(args)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find((t) => t.id === active.id)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    setTasks((currentTasks) => {
      const activeTask = currentTasks.find((t) => t.id === activeId)
      if (!activeTask) return currentTasks

      // Determine if we're over a task or a column
      const overTask = currentTasks.find((t) => t.id === overId)
      const overColumn = over.data.current?.type === "column" ? over.data.current.status : null
      const overBacklog = over.data.current?.type === "backlog"

      // Case 1: Dragging over another task (insert before/after)
      if (overTask) {
        // Check if already in the correct position to prevent unnecessary updates
        const activeIndex = currentTasks.findIndex((t) => t.id === activeId)
        const overIndex = currentTasks.findIndex((t) => t.id === overId)

        if (activeIndex === overIndex) return currentTasks
        if (activeTask.status === overTask.status && activeTask.list === overTask.list && Math.abs(activeIndex - overIndex) === 1) {
          return currentTasks
        }

        // Determine target status and list
        const targetStatus = overTask.status
        const targetList = overTask.list

        // Remove active task from array
        const newTasks = currentTasks.filter((t) => t.id !== activeId)

        // Update active task's status and list
        const updatedActiveTask = {
          ...activeTask,
          status: targetStatus,
          list: targetList
        }

        // Find new insertion index (accounting for removed item)
        let insertIndex = newTasks.findIndex((t) => t.id === overId)

        // Insert at the correct position
        newTasks.splice(insertIndex, 0, updatedActiveTask)

        return newTasks
      }

      // Case 2: Dragging over a column (append to end)
      if (overColumn) {
        // Prevent update if already in correct state
        if (activeTask.status === overColumn && activeTask.list === "week") {
          return currentTasks
        }

        return currentTasks.map((t) =>
          t.id === activeId
            ? { ...t, status: overColumn as TaskStatus, list: "week" }
            : t
        )
      }

      // Case 3: Dragging over backlog
      if (overBacklog) {
        // Prevent update if already in backlog
        if (activeTask.list === "backlog") {
          return currentTasks
        }

        return currentTasks.map((t) =>
          t.id === activeId
            ? { ...t, list: "backlog" }
            : t
        )
      }

      return currentTasks
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const originalTask = activeTask
    setActiveTask(null)

    const { active, over } = event
    if (!over || !originalTask) return

    const activeId = active.id as string

    // handleDragOver already applied the visual update to tasks state.
    // Use a ref-style approach: read current tasks synchronously via the
    // functional updater pattern, capture the diff, then persist to DB.
    setTasks((currentTasks) => {
      const currentTask = currentTasks.find((t) => t.id === activeId)
      if (!currentTask) return currentTasks

      const listChanged = currentTask.list !== originalTask.list
      const statusChanged = currentTask.status !== originalTask.status

      if (listChanged || statusChanged) {
        const updates = { list: currentTask.list, status: currentTask.status }
        // DB write must happen outside state updater; guard against unmount
        Promise.resolve().then(() => {
          if (!mountedRef.current) return
          updateTask(activeId, updates).catch((error) => {
            console.error('Failed to update task:', error)
            if (mountedRef.current) loadTasks()
          })
        })
      }

      return currentTasks
    })
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    // Optimistically apply the update to local state immediately
    setTasks((tasks) =>
      tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    )
    try {
      await updateTask(taskId, updates)
    } catch (error) {
      console.error('Failed to update task:', error)
      // Revert on failure by reloading from DB
      loadTasks()
    }
  }

  const handleSaveTask = async (task: Task) => {
    try {
      if (task.id) {
        // Update existing task
        await handleUpdateTask(task.id, task)
      } else {
        // Create new task
        const newTask = await createTask(task)
        setTasks((tasks) => [...tasks, newTask])
      }
    } catch (error) {
      console.error('Failed to save task:', error)
    }
  }

  const handleDeleteRequest = (taskId: string) => {
    setDeleteConfirmId(taskId)
  }

  const handleConfirmDelete = async () => {
    if (deleteConfirmId) {
      try {
        await deleteTaskService(deleteConfirmId)
        setTasks((tasks) => tasks.filter((t) => t.id !== deleteConfirmId))
        setDeleteConfirmId(null)
      } catch (error) {
        console.error('Failed to delete task:', error)
      }
    }
  }

  const handleCancelDelete = () => {
    setDeleteConfirmId(null)
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setModalDefaults({})
    setIsModalOpen(true)
  }

  const handleQuickAddBoard = (status: TaskStatus) => {
    setSelectedTask(null)
    setModalDefaults({ list: "week", status })
    setIsModalOpen(true)
  }

  const handleQuickAddBacklog = () => {
    setSelectedTask(null)
    setModalDefaults({ list: "backlog", status: "Not started" })
    setIsModalOpen(true)
  }

  const handleNewTaskHeader = () => {
    setSelectedTask(null)
    setModalDefaults({ list: "week", status: "Not started" })
    setIsModalOpen(true)
  }

  const weekTasks = tasks.filter((t) => t.list === "week")
  const backlogTasks = tasks.filter((t) => t.list === "backlog")

  const taskToDisplay = selectedTask || {
    id: "",
    title: "",
    description: "",
    dueDate: null,
    priority: "Medium" as const,
    category: "Task" as const,
    status: "Not started" as const,
    list: "backlog" as const,
    ...modalDefaults,
  }

  // Show a loading state until mounted to prevent hydration mismatch
  if (!isMounted) {
    return (
      <>
        {/* Top bar */}
        <div className="page-topbar">
          <span className="page-topbar-title">Tasks</span>
        </div>
        <div style={{ fontSize: "var(--text-meta)", color: "var(--text-3)", padding: "48px 32px" }}>Loading...</div>
      </>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Top bar */}
      <div className="page-topbar">
        <span className="page-topbar-title">Tasks</span>
        <button className="btn-primary" onClick={handleNewTaskHeader}>
          + New task
        </button>
      </div>

      <div className="flex flex-col gap-8 p-4">
        {/* This Week Board */}
        <div>
          {/* Section header */}
          <div className="flex items-center justify-between mb-3">
            <span style={{
              fontSize: "var(--text-overline)",
              fontWeight: 500,
              letterSpacing: "0.07em",
              color: "var(--text-3)",
              textTransform: "uppercase",
            }}>This week</span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button style={{
                background: "transparent",
                border: "1px solid var(--border-2)",
                color: "var(--text-2)",
                fontSize: "var(--text-caption)",
                padding: "3px 8px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--text-1)" }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text-2)" }}
              >Filter</button>
              <button style={{
                background: "transparent",
                border: "1px solid var(--border-2)",
                color: "var(--text-2)",
                fontSize: "var(--text-caption)",
                padding: "3px 8px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--text-1)" }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text-2)" }}
              >Sort</button>
            </div>
          </div>

          {/* Kanban grid */}
          <div className="grid grid-cols-4 gap-3 max-md:px-2">
            {TASK_STATUSES.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                tasks={weekTasks.filter((t) => t.status === status)}
                onEdit={handleEditTask}
                onDelete={handleDeleteRequest}
                onQuickAdd={handleQuickAddBoard}
              />
            ))}
          </div>
        </div>

        {/* Backlog */}
        <div>
          {/* Section header */}
          <div className="flex items-center justify-between mb-3">
            <span style={{
              fontSize: "var(--text-overline)",
              fontWeight: 500,
              letterSpacing: "0.07em",
              color: "var(--text-3)",
              textTransform: "uppercase",
            }}>Backlog</span>
          </div>
          <BacklogTable
            tasks={backlogTasks}
            onUpdateTask={handleUpdateTask}
            onQuickAdd={handleQuickAddBacklog}
            onEdit={handleEditTask}
            onDelete={handleDeleteRequest}
          />
        </div>

        {/* Task Modal */}
        <TaskModal
          task={taskToDisplay}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
          onDelete={selectedTask ? handleDeleteRequest : undefined}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && handleCancelDelete()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Task</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this task? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelDelete}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Drag Overlay - Floating card preview */}
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="rotate-3 cursor-grabbing">
              <TaskCard task={activeTask} onEdit={() => {}} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  )
}
