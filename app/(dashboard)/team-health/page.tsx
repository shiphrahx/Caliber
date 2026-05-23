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
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <span style={{
          fontSize: 'var(--text-label)',
          color: 'var(--text-2)',
          width: '200px',
          flexShrink: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {areaName}
        </span>

        {/* Stacked bar */}
        <div style={{
          flex: 1,
          height: '14px',
          borderRadius: '3px',
          overflow: 'hidden',
          background: 'var(--surf-3)',
          display: 'flex',
        }}>
          {pctBelow > 0 && (
            <div style={{ width: `${pctBelow}%`, background: barColors.below, transition: 'width 0.3s' }} title={`${pctBelow}% below expected`} />
          )}
          {pctAt > 0 && (
            <div style={{ width: `${pctAt}%`, background: barColors.at, transition: 'width 0.3s' }} title={`${pctAt}% at expected`} />
          )}
          {pctAbove > 0 && (
            <div style={{ width: `${pctAbove}%`, background: barColors.above, transition: 'width 0.3s' }} title={`${pctAbove}% above expected`} />
          )}
        </div>

        {/* Labels */}
        <div style={{ display: 'flex', gap: '8px', width: '200px', flexShrink: 0, justifyContent: 'flex-end' }}>
          {pctBelow > 0 && (
            <span style={{ fontSize: 'var(--text-caption)', color: barColors.below, fontVariantNumeric: 'tabular-nums' }}>
              {pctBelow}% below ({belowExpected}/{totalAssessed})
            </span>
          )}
          {pctBelow === 0 && (
            <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
              ✓ {totalAssessed} assessed
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function ChartLegend() {
  return (
    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
      {[
        { color: '#f87171', label: 'Below expected (≥60%)' },
        { color: '#fbbf24', label: 'Below expected (35–59%)' },
        { color: '#6b7280', label: 'Below expected (<35%)' },
        { color: '#4ade80', label: 'At expected' },
        { color: '#34d399', label: 'Above expected' },
      ].map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: color, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── AI narrative ─────────────────────────────────────────────────────────────

function AINarrative({ bullets }: { bullets: string[] }) {
  return (
    <ul style={{ margin: 0, padding: '0 0 0 18px' }}>
      {bullets.map((b, i) => (
        <li key={i} style={{ fontSize: 'var(--text-label)', color: 'var(--text-2)', marginBottom: '6px', lineHeight: 1.5 }}>
          {b}
        </li>
      ))}
    </ul>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ assessedPeople, totalPeople }: { assessedPeople: number; totalPeople: number }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-3)' }}>
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
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      <button
        onClick={() => onChange(null)}
        style={{
          background: selectedTeamId === null ? 'var(--surf-3)' : 'var(--surf-2)',
          border: `1px solid ${selectedTeamId === null ? 'var(--border-3)' : 'var(--border-1)'}`,
          borderRadius: '4px',
          color: selectedTeamId === null ? 'var(--text-1)' : 'var(--text-3)',
          fontSize: 'var(--text-meta)',
          padding: '4px 10px',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        All teams
      </button>
      {teams.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            background: selectedTeamId === t.id ? 'var(--surf-3)' : 'var(--surf-2)',
            border: `1px solid ${selectedTeamId === t.id ? 'var(--border-3)' : 'var(--border-1)'}`,
            borderRadius: '4px',
            color: selectedTeamId === t.id ? 'var(--text-1)' : 'var(--text-3)',
            fontSize: 'var(--text-meta)',
            padding: '4px 10px',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
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
    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
      <div style={{ background: 'var(--surf)', border: '1px solid var(--border-1)', borderRadius: '6px', padding: '10px 16px', minWidth: '120px' }}>
        <div style={{ fontSize: 'var(--text-overline)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Assessed</div>
        <div style={{ fontSize: 'var(--text-section)', fontWeight: 700, color: 'var(--text-1)' }}>
          {snapshot.assessedPeople}/{snapshot.totalPeople}
        </div>
      </div>
      <div style={{ background: 'var(--surf)', border: '1px solid var(--border-1)', borderRadius: '6px', padding: '10px 16px', minWidth: '120px' }}>
        <div style={{ fontSize: 'var(--text-overline)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Areas tracked</div>
        <div style={{ fontSize: 'var(--text-section)', fontWeight: 700, color: 'var(--text-1)' }}>{snapshot.areas.length}</div>
      </div>
      <div style={{ background: 'var(--surf)', border: '1px solid var(--border-1)', borderRadius: '6px', padding: '10px 16px', minWidth: '160px' }}>
        <div style={{ fontSize: 'var(--text-overline)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Avg % below expected</div>
        <div style={{ fontSize: 'var(--text-section)', fontWeight: 700, color: avgPctBelow >= 50 ? '#f87171' : avgPctBelow >= 30 ? '#fbbf24' : '#4ade80' }}>
          {Math.round(avgPctBelow)}%
        </div>
      </div>
      {topGap && (
        <div style={{ background: 'var(--surf)', border: '1px solid var(--border-1)', borderRadius: '6px', padding: '10px 16px', flex: 1, minWidth: '200px' }}>
          <div style={{ fontSize: 'var(--text-overline)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Top gap area</div>
          <div style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: '#f87171' }}>
            {topGap.areaName} <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 'var(--text-meta)' }}>({Math.round(topGap.pctBelowExpected)}% below)</span>
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

  // Load teams once
  useEffect(() => {
    getTeams().then(ts => setTeams(ts.filter(t => t.status === 'active'))).catch(() => {})
  }, [])

  // Reload snapshot when filter changes
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

  // Trigger load when teamId or teams list changes
  useEffect(() => {
    if (teams.length >= 0) {  // always run, even with 0 teams
      loadSnapshot(selectedTeamId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, teams])

  const handleTeamChange = (id: string | null) => {
    setSelectedTeamId(id)
  }

  const handleGenerateSummary = async () => {
    if (!snapshot) return
    setGenerating(true)
    try {
      const selectedTeam = teams.find(t => t.id === selectedTeamId)
      const teamName = selectedTeam?.name ?? 'All Teams'

      const userPrompt = buildTeamCompetencySummaryPromptFromSnapshot({
        teamName,
        snapshot,
      })

      const result = await callAI({
        systemPrompt: TEAM_COMPETENCY_SUMMARY_SYSTEM,
        userPrompt,
        maxTokens: 500,
        temperature: 0.3,
      })

      // Parse bullets from markdown list
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
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-label)' }}>
            Aggregate view of which competency areas have the most room for growth across your team.
          </p>
        </div>

        {/* Team filter */}
        {teams.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <TeamFilter
              teams={teams}
              selectedTeamId={selectedTeamId}
              onChange={handleTeamChange}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#2a0a0a', border: '1px solid #5a2020', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px', color: '#f87171', fontSize: 'var(--text-label)' }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loadingData && (
          <div style={{ padding: '32px', color: 'var(--text-3)', fontSize: 'var(--text-meta)' }}>
            Loading competency data…
          </div>
        )}

        {/* Content */}
        {!loadingData && snapshot && (
          <>
            {/* Stats strip */}
            {snapshot.assessedPeople > 0 && (
              <StatsStrip snapshot={snapshot} />
            )}

            {/* Empty state */}
            {snapshot.areas.length === 0 && (
              <EmptyState assessedPeople={snapshot.assessedPeople} totalPeople={snapshot.totalPeople} />
            )}

            {/* Chart section */}
            {snapshot.areas.length > 0 && (
              <div style={{ background: 'var(--surf)', border: '1px solid var(--border-1)', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ margin: 0 }}>Areas ranked by gap severity</h2>
                    <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)', marginTop: '2px' }}>
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

            {/* AI narrative section */}
            {snapshot.areas.length > 0 && (
              <div style={{ background: 'var(--surf)', border: '1px solid var(--border-1)', borderRadius: '8px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: narrativeShown ? '14px' : '0' }}>
                  <div>
                    <h2 style={{ margin: 0 }}>AI Summary</h2>
                    <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)', marginTop: '2px' }}>
                      Strategic narrative — skip-level ready
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

                {narrativeShown && narrative.length > 0 && (
                  <AINarrative bullets={narrative} />
                )}

                {narrativeShown && narrative.length === 0 && (
                  <p style={{ fontSize: 'var(--text-label)', color: 'var(--text-3)', marginTop: '8px' }}>
                    No summary generated. Try again.
                  </p>
                )}

                {!narrativeShown && !generating && (
                  <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)', marginTop: '8px' }}>
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
