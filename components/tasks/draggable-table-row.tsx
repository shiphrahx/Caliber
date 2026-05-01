"use client"

import { Task } from "@/lib/types/task"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ReactNode, cloneElement, Children, isValidElement } from "react"

interface DraggableTableRowProps {
  task: Task
  children: ReactNode
  onDoubleClick?: () => void
}

export function DraggableTableRow({ task, children, onDoubleClick }: DraggableTableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
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

  // Show minimal placeholder while dragging
  if (isDragging) {
    return (
      <tr ref={setNodeRef} style={style} {...attributes}>
        <td colSpan={7} style={{ padding: "6px 12px" }}>
          <div style={{
            height: "32px",
            border: "1px dashed var(--border-default)",
            borderRadius: "4px",
            background: "var(--bg-surface-2)",
            opacity: 0.5,
          }} />
        </td>
      </tr>
    )
  }

  // Clone children and attach drag handle ref to the first td (which contains the drag handle)
  const childrenArray = Children.toArray(children)
  const modifiedChildren = childrenArray.map((child, index) => {
    if (index === 0 && isValidElement(child)) {
      // First cell - attach drag listeners to it
      return cloneElement(child as React.ReactElement<any>, {
        ref: setActivatorNodeRef,
        ...listeners,
      })
    }
    return child
  })

  return (
    <tr
      ref={setNodeRef}
      style={{ ...style, borderBottom: "1px solid var(--border-subtle)" }}
      {...attributes}
      onDoubleClick={onDoubleClick}
      className="group transition-colors cursor-pointer"
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--bg-surface-2)")}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
    >
      {modifiedChildren}
    </tr>
  )
}
