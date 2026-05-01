"use client"

import { Task } from "@/lib/types/task"
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

// Priority pill colours: [bg, text, dot]
const PRIORITY_PILL: Record<Task["priority"], [string, string, string]> = {
  "Low":       ["#0f1526", "#818cf8", "#818cf8"],
  "Medium":    ["#1e1a00", "#facc15", "#facc15"],
  "High":      ["#2a1400", "#fb923c", "#fb923c"],
  "Very High": ["#2a0a0a", "#f87171", "#f87171"],
}

// Status pill colours: [bg, text, dot]
const STATUS_PILL: Record<Task["status"], [string, string, string]> = {
  "Not started": ["#1a1a22", "#6b7280", "#6b7280"],
  "In progress": ["#0c1a3d", "#60a5fa", "#3b82f6"],
  "Blocked":     ["#2a1200", "#f97316", "#ea580c"],
  "Done":        ["#0d2015", "#4ade80", "#22c55e"],
}

function PriorityPill({ priority }: { priority: Task["priority"] }) {
  const [bg, text, dot] = PRIORITY_PILL[priority]
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: "2px 7px",
      borderRadius: "4px",
      fontSize: "var(--text-overline)",
      fontWeight: 500,
      fontFamily: "var(--font-mono)",
      background: bg,
      color: text,
    }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: dot, flexShrink: 0 }} />
      {priority}
    </span>
  )
}

function StatusPill({ status }: { status: Task["status"] }) {
  const [bg, text, dot] = STATUS_PILL[status]
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: "2px 7px",
      borderRadius: "4px",
      fontSize: "var(--text-overline)",
      fontWeight: 500,
      fontFamily: "var(--font-mono)",
      background: bg,
      color: text,
    }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: dot, flexShrink: 0 }} />
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
          style={{
            background: "none",
            border: "none",
            color: "var(--text-3)",
            cursor: "pointer",
            padding: "2px",
            borderRadius: "4px",
          }}
          aria-label="Task actions"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div style={{
            position: "absolute",
            right: 0,
            marginTop: "4px",
            width: "128px",
            background: "var(--surf-2)",
            border: "1px solid var(--border-2)",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            zIndex: 50,
            overflow: "hidden",
          }}>
            <button
              onClick={handleEdit}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                fontSize: "var(--text-label)",
                color: "var(--text-1)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-3)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              Edit
            </button>
            {onDelete && (
              <button
                onClick={handleDelete}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: "var(--text-label)",
                  color: "#f87171",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-3)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Task name */}
      <p style={{
        fontSize: "var(--text-meta)",
        fontWeight: 400,
        color: "var(--text-1)",
        marginBottom: "9px",
        lineHeight: 1.4,
        paddingRight: "20px",
      }}
        className="line-clamp-2 break-words"
      >
        {task.title}
      </p>

      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
        <PriorityPill priority={task.priority} />
        <StatusPill status={task.status} />
        {task.dueDate && (
          <span style={{
            fontSize: "var(--text-overline)",
            color: "var(--text-3)",
            fontFamily: "var(--font-mono)",
            marginLeft: "auto",
          }}>
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  )
}

// Export pills for reuse in backlog table
export { PriorityPill, StatusPill }
