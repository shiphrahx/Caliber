"use client"

import { Task } from "@/lib/types/task"
import { PRIORITY_BADGE, STATUS_BADGE } from "@/lib/badge-styles"
import { MoreVertical } from "lucide-react"
import { useState, useRef, useEffect } from "react"

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete?: (taskId: string) => void
  isDragging?: boolean
}

// Status left-border accent
const STATUS_BORDER: Record<Task["status"], string> = {
  "Not started": "#2a2a2a",
  "In progress": "#2563eb",
  "Blocked":     "#ea580c",
  "Done":        "#00f058",
}


function PriorityPill({ priority }: { priority: Task["priority"] }) {
  const { bg, color: text, dot } = PRIORITY_BADGE[priority]
  return (
    <span className="priority-pill" style={{ background: bg, color: text }}>
      <span className="priority-pill-dot" style={{ background: dot }} />
      {priority}
    </span>
  )
}

function StatusPill({ status }: { status: Task["status"] }) {
  const { bg, color: text, dot } = STATUS_BADGE[status]
  return (
    <span className="priority-pill" style={{ background: bg, color: text }}>
      <span className="priority-pill-dot" style={{ background: dot }} />
      {status}
    </span>
  )
}

const formatDate = (date: string | null) => {
  if (!date) return null
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const taskDate = new Date(d)
  taskDate.setHours(0, 0, 0, 0)

  if (taskDate.getTime() === today.getTime()) return "Today"
  if (taskDate.getTime() === today.getTime() + 86400000) return "Tomorrow"
  return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" })
}

export function TaskCard({ task, onEdit, onDelete, isDragging = false }: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleEscape)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [menuOpen])

  // Left border: Very High + In progress → red override
  const leftBorder = (task.priority === "Very High" && task.status === "In progress")
    ? "#f87171"
    : STATUS_BORDER[task.status]

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(!menuOpen)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    onEdit(task)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    if (onDelete) onDelete(task.id)
  }

  return (
    <div
      className="group relative"
      style={{
        background: isDragging ? "var(--surf-3)" : "var(--surf-2)",
        border: `1px solid ${isDragging ? "var(--border-2)" : "var(--border-1)"}`,
        borderLeft: `3px solid ${leftBorder}`,
        borderRadius: "6px",
        padding: "10px 12px",
        cursor: isDragging ? "grabbing" : "pointer",
        transition: "background 150ms, border-color 150ms",
      }}
      onMouseEnter={e => {
        if (!isDragging) {
          (e.currentTarget as HTMLDivElement).style.background = "var(--surf-3)"
          ;(e.currentTarget as HTMLDivElement).style.borderColor = `var(--border-2)`
          ;(e.currentTarget as HTMLDivElement).style.borderLeftColor = leftBorder
        }
      }}
      onMouseLeave={e => {
        if (!isDragging) {
          (e.currentTarget as HTMLDivElement).style.background = "var(--surf-2)"
          ;(e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-1)"
          ;(e.currentTarget as HTMLDivElement).style.borderLeftColor = leftBorder
        }
      }}
    >
      {/* Kebab menu — top right, visible on hover */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20" ref={menuRef}>
        <button
          onClick={handleMenuClick}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="task-card-menu-btn"
          aria-label="Task actions"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div className="task-card-menu-dropdown">
            <button
              onClick={handleEdit}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="task-card-menu-item task-card-menu-item--edit"
            >
              Edit
            </button>
            {onDelete && (
              <button
                onClick={handleDelete}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="task-card-menu-item task-card-menu-item--delete"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Task name */}
      <p className="task-title line-clamp-2 break-words">{task.title}</p>

      {/* Meta row */}
      <div className="task-meta-row">
        <PriorityPill priority={task.priority} />
        <StatusPill status={task.status} />
        {task.dueDate && (
          <span className="task-due-date">{formatDate(task.dueDate)}</span>
        )}
      </div>
    </div>
  )
}

// Export pills for reuse in backlog table
export { PriorityPill, StatusPill }
