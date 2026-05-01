"use client"

import { Task, TaskStatus } from "@/lib/types/task"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { DraggableTaskCard } from "./draggable-task-card"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface BoardColumnProps {
  status: TaskStatus
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete?: (taskId: string) => void
  onQuickAdd: (status: TaskStatus) => void
}

const STATUS_DOT: Record<TaskStatus, string> = {
  "Not started": "#3a3a58",
  "In progress": "#2563eb",
  "Blocked":     "#ea580c",
  "Done":        "#84cc16",
}

export function BoardColumn({ status, tasks, onEdit, onDelete, onQuickAdd }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: "column", status },
  })

  const dotColor = STATUS_DOT[status]

  return (
    <div
      className="flex flex-col h-full max-md:flex-shrink-0 rounded-lg overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* Column header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: dot + name + count */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{
            display: "inline-block",
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: dotColor,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)" }}>{status}</span>
          <span style={{
            background: "var(--bg-surface-3)",
            color: "var(--text-tertiary)",
            fontSize: "11px",
            borderRadius: "3px",
            padding: "1px 5px",
            fontFamily: "ui-monospace, monospace",
          }}>{tasks.length}</span>
        </div>

        {/* Right: add button */}
        <button
          onClick={() => onQuickAdd(status)}
          style={{ color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}
          onMouseEnter={e => (e.currentTarget.style.color = "#84cc16")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-tertiary)")}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 flex flex-col min-h-[360px] transition-all duration-200",
          isOver && "ring-1 ring-inset"
        )}
        style={{
          padding: "10px",
          gap: "6px",
          display: "flex",
          flexDirection: "column",
          ...(isOver ? { boxShadow: "inset 0 0 0 1px var(--border-default)" } : {}),
        }}
      >
        <div className="flex-1" style={{ display: "flex", flexDirection: "column", gap: "6px", minHeight: "100px" }}>
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <DraggableTaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </SortableContext>

          {/* Empty state when done column is empty (not dragging) */}
          {tasks.length === 0 && !isOver && status === "Done" && (
            <div style={{
              border: "1px dashed var(--border-subtle)",
              borderRadius: "6px",
              minHeight: "60px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>No tasks yet</span>
            </div>
          )}

          {/* Drop placeholder when dragging over empty column */}
          {tasks.length === 0 && isOver && (
            <div style={{
              height: "60px",
              border: "1px dashed var(--border-default)",
              borderRadius: "6px",
              background: "var(--bg-surface-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Drop here</span>
            </div>
          )}
        </div>

        {/* Add task row */}
        <button
          onClick={() => onQuickAdd(status)}
          style={{
            padding: "7px 12px",
            borderTop: "1px solid var(--border-subtle)",
            borderLeft: "none",
            borderRight: "none",
            borderBottom: "none",
            color: "var(--text-tertiary)",
            fontSize: "12px",
            background: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            width: "100%",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#84cc16")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-tertiary)")}
        >
          <Plus className="h-3.5 w-3.5" />
          Add task
        </button>
      </div>
    </div>
  )
}
