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
    <div style={{ padding: "32px" }}>
      <p style={{ color: "var(--text-3)" }}>Loading…</p>
    </div>
  )

  if (!team) return (
    <div style={{ padding: "32px" }}>
      <p>Team not found</p>
    </div>
  )

  return (
    <div style={{ padding: "32px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={() => router.push("/teams")}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "var(--text-2)", cursor: "pointer", fontSize: "var(--text-label)", marginBottom: "16px", padding: "4px 0" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-1)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-2)")}
        >
          <ArrowLeft style={{ width: "14px", height: "14px" }} /> Back to Teams
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div>
            <h1>{team.name}</h1>
            {team.description && <p style={{ marginTop: "2px" }}>{team.description}</p>}
          </div>
          <span style={{
            padding: "2px 8px", borderRadius: "4px", fontSize: "var(--text-caption)", fontWeight: 600,
            background: team.status === 'active' ? "#0d2015" : "#1a1a22",
            color: team.status === 'active' ? "#4ade80" : "#6b7280",
          }}>
            {team.status}
          </span>
        </div>
      </div>

      {/* Team overview card */}
      <div style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "8px", padding: "20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "32px" }}>
          <div>
            <p style={{ fontSize: "var(--text-overline)", color: "var(--text-3)", fontWeight: 600, marginBottom: "2px" }}>MEMBERS</p>
            <p style={{ fontSize: "var(--text-h2)", fontWeight: 700, color: "var(--text-1)" }}>{team.memberCount}</p>
          </div>
          {team.notes && (
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "var(--text-overline)", color: "var(--text-3)", fontWeight: 600, marginBottom: "4px" }}>NOTES</p>
              <p style={{ fontSize: "var(--text-label)", color: "var(--text-2)" }}>{team.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Skills matrix */}
      <div style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "8px", padding: "24px" }}>
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ margin: 0 }}>Skills Matrix</h2>
          <p style={{ marginTop: "2px" }}>Competency assessment across all team members. Click a column header to sort.</p>
        </div>
        <SkillsMatrix memberIds={team.memberIds ?? []} />
      </div>
    </div>
  )
}
