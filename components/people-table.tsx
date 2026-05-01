"use client"

import { DataTable, ColumnDef, FilterDef } from "@/components/ui/data-table"
import { MoreHorizontal, Pencil, Trash2, UserX, UserCheck } from "lucide-react"
import { useState, useEffect } from "react"
import { type Person } from "@/lib/services/people"

export type { Person }

interface PeopleTableProps {
  people: Person[]
  onRowClick?: (person: Person) => void
  onEdit: (person: Person) => void
  onDelete: (person: Person) => void
  onToggleStatus: (person: Person) => void
  onQuickAdd: () => void
}

// Level chip: [background, text]
const LEVEL_CHIP: Record<string, [string, string]> = {
  Junior:    ["#0d1420", "#818cf8"],
  Mid:       ["#0a1a2e", "#5b9bd5"],
  Senior:    ["#0f1a0a", "#4ade80"],
  Staff:     ["#1a1200", "#c9a227"],
  Principal: ["#1e0d00", "#e07030"],
  Other:     ["#222222", "#888888"],
}

function LevelChip({ level }: { level: string }) {
  const [bg, text] = LEVEL_CHIP[level] ?? LEVEL_CHIP.Other
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 7px",
      borderRadius: "3px",
      fontSize: "9px",
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
  const [selectedPersonMenu, setSelectedPersonMenu] = useState<string | null>(null)

  useEffect(() => {
    const handleClickOutside = () => {
      if (selectedPersonMenu !== null) setSelectedPersonMenu(null)
    }
    if (selectedPersonMenu !== null) {
      document.addEventListener("click", handleClickOutside)
    }
    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [selectedPersonMenu])

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
            fontSize: "9px",
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
          <span style={{ fontWeight: 500, fontSize: "11px", color: isInactive ? "var(--text-3)" : "var(--text-1)" }}>
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
          <span style={{ color: isInactive ? "var(--text-3)" : "var(--text-2)", fontSize: "11px" }}>
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
                fontSize: "9px",
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
          fontSize: "10px",
        }}>
          ● {person.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      sortable: false,
      className: "text-right",
      cell: (person) => (
        <div className="relative inline-block">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setSelectedPersonMenu(selectedPersonMenu === person.id ? null : person.id)
            }}
            style={{
              background: "none",
              border: "1px solid var(--border-2)",
              color: "var(--text-3)",
              borderRadius: "3px",
              padding: "2px 6px",
              cursor: "pointer",
              fontSize: "10px",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
          >
            <MoreHorizontal style={{ width: "12px", height: "12px" }} />
          </button>
          {selectedPersonMenu === person.id && (
            <div style={{
              position: "absolute",
              right: 0,
              marginTop: "4px",
              width: "148px",
              background: "var(--surf-2)",
              border: "1px solid var(--border-2)",
              borderRadius: "4px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              zIndex: 50,
              overflow: "hidden",
            }}>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(person); setSelectedPersonMenu(null) }}
                style={{ display: "flex", width: "100%", alignItems: "center", gap: "6px", padding: "7px 10px", fontSize: "11px", color: "var(--text-2)", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-3)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <Pencil style={{ width: "11px", height: "11px" }} /> Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleStatus(person) }}
                style={{ display: "flex", width: "100%", alignItems: "center", gap: "6px", padding: "7px 10px", fontSize: "11px", color: "var(--text-2)", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-3)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                {person.status === "active"
                  ? <><UserX style={{ width: "11px", height: "11px" }} /> Set Inactive</>
                  : <><UserCheck style={{ width: "11px", height: "11px" }} /> Set Active</>
                }
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(person); setSelectedPersonMenu(null) }}
                style={{ display: "flex", width: "100%", alignItems: "center", gap: "6px", padding: "7px 10px", fontSize: "11px", color: "#f87171", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-3)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <Trash2 style={{ width: "11px", height: "11px" }} /> Delete
              </button>
            </div>
          )}
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
