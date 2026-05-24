'use client'

import { useState, useEffect, useCallback } from 'react'
import { Activity } from 'lucide-react'
import { getPeople } from '@/lib/services/people'
import { getTeams, type Team } from '@/lib/services/teams'
import {
  getTeamCompetencySnapshot,
  type TeamCompetencySnapshot,
} from '@/lib/services/competency'
import { callAI, handleAIError } from '@/lib/services/ai'
import {
  TEAM_COMPETENCY_SUMMARY_SYSTEM,
  buildTeamCompetencySummaryPromptFromSnapshot,
} from '@/lib/ai/prompts'
import { AIButton, AIGeneratedBadge } from '@/components/ui/ai-button'
import { useAIConfig } from '@/lib/hooks/use-ai-config'

// ─── Bar chart component ──────────────────────────────────────────────────────

interface GapBarProps {
  areaName: string
  pctBelowExpected: number
  pctAtExpected: number
  pctAboveExpected: number
  totalAssessed: number
  belowExpected: number
}

function GapBar({ areaName, pctBelowExpected, pctAtExpected, pctAboveExpected, totalAssessed, belowExpected }: GapBarProps) {
  const pctBelow = Math.round(pctBelowExpected)
  const pctAt = Math.round(pctAtExpected)
  const pctAbove = Math.round(pctAboveExpected)

  const severity = pctBelow >= 60 ? 'high' : pctBelow >= 35 ? 'medium' : 'low'
  const barColors = {
    below: severity === 'high' ? '#f87171' : severity === 'medium' ? '#fbbf24' : '#6b7280',
    at: '#4ade80',
    above: '#34d399',
  }

  return (
    <div className="th-gapbar">
      <div className="th-gapbar-row">
        <span className="th-gapbar-name">{areaName}</span>

        {/* Stacked bar */}
        <div className="th-gapbar-track">
          {pctBelow > 0 && (
            <div className="th-gapbar-segment" style={{ width: `${pctBelow}%`, background: barColors.below }} title={`${pctBelow}% below expected`} />
          )}
          {pctAt > 0 && (
            <div className="th-gapbar-segment" style={{ width: `${pctAt}%`, background: barColors.at }} title={`${pctAt}% at expected`} />
          )}
          {pctAbove > 0 && (
            <div className="th-gapbar-segment" style={{ width: `${pctAbove}%`, background: barColors.above }} title={`${pctAbove}% above expected`} />
          )}
        </div>

        {/* Labels */}
        <div className="th-gapbar-labels">
          {pctBelow > 0 && (
            <span className="th-gapbar-pct" style={{ color: barColors.below }}>
              {pctBelow}% below ({belowExpected}/{totalAssessed})
            </span>
          )}
          {pctBelow === 0 && (
            <span className="th-gapbar-ok">✓ {totalAssessed} assessed</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function ChartLegend() {
  return (
    <div className="th-legend">
      {[
        { color: '#f87171', label: 'Below expected (≥60%)' },
        { color: '#fbbf24', label: 'Below expected (35–59%)' },
        { color: '#6b7280', label: 'Below expected (<35%)' },
        { color: '#4ade80', label: 'At expected' },
        { color: '#34d399', label: 'Above expected' },
      ].map(({ color, label }) => (
        <div key={label} className="th-legend-item">
          <span className="th-legend-dot" style={{ background: color }} />
          <span className="th-legend-label">{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── AI narrative ─────────────────────────────────────────────────────────────

function AINarrative({ bullets }: { bullets: string[] }) {
  return (
    <div className="th-ai-narrative">
      <ul>
        {bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ assessedPeople, totalPeople }: { assessedPeople: number; totalPeople: number }) {
  return (
    <div className="th-empty">
      <Activity style={{ width: '32px', height: '32px', margin: '0 auto 12px', opacity: 0.4 }} />
      {totalPeople === 0 ? (
        <p>No active team members found. Add people first.</p>
      ) : assessedPeople === 0 ? (
        <p>No competency assessments yet. Assess team members from their profile pages.</p>
      ) : (
        <p>No competency data for this team.</p>
      )}
    </div>
  )
}

// ─── Team filter ──────────────────────────────────────────────────────────────

interface TeamFilterProps {
  teams: Team[]
  selectedTeamId: string | null
  onChange: (id: string | null) => void
}

function TeamFilter({ teams, selectedTeamId, onChange }: TeamFilterProps) {
  return (
    <div className="th-filter-row">
      <button
        onClick={() => onChange(null)}
        className="th-filter-btn"
        style={{
          background: selectedTeamId === null ? 'var(--surf-3)' : 'var(--surf-2)',
          border: `1px solid ${selectedTeamId === null ? 'var(--border-3)' : 'var(--border-1)'}`,
          color: selectedTeamId === null ? 'var(--text-1)' : 'var(--text-3)',
        }}
      >
        All teams
      </button>
      {teams.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="th-filter-btn"
          style={{
            background: selectedTeamId === t.id ? 'var(--surf-3)' : 'var(--surf-2)',
            border: `1px solid ${selectedTeamId === t.id ? 'var(--border-3)' : 'var(--border-1)'}`,
            color: selectedTeamId === t.id ? 'var(--text-1)' : 'var(--text-3)',
          }}
        >
          {t.name}
        </button>
      ))}
    </div>
  )
}

// ─── Stats strip ─────────────────────────────────────────────────────────────

function StatsStrip({ snapshot }: { snapshot: TeamCompetencySnapshot }) {
  const topGap = snapshot.areas[0]
  const avgPctBelow = snapshot.areas.length > 0
    ? snapshot.areas.reduce((s, a) => s + a.pctBelowExpected, 0) / snapshot.areas.length
    : 0

  return (
    <div className="th-stats-strip">
      <div className="th-stat-card">
        <div className="th-stat-label">Assessed</div>
        <div className="th-stat-val" style={{ color: 'var(--text-1)' }}>
          {snapshot.assessedPeople}/{snapshot.totalPeople}
        </div>
      </div>
      <div className="th-stat-card">
        <div className="th-stat-label">Areas tracked</div>
        <div className="th-stat-val" style={{ color: 'var(--text-1)' }}>{snapshot.areas.length}</div>
      </div>
      <div className="th-stat-card">
        <div className="th-stat-label">Avg % below expected</div>
        <div className="th-stat-val" style={{ color: avgPctBelow >= 50 ? '#f87171' : avgPctBelow >= 30 ? '#fbbf24' : '#4ade80' }}>
          {Math.round(avgPctBelow)}%
        </div>
      </div>
      {topGap && (
        <div className="th-stat-card th-stat-card--wide">
          <div className="th-stat-label">Top gap area</div>
          <div className="th-stat-top-name">
            {topGap.areaName} <span className="th-stat-top-pct">({Math.round(topGap.pctBelowExpected)}% below)</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamHealthPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<TeamCompetencySnapshot | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [narrative, setNarrative] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [narrativeShown, setNarrativeShown] = useState(false)

  const aiConfig = useAIConfig()

  useEffect(() => {
    getTeams().then(ts => setTeams(ts.filter(t => t.status === 'active'))).catch(() => {})
  }, [])

  const loadSnapshot = useCallback(async (teamId: string | null) => {
    setLoadingData(true)
    setError(null)
    setNarrative([])
    setNarrativeShown(false)
    try {
      const people = await getPeople()
      const activePeople = people.filter(p => p.status === 'active')

      let filteredPeople = activePeople
      if (teamId !== null) {
        const team = teams.find(tm => tm.id === teamId)
        filteredPeople = team
          ? activePeople.filter(p => p.teams.includes(team.name))
          : activePeople
      }

      const snap = await getTeamCompetencySnapshot(
        filteredPeople.map(p => p.id),
        teamId
      )
      setSnapshot(snap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoadingData(false)
    }
  }, [teams])

  useEffect(() => {
    if (teams.length >= 0) {
      loadSnapshot(selectedTeamId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, teams])

  const handleTeamChange = (id: string | null) => setSelectedTeamId(id)

  const handleGenerateSummary = async () => {
    if (!snapshot) return
    setGenerating(true)
    try {
      const selectedTeam = teams.find(t => t.id === selectedTeamId)
      const teamName = selectedTeam?.name ?? 'All Teams'
      const userPrompt = buildTeamCompetencySummaryPromptFromSnapshot({ teamName, snapshot })
      const result = await callAI({
        systemPrompt: TEAM_COMPETENCY_SUMMARY_SYSTEM,
        userPrompt,
        maxTokens: 500,
        temperature: 0.3,
      })
      const bullets = result.content
        .split('\n')
        .map(l => l.replace(/^[\s-*•]+/, '').trim())
        .filter(l => l.length > 0)
      setNarrative(bullets)
      setNarrativeShown(true)
    } catch (err) {
      handleAIError(err)
    } finally {
      setGenerating(false)
    }
  }

  const selectedTeamName = teams.find(t => t.id === selectedTeamId)?.name ?? 'All Teams'

  return (
    <>
      <div className="page-topbar">
        <span className="page-topbar-title">Team Competency Health</span>
      </div>

      <div className="page-content">
        {/* Subtitle */}
        <div className="th-subtitle">
          <p className="th-subtitle-text">
            Aggregate view of which competency areas have the most room for growth across your team.
          </p>
        </div>

        {/* Team filter */}
        {teams.length > 0 && (
          <div className="th-filter-wrap">
            <TeamFilter teams={teams} selectedTeamId={selectedTeamId} onChange={handleTeamChange} />
          </div>
        )}

        {/* Error */}
        {error && <div className="th-error">{error}</div>}

        {/* Loading */}
        {loadingData && <div className="th-loading">Loading competency data…</div>}

        {/* Content */}
        {!loadingData && snapshot && (
          <>
            {snapshot.assessedPeople > 0 && <StatsStrip snapshot={snapshot} />}

            {snapshot.areas.length === 0 && (
              <EmptyState assessedPeople={snapshot.assessedPeople} totalPeople={snapshot.totalPeople} />
            )}

            {snapshot.areas.length > 0 && (
              <div className="th-chart-card">
                <div className="th-chart-header">
                  <div>
                    <h2 style={{ margin: 0 }}>Areas ranked by gap severity</h2>
                    <p className="th-chart-sub">
                      {selectedTeamName} · {snapshot.assessedPeople} of {snapshot.totalPeople} people assessed
                    </p>
                  </div>
                </div>

                <ChartLegend />

                <div>
                  {snapshot.areas.map(area => {
                    const total = area.totalAssessed
                    const pctAt = total > 0 ? (area.atExpected / total) * 100 : 0
                    const pctAbove = total > 0 ? (area.aboveExpected / total) * 100 : 0
                    return (
                      <GapBar
                        key={area.areaName}
                        areaName={area.areaName}
                        pctBelowExpected={area.pctBelowExpected}
                        pctAtExpected={pctAt}
                        pctAboveExpected={pctAbove}
                        totalAssessed={area.totalAssessed}
                        belowExpected={area.belowExpected}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {snapshot.areas.length > 0 && (
              <div className="th-ai-card">
                <div className="th-ai-header" style={{ marginBottom: narrativeShown ? '14px' : 0 }}>
                  <div>
                    <h2 style={{ margin: 0 }}>AI Summary</h2>
                    <p className="th-ai-sub">Strategic narrative — skip-level ready</p>
                  </div>
                  <div className="th-ai-header-actions">
                    {narrativeShown && (
                      <AIGeneratedBadge onDismiss={() => { setNarrative([]); setNarrativeShown(false) }} />
                    )}
                    <AIButton
                      configured={aiConfig.configured}
                      loading={aiConfig.loading}
                      generating={generating}
                      onClick={handleGenerateSummary}
                      label={narrativeShown ? 'Regenerate' : 'Generate summary'}
                      tooltip={aiConfig.tooltip}
                      showSetupLink={true}
                    />
                  </div>
                </div>

                {narrativeShown && narrative.length > 0 && <AINarrative bullets={narrative} />}

                {narrativeShown && narrative.length === 0 && (
                  <p className="th-ai-empty">No summary generated. Try again.</p>
                )}

                {!narrativeShown && !generating && (
                  <p className="th-ai-hint">
                    Generate an AI narrative identifying top gaps, patterns, and suggested focus areas.
                    No individual names are included.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
