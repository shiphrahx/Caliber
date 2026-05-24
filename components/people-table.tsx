"use client"

import { DataTable, ColumnDef, FilterDef } from "@/components/ui/data-table"
import { Pencil, Trash2, UserX, UserCheck } from "lucide-react"
import { type Person } from "@/lib/services/people"
import { LEVEL_BADGE } from "@/lib/badge-styles"
import { scoreToColor } from "@/lib/signals/types"

export type { Person }

interface PeopleTableProps {
  people: Person[]
  onRowClick?: (person: Person) => void
  onEdit: (person: Person) => void
  onDelete: (person: Person) => void
  onToggleStatus: (person: Person) => void
  onQuickAdd: () => void
  attentionScores?: Record<string, number>
}

function LevelChip({ level }: { level: string }) {
  const { bg, color: text } = LEVEL_BADGE[level] ?? LEVEL_BADGE.Other
  return (
    <span className="level-chip" style={{ background: bg, color: text }}>
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
  attentionScores = {},
}: PeopleTableProps) {
  const columns: ColumnDef<Person>[] = [
    {
      id: "avatar",
      header: "",
      sortable: false,
      cell: (person) => {
        const isInactive = person.status === "inactive"
        return (
          <div className="avatar-chip" style={{ opacity: isInactive ? 0.4 : 1 }}>
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
        const score = attentionScores[person.id] ?? 0
        return (
          <div className="table-name-row">
            {score > 0 && (
              <span
                title={`Attention score: ${score}`}
                className="attention-dot"
                style={{ background: scoreToColor(score) }}
              />
            )}
            <span className={`table-name ${isInactive ? "table-name--inactive" : "table-name--active"}`}>
              {person.name}
            </span>
          </div>
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
          <span className={`table-role ${isInactive ? "table-role--inactive" : "table-role--active"}`}>
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
          <div className="table-teams">
            {person.teams.map((team, idx) => (
              <span key={idx} className="team-chip" style={{ color: isInactive ? "var(--text-3)" : "var(--text-2)" }}>
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
        <span className={`status-badge ${person.status === "active" ? "status-badge--active" : "status-badge--inactive"}`}>
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
            className="table-action-btn"
          >
            <Pencil /> Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleStatus(person) }}
            className="table-action-btn"
          >
            {person.status === "active"
              ? <><UserX /> Deactivate</>
              : <><UserCheck /> Activate</>
            }
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(person) }}
            className="table-action-btn table-action-btn--danger"
          >
            <Trash2 /> Delete
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
