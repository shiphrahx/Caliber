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
          style={{ fontWeight: 500, color: "var(--text-1)", fontSize: "var(--text-meta)", textDecoration: "none" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#00f058")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-1)")}
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
        <span style={{ color: "var(--text-2)", fontSize: "var(--text-meta)" }}>{team.description}</span>
      ),
    },
    {
      id: "memberCount",
      header: "Members",
      accessorKey: "memberCount",
      cell: (team) => (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-meta)", color: "var(--text-1)" }}>{team.memberCount}</span>
      ),
    },
    {
      id: "createdAt",
      header: "Created",
      accessorKey: "createdAt",
      cell: (team) => (
        <span style={{ color: "var(--text-3)", fontSize: "var(--text-overline)", fontFamily: "var(--font-mono)" }}>
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
        <span style={{
          color: team.status === "active" ? "#00f058" : "var(--text-3)",
          fontSize: "var(--text-caption)",
        }}>
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
            onClick={(e) => { e.stopPropagation(); onToggleStatus(team) }}
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
            {team.status === "active"
              ? <><UserX style={{ width: "11px", height: "11px" }} /> Deactivate</>
              : <><UserCheck style={{ width: "11px", height: "11px" }} /> Activate</>
            }
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(team) }}
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
