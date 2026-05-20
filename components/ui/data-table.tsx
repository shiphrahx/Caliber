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
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Search + controls row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {searchKeys.length > 0 && (
            <div style={{ position: "relative" }}>
              <Search
                style={{
                  position: "absolute",
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
                placeholder={searchPlaceholder}
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
                  fontFamily: "var(--font-sans)",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--border-2)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--border-1)")}
              />
            </div>
          )}
          {filters.length > 0 && (
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
                fontFamily: "var(--font-sans)",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-2)")}
            >
              Filters
            </button>
          )}
        </div>
        {onQuickAdd && (
          <button
            onClick={onQuickAdd}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: "linear-gradient(90deg, #00ffe5 0%, #00f058 100%)",
              border: "none",
              color: "#0a1a0a",
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "var(--text-caption)",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            + {quickAddLabel}
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && filters.length > 0 && (
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
          {filters.map((filter) => (
            <div key={filter.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label style={{ fontSize: "var(--text-label)", color: "var(--text-2)", fontWeight: 500, fontFamily: "var(--font-sans)" }}>
                {filter.label}:
              </label>
              <select
                value={filterValues[filter.id]}
                onChange={(e) => setFilterValues({ ...filterValues, [filter.id]: e.target.value })}
                style={{
                  background: "var(--surf-2)",
                  border: "1px solid var(--border-2)",
                  borderRadius: "4px",
                  padding: "3px 6px",
                  fontSize: "var(--text-label)",
                  color: "var(--text-1)",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
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
      <div style={{
        background: "var(--surf)",
        border: "1px solid var(--border-1)",
        borderRadius: "8px",
        overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-1)" }}>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={`col-header ${column.className ?? ""}`}
                  style={{ padding: "8px 12px", background: "var(--surf)" }}
                >
                  {column.sortable !== false ? (
                    <button
                      onClick={() => handleSort(column.id)}
                      className="col-header"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        fontFamily: "var(--font-sans)",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                    >
                      {column.header}
                      <ArrowUpDown style={{ width: "11px", height: "11px", flexShrink: 0 }} />
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
                    <td
                      key={column.id}
                      style={{ padding: "9px 12px", fontSize: "var(--text-meta)", color: "var(--text-1)" }}
                      className={column.className}
                    >
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
                <td colSpan={columns.length} style={{ padding: 0 }}>
                  {emptyState || (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", textAlign: "center" }}>
                      <p style={{ fontSize: "var(--text-meta)", color: "var(--text-3)" }}>No items found</p>
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
