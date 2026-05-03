"use client"

import { useState, useEffect } from "react"
import { TeamFormDialog } from "@/components/team-form-dialog"
import { TeamsTable } from "@/components/teams-table"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { getTeams, createTeam, updateTeam, deleteTeam as deleteTeamService, toggleTeamStatus, type Team } from "@/lib/services/teams"
import { getPeople, type Person } from "@/lib/services/people"

const byName = <T extends { name: string }>(arr: T[]) =>
  [...arr].sort((a, b) => a.name.localeCompare(b.name))

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null)
  const [, setIsLoading] = useState(true)

  useEffect(() => {
    loadTeams()
    loadPeople()
  }, [])

  const loadPeople = async () => {
    try {
      const data = await getPeople()
      setPeople(data)
    } catch (error) {
      console.error('Failed to load people:', error)
    }
  }

  const loadTeams = async () => {
    try {
      setIsLoading(true)
      const data = await getTeams()
      setTeams(byName(data))
    } catch (error) {
      console.error('Failed to load teams:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddTeam = async (newTeam: Team) => {
    try {
      const team = await createTeam(newTeam)
      setTeams(byName([...teams, team]))
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error('Failed to create team:', error)
    }
  }

  const handleEditTeam = async (updatedTeam: Team) => {
    try {
      const team = await updateTeam(updatedTeam.id, updatedTeam)
      setTeams(byName(teams.map(t => t.id === team.id ? team : t)))
      setEditingTeam(null)
    } catch (error) {
      console.error('Failed to update team:', error)
    }
  }

  const handleToggleStatus = async (team: Team) => {
    try {
      const updatedTeam = await toggleTeamStatus(team.id, team.status)
      setTeams(byName(teams.map(t => t.id === updatedTeam.id ? updatedTeam : t)))
    } catch (error) {
      console.error('Failed to toggle team status:', error)
    }
  }

  const handleDeleteTeam = async () => {
    if (deletingTeam) {
      try {
        await deleteTeamService(deletingTeam.id)
        setTeams(teams.filter(t => t.id !== deletingTeam.id))
        setDeletingTeam(null)
      } catch (error) {
        console.error('Failed to delete team:', error)
      }
    }
  }

  const activeTeams = teams.filter(t => t.status === "active")
  const totalMembers = activeTeams.reduce((sum, t) => sum + t.memberCount, 0)
  const avgSize = activeTeams.length > 0 ? Math.round(totalMembers / activeTeams.length) : 0

  return (
    <>
      {/* Top bar */}
      <div className="page-topbar">
        <span className="page-topbar-title">Teams</span>
        <button className="btn-primary" onClick={() => setIsAddDialogOpen(true)}>
          + Create team
        </button>
      </div>

      <div style={{ padding: "16px" }}>
        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "7px", marginBottom: "14px" }}>
          {[
            { label: "Active teams", value: activeTeams.length, sub: `${teams.filter(t => t.status === "inactive").length} inactive` },
            { label: "Total members", value: totalMembers, sub: "In active teams" },
            { label: "Avg team size", value: avgSize, sub: "Members per active team" },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{
              background: "var(--surf)",
              border: "1px solid var(--border-1)",
              borderRadius: "6px",
              padding: "10px 12px",
            }}>
              <div className="form-label">{label}</div>
              <div style={{ fontSize: "20px", fontWeight: 500, color: "var(--text-1)", fontFamily: "var(--font-mono)" }}>
                {value}
              </div>
              <div style={{ fontSize: "var(--text-overline)", color: "var(--text-3)", marginTop: "2px" }}>
                {sub}
              </div>
            </div>
          ))}
        </div>

        {/* Teams Table */}
        <TeamsTable
          teams={teams}
          onEdit={(team) => setEditingTeam(team)}
          onDelete={(team) => setDeletingTeam(team)}
          onToggleStatus={handleToggleStatus}
          onQuickAdd={() => setIsAddDialogOpen(true)}
        />
      </div>

      <TeamFormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleAddTeam}
        availablePeople={people}
      />
      <TeamFormDialog
        open={!!editingTeam}
        onOpenChange={(open) => !open && setEditingTeam(null)}
        team={editingTeam}
        onSave={handleEditTeam}
        availablePeople={people}
      />
      <DeleteConfirmDialog
        open={!!deletingTeam}
        onOpenChange={(open) => !open && setDeletingTeam(null)}
        onConfirm={handleDeleteTeam}
        itemName={deletingTeam?.name || ""}
        itemType="Team"
        description="This action cannot be undone. This will permanently delete this team and remove all associated data."
      />
    </>
  )
}
