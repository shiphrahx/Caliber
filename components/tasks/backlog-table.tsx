"use client"

import { useState, useMemo } from "react"
import { Task, TaskStatus, TaskPriority, TaskCategory, TASK_STATUSES, TASK_PRIORITIES, TASK_CATEGORIES } from "@/lib/types/task"
import { PRIORITY_BADGE, STATUS_BADGE } from "@/lib/badge-styles"
import { BadgeSelect } from "@/components/ui/badge-select"
import { Plus, ArrowUpDown, GripVertical, Search } from "lucide-react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { DraggableTableRow } from "./draggable-table-row"

interface BacklogTableProps {
  tasks: Task[]
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void
  onQuickAdd: () => void
  onEdit: (task: Task) => void
  onDelete?: (taskId: string) => void
}

type SortField = "title" | "dueDate" | "priority" | "status" | "category"
type SortDirection = "asc" | "desc"


export function BacklogTable({ tasks, onUpdateTask, onQuickAdd, onEdit, onDelete }: BacklogTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all")
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all")
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "all">("all")
  const [sortField, setSortField] = useState<SortField>("dueDate")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [showFilters, setShowFilters] = useState(false)

  const { setNodeRef, isOver } = useDroppable({
    id: "backlog-table",
    data: { type: "backlog" },
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || task.status === statusFilter
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
      const matchesCategory = categoryFilter === "all" || task.category === categoryFilter
      return matchesSearch && matchesStatus && matchesPriority && matchesCategory
    })

    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "title":
          comparison = a.title.localeCompare(b.title)
          break
        case "dueDate": {
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
          comparison = dateA - dateB
          break
        }
        case "priority": {
          const priorityOrder: Record<TaskPriority, number> = { "Very High": 4, High: 3, Medium: 2, Low: 1 }
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
          break
        }
        case "status": {
          const statusOrder = { "Not started": 1, "In progress": 2, "Blocked": 3, "Done": 4 }
          comparison = statusOrder[a.status] - statusOrder[b.status]
          break
        }
        case "category":
          comparison = a.category.localeCompare(b.category)
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return filtered
  }, [tasks, searchQuery, statusFilter, priorityFilter, categoryFilter, sortField, sortDirection])

  const formatDate = (date: string | null) => {
    if (!date) return ""
    return new Date(date).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <div className="space-y-0">
      {/* Controls row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "12px" }}>
        {/* Left: search + filters button */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search
              className="absolute"
              style={{
                width: "14px",
                height: "14px",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-3)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "var(--surf)",
                border: "1px solid var(--border-1)",
                borderRadius: "6px",
                padding: "5px 10px 5px 30px",
                fontSize: "var(--text-label)",
                color: "var(--text-1)",
                width: "180px",
                outline: "none",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--border-2)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--border-1)")}
            />
          </div>

          {/* Filters button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              background: showFilters ? "var(--surf-3)" : "transparent",
              border: "1px solid var(--border-2)",
              color: "var(--text-2)",
              fontSize: "var(--text-label)",
              padding: "5px 10px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-2)")}
          >
            Filters
          </button>
        </div>

        {/* Right: New task */}
        <button
          onClick={onQuickAdd}
          style={{
            background: "linear-gradient(90deg, #00ffe5 0%, #00f058 100%)",
            color: "#0a1a0a",
            fontSize: "var(--text-caption)",
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          New task
        </button>
      </div>

      {/* Filter row */}
      {showFilters && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "12px 16px",
          background: "var(--surf)",
          border: "1px solid var(--border-1)",
          borderRadius: "8px",
          marginBottom: "12px",
        }}>
          {[
            { label: "Status", value: statusFilter, onChange: (v: string) => setStatusFilter(v as TaskStatus | "all"), options: TASK_STATUSES },
            { label: "Priority", value: priorityFilter, onChange: (v: string) => setPriorityFilter(v as TaskPriority | "all"), options: TASK_PRIORITIES },
            { label: "Category", value: categoryFilter, onChange: (v: string) => setCategoryFilter(v as TaskCategory | "all"), options: TASK_CATEGORIES },
          ].map(({ label, value, onChange, options }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label style={{ fontSize: "var(--text-label)", color: "var(--text-2)", fontWeight: 500 }}>{label}:</label>
              <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                  background: "var(--surf-2)",
                  border: "1px solid var(--border-2)",
                  borderRadius: "4px",
                  padding: "3px 6px",
                  fontSize: "var(--text-label)",
                  color: "var(--text-1)",
                  cursor: "pointer",
                }}
              >
                <option value="all">All</option>
                {options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div
        ref={setNodeRef}
        style={{
          background: "var(--surf)",
          border: isOver ? "1px solid var(--border-2)" : "1px solid var(--border-1)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
        className="max-md:overflow-x-auto"
      >
        <table className="w-full border-collapse">
          <colgroup>
            <col style={{ width: "36px" }} />
            <col />
            <col style={{ width: "140px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "80px" }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-1)" }}>
              {/* Drag handle col */}
              <th style={{ padding: "8px 12px", background: "var(--surf)" }} />
              {/* Sortable columns */}
              {(["title", "status", "dueDate", "priority", "category"] as SortField[]).map((field) => {
                const labels: Record<SortField, string> = {
                  title: "Name",
                  status: "Status",
                  dueDate: "Due Date",
                  priority: "Priority",
                  category: "Category",
                }
                return (
                  <th
                    key={field}
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      background: "var(--surf)",
                      fontWeight: 500,
                      fontSize: "var(--text-overline)",
                      color: "var(--text-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    <button
                      onClick={() => handleSort(field)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "var(--text-3)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "var(--text-overline)",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        padding: 0,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                    >
                      {labels[field]}
                      <ArrowUpDown style={{ width: "11px", height: "11px", flexShrink: 0 }} />
                    </button>
                  </th>
                )
              })}
              {/* Actions col */}
              <th style={{ padding: "8px 12px", background: "var(--surf)" }} />
            </tr>
          </thead>
          <tbody>
            <SortableContext items={filteredAndSortedTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {filteredAndSortedTasks.map((task) => (
                <DraggableTableRow
                  key={task.id}
                  task={task}
                  onDoubleClick={() => onEdit(task)}
                >
                  {/* Drag handle */}
                  <td
                    style={{ padding: "9px 12px", textAlign: "center" }}
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <div className="active:cursor-grabbing drag-handle cursor-grab inline-flex">
                      <GripVertical style={{ width: "14px", height: "14px", color: "var(--text-3)" }} />
                    </div>
                  </td>

                  {/* Name */}
                  <td
                    style={{ padding: "9px 12px", color: "var(--text-1)", fontSize: "var(--text-meta)", overflow: "hidden" }}
                    title={task.title}
                  >
                    <div className="line-clamp-2 break-all max-md:break-words">{task.title}</div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: "9px 12px" }} onClick={(e) => e.stopPropagation()}>
                    <BadgeSelect
                      value={task.status}
                      onValueChange={(value) => onUpdateTask(task.id, { status: value as TaskStatus })}
                      options={TASK_STATUSES.map((status) => ({
                        value: status,
                        label: status,
                        className: "",
                        style: {
                          background: STATUS_BADGE[status].bg,
                          color: STATUS_BADGE[status].color,
                          fontSize: "var(--text-overline)",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 500,
                          borderRadius: "4px",
                          padding: "2px 7px",
                        },
                      }))}
                    />
                  </td>

                  {/* Due date */}
                  <td style={{
                    padding: "9px 12px",
                    fontSize: "var(--text-overline)",
                    color: "var(--text-3)",
                    fontFamily: "var(--font-mono)",
                  }}>
                    {formatDate(task.dueDate) || "—"}
                  </td>

                  {/* Priority */}
                  <td style={{ padding: "9px 12px" }} onClick={(e) => e.stopPropagation()}>
                    <BadgeSelect
                      value={task.priority}
                      onValueChange={(value) => onUpdateTask(task.id, { priority: value as TaskPriority })}
                      options={TASK_PRIORITIES.map((priority) => ({
                        value: priority,
                        label: priority,
                        className: "",
                        style: {
                          background: PRIORITY_BADGE[priority].bg,
                          color: PRIORITY_BADGE[priority].color,
                          fontSize: "var(--text-overline)",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 500,
                          borderRadius: "4px",
                          padding: "2px 7px",
                        },
                      }))}
                    />
                  </td>

                  {/* Category */}
                  <td style={{ padding: "9px 12px" }} onClick={(e) => e.stopPropagation()}>
                    <BadgeSelect
                      value={task.category}
                      onValueChange={(value) => onUpdateTask(task.id, { category: value as TaskCategory })}
                      options={TASK_CATEGORIES.map((category) => ({
                        value: category,
                        label: category,
                        className: "",
                        style: {
                          background: "var(--surf-3)",
                          color: "var(--text-2)",
                          fontSize: "var(--text-overline)",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 500,
                          borderRadius: "4px",
                          padding: "2px 7px",
                        },
                      }))}
                    />
                  </td>

                  {/* Actions */}
                  <td
                    style={{ padding: "9px 12px", textAlign: "center" }}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 justify-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(task) }}
                        style={{
                          border: "1px solid var(--border-2)",
                          color: "var(--text-3)",
                          borderRadius: "4px",
                          padding: "2px 7px",
                          fontSize: "var(--text-meta)",
                          background: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                      >
                        Edit
                      </button>
                      {onDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
                          style={{
                            border: "1px solid var(--border-2)",
                            color: "var(--text-3)",
                            borderRadius: "4px",
                            padding: "2px 7px",
                            fontSize: "var(--text-meta)",
                            background: "none",
                            cursor: "pointer",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                          aria-label="Delete task"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </DraggableTableRow>
              ))}
            </SortableContext>
          </tbody>
        </table>
      </div>
    </div>
  )
}
