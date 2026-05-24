"use client"

import { useState, useMemo, useCallback } from "react"
import { Task, TaskStatus, TaskPriority, TaskCategory, TASK_STATUSES, TASK_PRIORITIES, TASK_CATEGORIES } from "@/lib/types/task"
import { PRIORITY_BADGE, STATUS_BADGE } from "@/lib/badge-styles"
import { BadgeSelect } from "@/components/ui/badge-select"
import { Plus, ArrowUpDown, GripVertical, Search, Sparkles, X } from "lucide-react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { DraggableTableRow } from "./draggable-table-row"
import { prioritiseTasks, type TaskRanking } from "@/lib/services/tasks"
import { handleAIError } from "@/lib/services/ai"

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

  // AI prioritisation state
  const [aiRankings, setAiRankings] = useState<TaskRanking[] | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAbort, setAiAbort] = useState<AbortController | null>(null)

  const handleAIPrioritise = useCallback(async () => {
    if (aiLoading) {
      aiAbort?.abort()
      setAiLoading(false)
      setAiAbort(null)
      return
    }

    if (aiRankings) {
      // Toggle off
      setAiRankings(null)
      return
    }

    const controller = new AbortController()
    setAiAbort(controller)
    setAiLoading(true)

    try {
      const today = new Date().toISOString().split("T")[0]
      const input = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate,
        category: t.category,
        status: t.status,
      }))
      const rankings = await prioritiseTasks(input, today, controller.signal)
      setAiRankings(rankings)
    } catch (err) {
      handleAIError(err)
    } finally {
      setAiLoading(false)
      setAiAbort(null)
    }
  }, [aiLoading, aiRankings, aiAbort, tasks])

  // Build a rank lookup map: taskId → { rank, reason }
  const rankMap = useMemo<Map<string, TaskRanking>>(() => {
    if (!aiRankings) return new Map()
    return new Map(aiRankings.map((r) => [r.taskId, r]))
  }, [aiRankings])

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

    // When AI ranking is active, sort by AI rank; otherwise use manual sort
    if (aiRankings && rankMap.size > 0) {
      filtered.sort((a, b) => {
        const rankA = rankMap.get(a.id)?.rank ?? Infinity
        const rankB = rankMap.get(b.id)?.rank ?? Infinity
        return rankA - rankB
      })
    } else {
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
    }

    return filtered
  }, [tasks, searchQuery, statusFilter, priorityFilter, categoryFilter, sortField, sortDirection, aiRankings, rankMap])

  const formatDate = (date: string | null) => {
    if (!date) return ""
    return new Date(date).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <div className="space-y-0">
      {/* Controls row */}
      <div className="backlog-controls">
        {/* Left: search + filters button */}
        <div className="backlog-controls-left">
          {/* Search */}
          <div className="backlog-search-wrap">
            <Search className="absolute backlog-search-icon" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="backlog-search-input"
              onFocus={e => (e.currentTarget.style.borderColor = "var(--border-2)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--border-1)")}
            />
          </div>

          {/* Filters button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="backlog-filters-btn"
            style={{ background: showFilters ? "var(--surf-3)" : "transparent" }}
          >
            Filters
          </button>
        </div>

        {/* Right: AI Prioritise + New task */}
        <div className="backlog-controls-right">
          {/* AI Prioritise button */}
          <button
            onClick={handleAIPrioritise}
            title={aiRankings ? "Clear AI ranking" : "Rank backlog by AI"}
            style={{
              background: aiRankings
                ? "rgba(124,58,237,0.15)"
                : aiLoading
                ? "rgba(124,58,237,0.08)"
                : "transparent",
              border: "1px solid",
              borderColor: aiRankings || aiLoading ? "#7C3AED" : "var(--border-2)",
              color: aiRankings || aiLoading ? "#a78bfa" : "var(--text-2)",
              fontSize: "var(--text-label)",
              fontWeight: 500,
              padding: "5px 10px",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              if (!aiRankings && !aiLoading) e.currentTarget.style.color = "var(--text-1)"
            }}
            onMouseLeave={e => {
              if (!aiRankings && !aiLoading) e.currentTarget.style.color = "var(--text-2)"
            }}
          >
            {aiRankings ? (
              <>
                <X className="h-3.5 w-3.5" />
                Clear AI rank
              </>
            ) : aiLoading ? (
              <>
                <Sparkles className="h-3.5 w-3.5" style={{ animation: "pulse 1s infinite" }} />
                Ranking…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                AI Prioritise
              </>
            )}
          </button>

          {/* New task */}
          <button onClick={onQuickAdd} className="backlog-new-task-btn">
            <Plus className="h-3.5 w-3.5" />
            New task
          </button>
        </div>
      </div>

      {/* AI ranking active banner */}
      {aiRankings && (
        <div className="backlog-ai-banner">
          <Sparkles />
          <span>Backlog ranked by AI priority. Hover the rank number to see the reason. <strong>Drag to reorder manually.</strong></span>
        </div>
      )}

      {/* Filter row */}
      {showFilters && (
        <div className="backlog-filter-row">
          {[
            { label: "Status", value: statusFilter, onChange: (v: string) => setStatusFilter(v as TaskStatus | "all"), options: TASK_STATUSES },
            { label: "Priority", value: priorityFilter, onChange: (v: string) => setPriorityFilter(v as TaskPriority | "all"), options: TASK_PRIORITIES },
            { label: "Category", value: categoryFilter, onChange: (v: string) => setCategoryFilter(v as TaskCategory | "all"), options: TASK_CATEGORIES },
          ].map(({ label, value, onChange, options }) => (
            <div key={label} className="backlog-filter-item">
              <label className="backlog-filter-label">{label}:</label>
              <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="backlog-filter-select"
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
        className="backlog-table-wrap max-md:overflow-x-auto"
        style={{ border: isOver ? "1px solid var(--border-2)" : "1px solid var(--border-1)" }}
      >
        <table className="w-full border-collapse">
          <colgroup>
            <col style={{ width: "36px" }} />
            {aiRankings && <col style={{ width: "52px" }} />}
            <col />
            <col style={{ width: "140px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "80px" }} />
          </colgroup>
          <thead>
            <tr className="backlog-thead-tr">
              {/* Drag handle col */}
              <th className="backlog-th-handle" />
              {/* AI rank col header */}
              {aiRankings && (
                <th className="backlog-th-rank">
                  <span className="backlog-th-rank-label">#</span>
                </th>
              )}
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
                  <th key={field} className="backlog-th">
                    <button
                      onClick={() => handleSort(field)}
                      className="backlog-sort-btn"
                    >
                      {labels[field]}
                      <ArrowUpDown />
                    </button>
                  </th>
                )
              })}
              {/* Actions col */}
              <th className="backlog-th" />
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
                    className="backlog-td-handle"
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <div className="active:cursor-grabbing drag-handle cursor-grab inline-flex">
                      <GripVertical className="backlog-grip-icon" />
                    </div>
                  </td>

                  {/* AI rank badge */}
                  {aiRankings && (() => {
                    const ranking = rankMap.get(task.id)
                    return (
                      <td
                        className="backlog-td-rank"
                        title={ranking?.reason ?? "Not ranked"}
                      >
                        {ranking ? (
                          <span
                            className="backlog-rank-badge"
                            style={{
                              background: ranking.rank <= 3 ? "rgba(124,58,237,0.2)" : "var(--surf-3)",
                              color: ranking.rank <= 3 ? "#a78bfa" : "var(--text-3)",
                            }}
                          >
                            {ranking.rank}
                          </span>
                        ) : (
                          <span className="backlog-rank-unranked">—</span>
                        )}
                      </td>
                    )
                  })()}

                  {/* Name */}
                  <td className="backlog-td-name" title={task.title}>
                    <div className="line-clamp-2 break-all max-md:break-words">{task.title}</div>
                  </td>

                  {/* Status */}
                  <td className="backlog-td" onClick={(e) => e.stopPropagation()}>
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
                  <td className="backlog-td-date">
                    {formatDate(task.dueDate) || "—"}
                  </td>

                  {/* Priority */}
                  <td className="backlog-td" onClick={(e) => e.stopPropagation()}>
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
                  <td className="backlog-td" onClick={(e) => e.stopPropagation()}>
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
                    className="backlog-td-actions"
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 justify-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(task) }}
                        className="backlog-action-btn"
                      >
                        Edit
                      </button>
                      {onDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
                          className="backlog-action-btn backlog-action-btn--danger"
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
