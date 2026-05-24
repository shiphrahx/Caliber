"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getTeams, type Team } from "@/lib/services/teams"
import { SkillsMatrix } from "@/components/competency/skills-matrix"

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then(({ id }) => setTeamId(id))
  }, [params])

  useEffect(() => {
    if (!teamId) return
    getTeams().then(teams => {
      const found = teams.find(t => t.id === teamId)
      setTeam(found ?? null)
    }).finally(() => setLoading(false))
  }, [teamId])

  if (loading) return (
    <div className="page-content--lg">
      <p style={{ color: "var(--text-3)" }}>Loading…</p>
    </div>
  )

  if (!team) return (
    <div className="page-content--lg">
      <p>Team not found</p>
    </div>
  )

  return (
    <div className="page-content--lg">
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <button onClick={() => router.push("/teams")} className="team-back-btn">
          <ArrowLeft /> Back to Teams
        </button>
        <div className="team-title-row">
          <div>
            <h1>{team.name}</h1>
            {team.description && <p className="mt-0.5">{team.description}</p>}
          </div>
          <span
            className="team-status-badge"
            style={{
              background: team.status === 'active' ? "#0d2015" : "#1a1a22",
              color: team.status === 'active' ? "#4ade80" : "#6b7280",
            }}
          >
            {team.status}
          </span>
        </div>
      </div>

      {/* Team overview card */}
      <div className="team-overview-card">
        <div className="team-overview-body">
          <div>
            <p className="team-overview-stat-label">MEMBERS</p>
            <p className="team-overview-stat-value">{team.memberCount}</p>
          </div>
          {team.notes && (
            <div style={{ flex: 1 }}>
              <p className="team-overview-notes-label">NOTES</p>
              <p className="team-overview-notes-text">{team.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Skills matrix */}
      <div className="team-matrix-card">
        <div className="team-matrix-header">
          <h2 className="team-matrix-title">Skills Matrix</h2>
          <p className="team-matrix-sub">Competency assessment across all team members. Click a column header to sort.</p>
        </div>
        <SkillsMatrix memberIds={team.memberIds ?? []} />
      </div>
    </div>
  )
}
