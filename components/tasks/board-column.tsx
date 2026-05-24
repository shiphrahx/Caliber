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
  "Not started": "#555555",
  "In progress": "#2563eb",
  "Blocked":     "#ea580c",
  "Done":        "#00f058",
}

export function BoardColumn({ status, tasks, onEdit, onDelete, onQuickAdd }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: "column", status },
  })

  const dotColor = STATUS_DOT[status]

  return (
    <div
      className="board-col-outer flex flex-col h-full max-md:flex-shrink-0 rounded-lg overflow-hidden"
    >
      {/* Column header */}
      <div className="board-col-header">
        {/* Left: dot + name + count */}
        <div className="board-col-header-left">
          <span className="board-col-dot" style={{ background: dotColor }} />
          <span className="board-col-name">{status}</span>
          <span className="board-col-count">{tasks.length}</span>
        </div>

        {/* Right: add button */}
        <button onClick={() => onQuickAdd(status)} className="board-col-add-btn">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={cn(
          "board-col-body flex-1 flex flex-col min-h-[360px] transition-all duration-200",
          isOver && "ring-1 ring-inset"
        )}
        style={isOver ? { boxShadow: "inset 0 0 0 1px var(--border-2)" } : undefined}
      >
        <div className="board-col-inner-list flex-1">
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <DraggableTaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </SortableContext>

          {/* Empty state when done column is empty (not dragging) */}
          {tasks.length === 0 && !isOver && status === "Done" && (
            <div className="board-col-empty">
              <span className="board-col-empty-text">No tasks yet</span>
            </div>
          )}

          {/* Drop placeholder when dragging over empty column */}
          {tasks.length === 0 && isOver && (
            <div className="board-col-drop-placeholder">
              <span className="board-col-empty-text">Drop here</span>
            </div>
          )}
        </div>

        {/* Add task row */}
        <button onClick={() => onQuickAdd(status)} className="board-col-add-task-btn">
          <Plus className="h-3.5 w-3.5" />
          Add task
        </button>
      </div>
    </div>
  )
}
