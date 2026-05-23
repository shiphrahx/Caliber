"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { TaskModal } from "@/components/tasks/task-modal"
import { updateTask, deleteTask } from "@/lib/services/tasks"
import type { Task } from "@/lib/types/task"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { useDraggable, useDroppable } from "@dnd-kit/core"

export type CalendarTask = {
  id: string
  title: string
  dueDate: string        // ISO date string YYYY-MM-DD
  priority: "Low" | "Medium" | "High" | "Very High"
  status: "Not started" | "In progress" | "Blocked" | "Done"
}

const PRIORITY_DOT: Record<CalendarTask["priority"], string> = {
  "Very High": "bg-red-500",
  "High": "bg-orange-400",
  "Medium": "bg-yellow-400",
  "Low": "bg-green-400",
}

const PRIORITY_BORDER: Record<CalendarTask["priority"], string> = {
  "Very High": "border-l-2 border-red-500",
  "High": "border-l-2 border-orange-400",
  "Medium": "border-l-2 border-yellow-400",
  "Low": "border-l-2 border-green-400",
}

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}

function toDateStr(d: Date): string {
  // Use local date parts to avoid UTC offset shifting the day
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// ── Draggable task chip ──────────────────────────────────────────────────────

function DraggableTaskChip({
  task,
  onClick,
  overlay = false,
}: {
  task: CalendarTask
  onClick: () => void
  overlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { task } })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "flex flex-col px-1.5 py-1 rounded text-[13px] font-medium cursor-grab active:cursor-grabbing transition-opacity bg-[#2a2a2a] text-gray-200 border border-[#383838]",
        PRIORITY_BORDER[task.priority],
        isDragging && !overlay && "opacity-30",
        overlay && "shadow-lg opacity-95 rotate-1 cursor-grabbing",
      )}
    >
      <span className="truncate">{task.title}</span>
      <div className="flex items-center gap-1 mt-0.5">
        <span className={cn("flex-shrink-0 w-1.5 h-1.5 rounded-full", PRIORITY_DOT[task.priority])} />
        <span className="opacity-60 font-normal text-[13px]">{task.priority}</span>
      </div>
    </div>
  )
}

// ── Droppable day cell ───────────────────────────────────────────────────────

function DroppableDayCell({
  dateStr,
  isOver,
  children,
  className,
}: {
  dateStr: string
  isOver: boolean
  children: React.ReactNode
  className: string
}) {
  const { setNodeRef } = useDroppable({ id: dateStr })

  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && "bg-[#2a2a2a] ring-1 ring-inset ring-[#AEA6FD]/40")}
    >
      {children}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface DashboardCalendarProps {
  tasks: CalendarTask[]
}

export function DashboardCalendar({ tasks }: DashboardCalendarProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [localTasks, setLocalTasks] = useState<CalendarTask[]>(tasks)
  const [draggingTask, setDraggingTask] = useState<CalendarTask | null>(null)
  const [overDateStr, setOverDateStr] = useState<string | null>(null)

  // Require 5px movement before a drag starts so clicks still work
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as CalendarTask
    setDraggingTask(task ?? null)
  }

  const handleDragOver = (event: any) => {
    setOverDateStr(event.over?.id ?? null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const task = event.active.data.current?.task as CalendarTask | undefined
    const newDateStr = event.over?.id as string | undefined

    setDraggingTask(null)
    setOverDateStr(null)

    if (!task || !newDateStr || newDateStr === task.dueDate) return

    // Optimistic update
    setLocalTasks(prev =>
      prev.map(t => t.id === task.id ? { ...t, dueDate: newDateStr } : t)
    )

    try {
      await updateTask(task.id, { dueDate: newDateStr })
    } catch (e) {
      console.error("Failed to move task:", e)
      // Revert on failure
      setLocalTasks(prev =>
        prev.map(t => t.id === task.id ? { ...t, dueDate: task.dueDate } : t)
      )
    }
  }

  const handleTaskClick = (task: CalendarTask) => {
    // Suppress click if a drag just ended (dnd-kit fires click after pointerup)
    if (draggingTask) return
    setSelectedTask({
      id: task.id,
      title: task.title,
      description: "",
      dueDate: task.dueDate,
      priority: task.priority,
      category: "Task",
      status: task.status,
      list: "backlog",
    })
  }

  const handleSave = async (updated: Task) => {
    try {
      await updateTask(updated.id, updated)
      setLocalTasks(prev => prev.map(t =>
        t.id === updated.id
          ? { ...t, title: updated.title, priority: updated.priority, status: updated.status, dueDate: updated.dueDate ?? t.dueDate }
          : t
      ))
    } catch (e) {
      console.error("Failed to update task:", e)
    }
    setSelectedTask(null)
  }

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId)
      setLocalTasks(prev => prev.filter(t => t.id !== taskId))
    } catch (e) {
      console.error("Failed to delete task:", e)
    }
    setSelectedTask(null)
  }

  const weeks = getMonthGrid(viewYear, viewMonth)

  const tasksByDate: Record<string, CalendarTask[]> = {}
  for (const task of localTasks) {
    if (!task.dueDate) continue
    if (!tasksByDate[task.dueDate]) tasksByDate[task.dueDate] = []
    tasksByDate[task.dueDate].push(task)
  }

  const todayStr = toDateStr(today)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })

  return (
    <DndContext
      id="dashboard-calendar"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="border border-[#383838] rounded-xl bg-[#1c1c1c] overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#383838]">
          <h3 className="text-gray-100 font-semibold text-base">{monthLabel}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-md hover:bg-[#2a2a2a] text-gray-400 hover:text-gray-200 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()) }}
              className="px-3 py-1 text-[13px] rounded-md hover:bg-[#2a2a2a] text-gray-400 hover:text-gray-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-md hover:bg-[#2a2a2a] text-gray-400 hover:text-gray-200 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[#383838]">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-[13px] font-medium text-gray-500 uppercase tracking-wide"
            >
              {day}
            </div>
          ))}
        </div>

        <TaskModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />

        {/* Weeks */}
        <div className="divide-y divide-[#252525]">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 divide-x divide-[#252525]">
              {week.map((date, di) => {
                if (!date) {
                  return <div key={di} className="min-h-[110px] bg-[#161616]" />
                }

                const dateStr = toDateStr(date)
                const isToday = dateStr === todayStr
                const isCurrentMonth = date.getMonth() === viewMonth
                const dayTasks = tasksByDate[dateStr] ?? []
                const MAX_VISIBLE = 3
                const visible = dayTasks.slice(0, MAX_VISIBLE)
                const overflow = dayTasks.length - MAX_VISIBLE

                return (
                  <DroppableDayCell
                    key={di}
                    dateStr={dateStr}
                    isOver={overDateStr === dateStr}
                    className={cn(
                      "min-h-[110px] p-2 relative transition-colors",
                      isCurrentMonth ? "bg-[#1c1c1c]" : "bg-[#161616]",
                      !draggingTask && "hover:bg-[#222222]",
                    )}
                  >
                    {/* Day number */}
                    <div className="flex justify-end mb-1.5">
                      <span
                        className={cn(
                          "text-[13px] font-medium w-6 h-6 flex items-center justify-center rounded-full",
                          isToday
                            ? "bg-gray-100 text-[#0f0f0f] font-bold"
                            : isCurrentMonth
                            ? "text-gray-300"
                            : "text-gray-600"
                        )}
                      >
                        {date.getDate()}
                      </span>
                    </div>

                    {/* Task chips */}
                    <div className="space-y-1">
                      {visible.map((task) => (
                        <DraggableTaskChip
                          key={task.id}
                          task={task}
                          onClick={() => handleTaskClick(task)}
                        />
                      ))}
                      {overflow > 0 && (
                        <div className="text-[13px] text-gray-500 pl-1.5">
                          +{overflow} more
                        </div>
                      )}
                    </div>
                  </DroppableDayCell>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Drag overlay — renders the chip under the cursor while dragging */}
      <DragOverlay dropAnimation={null}>
        {draggingTask ? (
          <DraggableTaskChip
            task={draggingTask}
            onClick={() => {}}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
