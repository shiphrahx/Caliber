"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  getActiveFramework, getAreasForFramework, getAssessmentsForTeam, levelToScore,
  type CompetencyFramework, type CompetencyArea, type CompetencyAssessment,
} from "@/lib/services/competency"
import { getPeople, type Person } from "@/lib/services/people"

// ─── Gap analysis ─────────────────────────────────────────────────────────────

interface GapAnalysis {
  strengths: string[]
  gaps: string[]
  keyPersonRisks: string[]
  unassessed: string[]
}

function computeGapAnalysis(
  people: Person[],
  areas: CompetencyArea[],
  latestByPersonArea: Record<string, Record<string, CompetencyAssessment>>,
): GapAnalysis {
  const strengths: string[] = []
  const gaps: string[] = []
  const keyPersonRisks: string[] = []
  const unassessed: string[] = []

  for (const area of areas) {
    const assessedPeople = people.filter(p => latestByPersonArea[p.id]?.[area.id])
    const unassessedCount = people.length - assessedPeople.length

    if (unassessedCount > people.length / 2) {
      unassessed.push(area.name)
      continue
    }

    const atExpected = assessedPeople.filter(p => {
      const ass = latestByPersonArea[p.id]?.[area.id]
      if (!ass || !p.level) return false
      return ass.score >= levelToScore(p.level)
    })

    const atSenior = assessedPeople.filter(p => {
      const ass = latestByPersonArea[p.id]?.[area.id]
      return ass && ass.score >= 3
    })

    if (atExpected.length >= assessedPeople.length * 0.66) {
      strengths.push(area.name)
    } else if (atExpected.length < assessedPeople.length * 0.5) {
      gaps.push(area.name)
    }

    if (atSenior.length === 1) {
      keyPersonRisks.push(`${area.name} (only ${atSenior[0].name})`)
    }
  }

  return { strengths, gaps, keyPersonRisks, unassessed }
}

// ─── Cell ─────────────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<string, string> = {
  Junior: "#818cf8",
  Mid: "#5b9bd5",
  Senior: "#4ade80",
  Staff: "#c9a227",
  Principal: "#e07030",
}

function MatrixCell({ assessment, personLevel }: { assessment: CompetencyAssessment | null; personLevel: string | null }) {
  if (!assessment) {
    return (
      <td style={{ padding: "8px 12px", textAlign: "center", color: "var(--text-3)", fontSize: "var(--text-caption)", background: "var(--surf-2)" }}>
        —
      </td>
    )
  }

  const expectedScore = personLevel ? levelToScore(personLevel) : null
  const indicator = expectedScore === null ? ""
    : assessment.score > expectedScore ? " ↑"
    : assessment.score >= expectedScore ? " ✓"
    : " ↓"

  const cellBg = expectedScore === null ? "var(--surf)"
    : assessment.score >= expectedScore + 1 ? "#0c1a2a"
    : assessment.score >= expectedScore ? "#0d200f"
    : assessment.score === expectedScore - 1 ? "#1e1a00"
    : "#2a0a0a"

  const color = LEVEL_COLORS[assessment.assessedLevel] ?? "var(--text-2)"

  return (
    <td style={{ padding: "8px 12px", textAlign: "center", background: cellBg, fontSize: "var(--text-caption)" }}>
      <span style={{ color, fontWeight: 500 }}>
        {assessment.assessedLevel}
      </span>
      <span style={{ color: "var(--text-3)", marginLeft: "2px" }}>{indicator}</span>
    </td>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SkillsMatrixProps {
  memberIds: string[]
}

export function SkillsMatrix({ memberIds }: SkillsMatrixProps) {
  const [framework, setFramework] = useState<CompetencyFramework | null>(null)
  const [areas, setAreas] = useState<CompetencyArea[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [assessments, setAssessments] = useState<CompetencyAssessment[]>([])
  const [sortByArea, setSortByArea] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (memberIds.length === 0) { setLoading(false); return }
    ;(async () => {
      setLoading(true)
      try {
        const fw = await getActiveFramework()
        if (!fw) { setLoading(false); return }
        setFramework(fw)

        const [allPeople, rawAreas, rawAssessments] = await Promise.all([
          getPeople(),
          getAreasForFramework(fw.id),
          getAssessmentsForTeam(memberIds),
        ])

        const teamPeople = allPeople.filter(p => memberIds.includes(p.id))
        setPeople(teamPeople)
        setAreas(rawAreas)
        setAssessments(rawAssessments)
      } finally {
        setLoading(false)
      }
    })()
  }, [memberIds])

  // Latest per person per area
  const latestByPersonArea = useMemo(() => {
    const map: Record<string, Record<string, CompetencyAssessment>> = {}
    for (const ass of assessments) {
      if (!map[ass.personId]) map[ass.personId] = {}
      if (!map[ass.personId][ass.areaId]) {
        map[ass.personId][ass.areaId] = ass
      }
    }
    return map
  }, [assessments])

  // Sort people by selected area score (desc)
  const sortedPeople = useMemo(() => {
    if (!sortByArea) return people
    return [...people].sort((a, b) => {
      const sa = latestByPersonArea[a.id]?.[sortByArea]?.score ?? 0
      const sb = latestByPersonArea[b.id]?.[sortByArea]?.score ?? 0
      return sb - sa
    })
  }, [people, sortByArea, latestByPersonArea])

  const gapAnalysis = useMemo(
    () => computeGapAnalysis(people, areas, latestByPersonArea),
    [people, areas, latestByPersonArea]
  )

  if (loading) return <p style={{ color: "var(--text-3)", padding: "16px" }}>Loading skills matrix…</p>

  if (!framework) return (
    <div style={{ padding: "24px" }}>
      <p style={{ color: "var(--text-3)", marginBottom: "12px" }}>No career framework set up.</p>
      <Link href="/framework" style={{ color: "#00f058", fontSize: "var(--text-label)" }}>Set up Career Framework →</Link>
    </div>
  )

  if (people.length === 0) return (
    <p style={{ color: "var(--text-3)", padding: "16px" }}>No members in this team.</p>
  )

  return (
    <div>
      {/* Matrix table */}
      <div style={{ overflowX: "auto", marginBottom: "28px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-caption)" }}>
          <thead>
            <tr>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-2)", borderBottom: "1px solid var(--border-1)", whiteSpace: "nowrap", background: "var(--surf-2)" }}>
                Person
              </th>
              {areas.map(area => (
                <th
                  key={area.id}
                  onClick={() => setSortByArea(prev => prev === area.id ? null : area.id)}
                  style={{
                    padding: "8px 12px", textAlign: "center", fontWeight: 600,
                    color: sortByArea === area.id ? "#00f058" : "var(--text-2)",
                    whiteSpace: "nowrap",
                    background: "var(--surf-2)", cursor: "pointer",
                    borderBottom: sortByArea === area.id ? "2px solid #00f058" : "1px solid var(--border-1)",
                  } as React.CSSProperties}
                  title="Click to sort by this area"
                >
                  {area.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPeople.map((person, i) => (
              <tr key={person.id} style={{ borderBottom: "1px solid var(--border-1)" }}>
                <td style={{ padding: "8px 12px", whiteSpace: "nowrap", background: i % 2 === 0 ? "var(--surf)" : "var(--surf-2)" }}>
                  <Link
                    href={`/people/${person.id}`}
                    style={{ color: "var(--text-1)", textDecoration: "none", fontWeight: 500, fontSize: "var(--text-label)" }}
                  >
                    {person.name}
                  </Link>
                  {person.level && (
                    <span style={{ marginLeft: "6px", fontSize: "var(--text-overline)", color: LEVEL_COLORS[person.level] ?? "var(--text-3)", fontWeight: 500 }}>
                      ({person.level})
                    </span>
                  )}
                </td>
                {areas.map(area => (
                  <MatrixCell
                    key={area.id}
                    assessment={latestByPersonArea[person.id]?.[area.id] ?? null}
                    personLevel={person.level}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        {[
          { symbol: "✓", label: "At expected level", color: "#4ade80" },
          { symbol: "↑", label: "Above expected", color: "#60a5fa" },
          { symbol: "↓", label: "Below expected", color: "#fbbf24" },
          { symbol: "—", label: "Not assessed", color: "var(--text-3)" },
        ].map(({ symbol, label, color }) => (
          <span key={symbol} style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ color, fontWeight: 600 }}>{symbol}</span> {label}
          </span>
        ))}
      </div>

      {/* Gap analysis */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        {[
          { title: "Team strengths", items: gapAnalysis.strengths, color: "#4ade80", bg: "#0d2015", empty: "No clear strengths yet" },
          { title: "Team gaps", items: gapAnalysis.gaps, color: "#f87171", bg: "#2a0a0a", empty: "No significant gaps" },
          { title: "Key-person risks", items: gapAnalysis.keyPersonRisks, color: "#fbbf24", bg: "#1e1a00", empty: "No single-person dependencies" },
          { title: "Mostly unassessed", items: gapAnalysis.unassessed, color: "#9ca3af", bg: "#1a1a22", empty: "All areas have coverage" },
        ].map(({ title, items, color, empty }) => (
          <div key={title} style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "6px", padding: "14px" }}>
            <p style={{ fontWeight: 600, color: "var(--text-2)", fontSize: "var(--text-label)", marginBottom: "8px" }}>{title}</p>
            {items.length === 0 ? (
              <p style={{ fontSize: "var(--text-caption)", color: "var(--text-3)" }}>{empty}</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "4px" }}>
                {items.map(item => (
                  <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "var(--text-caption)" }}>
                    <span style={{ color, flexShrink: 0, marginTop: "1px" }}>•</span>
                    <span style={{ color: "var(--text-2)" }}>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
