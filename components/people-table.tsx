"use client"

import { DataTable, ColumnDef, FilterDef } from "@/components/ui/data-table"
import { Pencil, Trash2, UserX, UserCheck } from "lucide-react"
import { type Person } from "@/lib/services/people"
import { LEVEL_BADGE } from "@/lib/badge-styles"

export type { Person }

interface PeopleTableProps {
  people: Person[]
  onRowClick?: (person: Person) => void
  onEdit: (person: Person) => void
  onDelete: (person: Person) => void
  onToggleStatus: (person: Person) => void
  onQuickAdd: () => void
}

function LevelChip({ level }: { level: string }) {
  const { bg, color: text } = LEVEL_BADGE[level] ?? LEVEL_BADGE.Other
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 7px",
      borderRadius: "3px",
      fontSize: "var(--text-overline)",
      fontWeight: 500,
      fontFamily: "var(--font-mono)",
      background: bg,
      color: text,
    }}>
      {level}
    </span>
  )
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

export function PeopleTable({
  people,
  onRowClick,
  onEdit,
  onDelete,
  onToggleStatus,
  onQuickAdd,
}: PeopleTableProps) {
  const columns: ColumnDef<Person>[] = [
    {
      id: "avatar",
      header: "",
      sortable: false,
      cell: (person) => {
        const isInactive = person.status === "inactive"
        return (
          <div style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "var(--surf-3)",
            color: "var(--text-2)",
            fontSize: "var(--text-overline)",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            opacity: isInactive ? 0.4 : 1,
          }}>
            {getInitials(person.name)}
          </div>
        )
      },
    },
    {
      id: "name",
      header: "Name",
      accessorKey: "name",
      cell: (person) => {
        const isInactive = person.status === "inactive"
        return (
          <span style={{ fontWeight: 500, fontSize: "var(--text-meta)", color: isInactive ? "var(--text-3)" : "var(--text-1)" }}>
            {person.name}
          </span>
        )
      },
    },
    {
      id: "role",
      header: "Role",
      accessorKey: "role",
      cell: (person) => {
        const isInactive = person.status === "inactive"
        return (
          <span style={{ color: isInactive ? "var(--text-3)" : "var(--text-2)", fontSize: "var(--text-meta)" }}>
            {person.role}
          </span>
        )
      },
    },
    {
      id: "level",
      header: "Level",
      accessorKey: "level",
      cell: (person) => person.level ? <LevelChip level={person.level} /> : null,
    },
    {
      id: "teams",
      header: "Teams",
      sortable: false,
      cell: (person) => {
        const isInactive = person.status === "inactive"
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px" }}>
            {person.teams.map((team, idx) => (
              <span key={idx} style={{
                background: "var(--surf-3)",
                color: isInactive ? "var(--text-3)" : "var(--text-2)",
                padding: "1px 5px",
                borderRadius: "3px",
                fontSize: "var(--text-overline)",
                marginRight: "2px",
              }}>
                {team}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: (person) => (
        <span style={{
          color: person.status === "active" ? "#00f058" : "var(--text-3)",
          fontSize: "var(--text-caption)",
        }}>
          ● {person.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      sortable: false,
      className: "text-right",
      cell: (person) => (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(person) }}
            style={{
              border: "1px solid var(--border-2)",
              color: "var(--text-3)",
              borderRadius: "4px",
              padding: "2px 7px",
              fontSize: "var(--text-meta)",
              background: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
          >
            <Pencil style={{ width: "11px", height: "11px" }} /> Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleStatus(person) }}
            style={{
              border: "1px solid var(--border-2)",
              color: "var(--text-3)",
              borderRadius: "4px",
              padding: "2px 7px",
              fontSize: "var(--text-meta)",
              background: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
          >
            {person.status === "active"
              ? <><UserX style={{ width: "11px", height: "11px" }} /> Deactivate</>
              : <><UserCheck style={{ width: "11px", height: "11px" }} /> Activate</>
            }
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(person) }}
            style={{
              border: "1px solid var(--border-2)",
              color: "var(--text-3)",
              borderRadius: "4px",
              padding: "2px 7px",
              fontSize: "var(--text-meta)",
              background: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
          >
            <Trash2 style={{ width: "11px", height: "11px" }} /> Delete
          </button>
        </div>
      ),
    },
  ]

  const filters: FilterDef<Person>[] = [
    {
      id: "status",
      label: "Status",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
      filterFn: (person, value) => person.status === value,
    },
    {
      id: "level",
      label: "Level",
      options: [
        { value: "Junior", label: "Junior" },
        { value: "Mid", label: "Mid" },
        { value: "Senior", label: "Senior" },
        { value: "Staff", label: "Staff" },
        { value: "Principal", label: "Principal" },
      ],
      filterFn: (person, value) => person.level === value,
    },
  ]

  return (
    <DataTable
      data={people}
      columns={columns}
      filters={filters}
      searchKeys={["name", "role"]}
      searchPlaceholder="Search people..."
      onRowClick={onRowClick}
      onQuickAdd={onQuickAdd}
      quickAddLabel="Add person"
    />
  )
}
