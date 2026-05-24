"use client"

import { Task } from "@/lib/types/task"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { TaskCard } from "./task-card"

interface DraggableTaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete?: (taskId: string) => void
}

export function DraggableTaskCard({ task, onEdit, onDelete }: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 220ms cubic-bezier(0.2, 0, 0, 1)",
  }

  // Show placeholder while dragging, real card otherwise
  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <div className="drag-placeholder-card" />
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onEdit(task)
      }}
    >
      <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} isDragging={false} />
    </div>
  )
}
