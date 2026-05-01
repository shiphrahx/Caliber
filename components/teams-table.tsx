"use client"

import { DataTable, ColumnDef, FilterDef } from "@/components/ui/data-table"
import { MoreHorizontal, Pencil, Trash2, UserX, UserCheck } from "lucide-react"
import { useState, useEffect } from "react"
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
  const [selectedTeamMenu, setSelectedTeamMenu] = useState<string | null>(null)

  useEffect(() => {
    const handleClickOutside = () => {
      if (selectedTeamMenu !== null) setSelectedTeamMenu(null)
    }
    if (selectedTeamMenu !== null) {
      document.addEventListener("click", handleClickOutside)
    }
    return () => {
      document.removeEventListener("click", handleClickOutside)
    }
  }, [selectedTeamMenu])

  const columns: ColumnDef<Team>[] = [
    {
      id: "name",
      header: "Team Name",
      accessorKey: "name",
      cell: (team) => (
        <span style={{ fontWeight: 500, color: "var(--text-1)", fontSize: "var(--text-meta)" }}>{team.name}</span>
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
      header: "Actions",
      sortable: false,
      className: "text-right",
      cell: (team) => (
        <div className="relative inline-block">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setSelectedTeamMenu(selectedTeamMenu === team.id ? null : team.id)
            }}
            style={{
              background: "none",
              border: "1px solid var(--border-2)",
              color: "var(--text-3)",
              borderRadius: "3px",
              padding: "2px 6px",
              cursor: "pointer",
              fontSize: "var(--text-caption)",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
          >
            <MoreHorizontal style={{ width: "12px", height: "12px" }} />
          </button>
          {selectedTeamMenu === team.id && (
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
                onClick={(e) => { e.stopPropagation(); onEdit(team); setSelectedTeamMenu(null) }}
                className="menu-item"
                style={{ display: "flex", width: "100%", alignItems: "center", gap: "6px", padding: "7px 10px", fontSize: "var(--text-meta)", color: "var(--text-2)", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-3)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <Pencil style={{ width: "11px", height: "11px" }} /> Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleStatus(team) }}
                className="menu-item"
                style={{ display: "flex", width: "100%", alignItems: "center", gap: "6px", padding: "7px 10px", fontSize: "var(--text-meta)", color: "var(--text-2)", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-3)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                {team.status === "active"
                  ? <><UserX style={{ width: "11px", height: "11px" }} /> Set Inactive</>
                  : <><UserCheck style={{ width: "11px", height: "11px" }} /> Set Active</>
                }
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(team); setSelectedTeamMenu(null) }}
                style={{ display: "flex", width: "100%", alignItems: "center", gap: "6px", padding: "7px 10px", fontSize: "var(--text-meta)", color: "#f87171", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
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
