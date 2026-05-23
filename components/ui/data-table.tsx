"use client"

import { useState, useMemo, ReactNode } from "react"
import { ArrowUpDown, Search } from "lucide-react"

export interface ColumnDef<T> {
  id: string
  header: string
  accessorKey?: keyof T
  cell?: (item: T) => ReactNode
  sortable?: boolean
  className?: string
}

export interface FilterDef<T> {
  id: string
  label: string
  options: { value: string; label: string }[]
  filterFn: (item: T, value: string) => boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  filters?: FilterDef<T>[]
  searchKeys?: (keyof T)[]
  searchPlaceholder?: string
  onRowClick?: (item: T) => void
  onQuickAdd?: () => void
  quickAddLabel?: string
  emptyState?: ReactNode
}

export function DataTable<T extends { id?: number | string }>({
  data,
  columns,
  filters = [],
  searchKeys = [],
  searchPlaceholder = "Search...",
  onRowClick,
  onQuickAdd,
  quickAddLabel = "New item",
  emptyState,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filterValues, setFilterValues] = useState<Record<string, string>>(
    filters.reduce((acc, filter) => ({ ...acc, [filter.id]: "all" }), {})
  )
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const handleSort = (columnId: string) => {
    if (sortField === columnId) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(columnId)
      setSortDirection("asc")
    }
  }

  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter((item) => {
      if (searchQuery && searchKeys.length > 0) {
        const matchesSearch = searchKeys.some((key) => {
          const value = item[key]
          return value && String(value).toLowerCase().includes(searchQuery.toLowerCase())
        })
        if (!matchesSearch) return false
      }

      for (const filter of filters) {
        const filterValue = filterValues[filter.id]
        if (filterValue && filterValue !== "all") {
          if (!filter.filterFn(item, filterValue)) return false
        }
      }

      return true
    })

    if (sortField) {
      const column = columns.find((col) => col.id === sortField)
      if (column && column.accessorKey) {
        filtered.sort((a, b) => {
          const aValue = a[column.accessorKey!]
          const bValue = b[column.accessorKey!]

          let comparison = 0
          if (aValue == null) comparison = 1
          else if (bValue == null) comparison = -1
          else if (typeof aValue === "string" && typeof bValue === "string") {
            comparison = aValue.localeCompare(bValue)
          } else if (typeof aValue === "number" && typeof bValue === "number") {
            comparison = aValue - bValue
          } else {
            comparison = String(aValue).localeCompare(String(bValue))
          }

          return sortDirection === "asc" ? comparison : -comparison
        })
      }
    }

    filtered.sort((a, b) => {
      const aInactive = (a as { status?: string }).status === "inactive" ? 1 : 0
      const bInactive = (b as { status?: string }).status === "inactive" ? 1 : 0
      return aInactive - bInactive
    })

    return filtered
  }, [data, searchQuery, searchKeys, filterValues, filters, sortField, sortDirection, columns])

  return (
    <div className="data-table-wrap">
      {/* Search + controls row */}
      <div className="data-table-controls">
        <div className="data-table-controls-left">
          {searchKeys.length > 0 && (
            <div className="data-table-search-wrap">
              <Search className="data-table-search-icon" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="data-table-search-input"
                onFocus={e => (e.currentTarget.style.borderColor = "var(--border-2)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--border-1)")}
              />
            </div>
          )}
          {filters.length > 0 && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="data-table-filters-btn"
              style={{ background: showFilters ? "var(--surf-3)" : "transparent" }}
            >
              Filters
            </button>
          )}
        </div>
        {onQuickAdd && (
          <button onClick={onQuickAdd} className="data-table-add-btn">
            + {quickAddLabel}
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && filters.length > 0 && (
        <div className="data-table-filter-panel">
          {filters.map((filter) => (
            <div key={filter.id} className="data-table-filter-item">
              <label className="data-table-filter-label">{filter.label}:</label>
              <select
                value={filterValues[filter.id]}
                onChange={(e) => setFilterValues({ ...filterValues, [filter.id]: e.target.value })}
                className="data-table-filter-select"
              >
                <option value="all">All</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="data-table-box">
        <table className="data-table">
          <thead>
            <tr className="data-table-head-row">
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={`data-table-th col-header ${column.className ?? ""}`}
                >
                  {column.sortable !== false ? (
                    <button
                      onClick={() => handleSort(column.id)}
                      className="data-table-sort-btn col-header"
                    >
                      {column.header}
                      <ArrowUpDown />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedData.length > 0 ? (
              filteredAndSortedData.map((item, idx) => (
                <tr
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className="group transition-colors"
                  style={{
                    borderBottom: idx < filteredAndSortedData.length - 1 ? "1px solid var(--border-1)" : "none",
                    cursor: onRowClick ? "pointer" : "default",
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--surf-2)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  {columns.map((column) => (
                    <td key={column.id} className={`data-table-td ${column.className ?? ""}`}>
                      {column.cell
                        ? column.cell(item)
                        : column.accessorKey
                          ? String(item[column.accessorKey] || "")
                          : ""}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="data-table-empty-td">
                  {emptyState || (
                    <div className="data-table-empty-state">
                      <p className="data-table-empty-text">No items found</p>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
