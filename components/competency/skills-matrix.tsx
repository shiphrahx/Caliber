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
    return <td className="skills-matrix-td-empty">—</td>
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
    <td className="skills-matrix-td" style={{ background: cellBg }}>
      <span className="skills-matrix-td-level" style={{ color }}>{assessment.assessedLevel}</span>
      <span className="skills-matrix-td-indicator">{indicator}</span>
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

  if (loading) return <p className="skills-matrix-loading">Loading skills matrix…</p>

  if (!framework) return (
    <div className="skills-matrix-no-fw">
      <p className="skills-matrix-no-fw-text">No career framework set up.</p>
      <Link href="/framework" className="skills-matrix-fw-link">Set up Career Framework →</Link>
    </div>
  )

  if (people.length === 0) return (
    <p className="skills-matrix-no-members">No members in this team.</p>
  )

  return (
    <div>
      {/* Matrix table */}
      <div className="skills-matrix-table-wrap">
        <table className="skills-matrix-table">
          <thead>
            <tr>
              <th className="skills-matrix-th-person">Person</th>
              {areas.map(area => (
                <th
                  key={area.id}
                  onClick={() => setSortByArea(prev => prev === area.id ? null : area.id)}
                  className="skills-matrix-th-area"
                  style={{
                    color: sortByArea === area.id ? "#00f058" : "var(--text-2)",
                    borderBottom: sortByArea === area.id ? "2px solid #00f058" : "1px solid var(--border-1)",
                  }}
                  title="Click to sort by this area"
                >
                  {area.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPeople.map((person, i) => (
              <tr key={person.id} className="skills-matrix-row">
                <td
                  className="skills-matrix-td-person"
                  style={{ background: i % 2 === 0 ? "var(--surf)" : "var(--surf-2)" }}
                >
                  <Link href={`/people/${person.id}`} className="skills-matrix-person-link">
                    {person.name}
                  </Link>
                  {person.level && (
                    <span
                      className="skills-matrix-person-level"
                      style={{ color: LEVEL_COLORS[person.level] ?? "var(--text-3)" }}
                    >
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
      <div className="skills-matrix-legend">
        {[
          { symbol: "✓", label: "At expected level", color: "#4ade80" },
          { symbol: "↑", label: "Above expected", color: "#60a5fa" },
          { symbol: "↓", label: "Below expected", color: "#fbbf24" },
          { symbol: "—", label: "Not assessed", color: "var(--text-3)" },
        ].map(({ symbol, label, color }) => (
          <span key={symbol} className="skills-matrix-legend-item">
            <span className="skills-matrix-legend-symbol" style={{ color }}>{symbol}</span> {label}
          </span>
        ))}
      </div>

      {/* Gap analysis */}
      <div className="skills-matrix-gap-grid">
        {[
          { title: "Team strengths", items: gapAnalysis.strengths, color: "#4ade80", empty: "No clear strengths yet" },
          { title: "Team gaps", items: gapAnalysis.gaps, color: "#f87171", empty: "No significant gaps" },
          { title: "Key-person risks", items: gapAnalysis.keyPersonRisks, color: "#fbbf24", empty: "No single-person dependencies" },
          { title: "Mostly unassessed", items: gapAnalysis.unassessed, color: "#9ca3af", empty: "All areas have coverage" },
        ].map(({ title, items, color, empty }) => (
          <div key={title} className="skills-matrix-gap-card">
            <p className="skills-matrix-gap-title">{title}</p>
            {items.length === 0 ? (
              <p className="skills-matrix-gap-empty">{empty}</p>
            ) : (
              <ul className="skills-matrix-gap-list">
                {items.map(item => (
                  <li key={item} className="skills-matrix-gap-item">
                    <span className="skills-matrix-gap-bullet" style={{ color }}>•</span>
                    <span className="skills-matrix-gap-text">{item}</span>
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
