"use client"

import Link from "next/link"
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/data-table"
import { Pencil, Trash2, UserX, UserCheck } from "lucide-react"
import { type Team } from "@/lib/services/teams"

export type { Team }

interface TeamsTableProps {
  teams: Team[]
  onEdit: (team: Team) => void
  onDelete: (team: Team) => void
  onToggleStatus: (team: Team) => void
  onQuickAdd: () => void
}

export function TeamsTable({
  teams,
  onEdit,
  onDelete,
  onToggleStatus,
  onQuickAdd,
}: TeamsTableProps) {
  const columns: ColumnDef<Team>[] = [
    {
      id: "name",
      header: "Team Name",
      accessorKey: "name",
      cell: (team) => (
        <Link
          href={`/teams/${team.id}`}
          className="cell-link"
          onClick={e => e.stopPropagation()}
        >
          {team.name}
        </Link>
      ),
    },
    {
      id: "description",
      header: "Description",
      accessorKey: "description",
      cell: (team) => (
        <span className="cell-text">{team.description}</span>
      ),
    },
    {
      id: "memberCount",
      header: "Members",
      accessorKey: "memberCount",
      cell: (team) => (
        <span className="cell-mono">{team.memberCount}</span>
      ),
    },
    {
      id: "createdAt",
      header: "Created",
      accessorKey: "createdAt",
      cell: (team) => (
        <span className="cell-date">
          {new Date(team.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: (team) => (
        <span className={`status-badge ${team.status === "active" ? "status-badge--active" : "status-badge--inactive"}`}>
          ● {team.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      sortable: false,
      className: "text-right",
      cell: (team) => (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(team) }}
            className="table-action-btn"
          >
            <Pencil /> Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleStatus(team) }}
            className="table-action-btn"
          >
            {team.status === "active"
              ? <><UserX /> Deactivate</>
              : <><UserCheck /> Activate</>
            }
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(team) }}
            className="table-action-btn table-action-btn--danger"
          >
            <Trash2 /> Delete
          </button>
        </div>
      ),
    },
  ]

  const filters: FilterDef<Team>[] = [
    {
      id: "status",
      label: "Status",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
      filterFn: (team, value) => team.status === value,
    },
  ]

  return (
    <DataTable
      data={teams}
      columns={columns}
      filters={filters}
      searchKeys={["name", "description"]}
      searchPlaceholder="Search teams..."
      onRowClick={onEdit}
      onQuickAdd={onQuickAdd}
      quickAddLabel="Create team"
    />
  )
}
