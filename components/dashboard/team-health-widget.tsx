"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, ExternalLink } from "lucide-react"
import Link from "next/link"
import { computeTeamHealthScore, type TeamHealthScore } from "@/lib/signals/types"
import {
  loadSignalData,
  computeTaskSignals,
  computePeopleSignals,
  computeFollowUpSignals,
  computeActionItemSignals,
  computeSentimentDriftSignals,
  computeGoalSignals,
  sortSignals,
  buildDismissedSet,
} from "@/lib/signals/compute"
import type { Signal } from "@/lib/signals/types"
import { callAI, handleAIError } from "@/lib/services/ai"
import { TEAM_HEALTH_NARRATIVE_SYSTEM, buildTeamHealthNarrativePrompt } from "@/lib/ai/prompts"
import { AIGeneratedBadge } from "@/components/ui/ai-button"
import { useAIConfig } from "@/lib/hooks/use-ai-config"

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchAllSignals(): Promise<Signal[]> {
  const today = new Date()
  const dismissed = buildDismissedSet([])
  const data = await loadSignalData()

  const evidenceByPerson = new Map<string, Array<{ occurred_at: string; sentiment: string | null }>>()
  for (const e of data.evidenceRecent as Array<{ person_id: string; occurred_at: string; sentiment: string | null }>) {
    if (!evidenceByPerson.has(e.person_id)) evidenceByPerson.set(e.person_id, [])
    evidenceByPerson.get(e.person_id)!.push({ occurred_at: e.occurred_at, sentiment: e.sentiment })
  }

  const [taskSignals, peopleSignals, actionSignals] = await Promise.all([
    Promise.resolve(computeTaskSignals(data, dismissed, today)),
    Promise.resolve(computePeopleSignals(data, dismissed, today)),
    computeActionItemSignals(data.recentMeetings, dismissed, today),
  ])

  const followUpSignals = computeFollowUpSignals(data.openFollowUps, dismissed, today)
  const sentimentDriftSignals = computeSentimentDriftSignals(data.activePeople, evidenceByPerson, dismissed, today)
  const goalSignals = computeGoalSignals(data.careerGoals, dismissed, today)

  return sortSignals([...taskSignals, ...peopleSignals, ...actionSignals, ...followUpSignals, ...sentimentDriftSignals, ...goalSignals])
}

const LABEL_COLORS: Record<TeamHealthScore['label'], { color: string; bg: string; border: string }> = {
  'Healthy':        { color: '#4ade80', bg: '#0d2015', border: '#166534' },
  'Needs attention':{ color: '#fbbf24', bg: '#2a2508', border: '#854d0e' },
  'At risk':        { color: '#f87171', bg: '#2a0a0a', border: '#991b1b' },
}

const BREAKDOWN_LABELS: Record<string, string> = {
  tasks:     'Tasks',
  people:    'People',
  followUps: 'Follow-ups',
  goals:     'Goals',
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export function TeamHealthWidget() {
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState<TeamHealthScore | null>(null)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [signals, setSignals] = useState<Signal[]>([])
  const aiConfig = useAIConfig()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const allSignals = await fetchAllSignals()
      setSignals(allSignals)
      setHealth(computeTeamHealthScore(allSignals))
    } catch (err) {
      console.error('[team-health-widget] load failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const generateNarrative = useCallback(async (healthScore: TeamHealthScore, allSignals: Signal[]) => {
    if (!aiConfig.configured) return
    setNarrativeLoading(true)
    try {
      const topSignals = allSignals
        .filter(s => s.severity === 'critical' || s.severity === 'warning')
        .slice(0, 5)
        .map(s => ({ type: s.type, severity: s.severity, message: s.message }))

      const res = await callAI({
        systemPrompt: TEAM_HEALTH_NARRATIVE_SYSTEM,
        userPrompt: buildTeamHealthNarrativePrompt({
          score: healthScore.score,
          label: healthScore.label,
          breakdown: healthScore.breakdown,
          topSignals,
        }),
        maxTokens: 200,
        temperature: 0.3,
        preferFast: true,
      })
      setNarrative(res.content.trim())
    } catch (err) {
      handleAIError(err)
    } finally {
      setNarrativeLoading(false)
    }
  }, [aiConfig.configured])

  // Load signals on mount
  useEffect(() => {
    load()
  }, [load])

  // Auto-generate narrative when signals + AI config are ready
  useEffect(() => {
    if (health && aiConfig.configured && !narrative && !narrativeLoading) {
      generateNarrative(health, signals)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [health, aiConfig.configured])

  const handleRefresh = async () => {
    setNarrative(null)
    await load()
  }

  // After refresh, regenerate narrative
  useEffect(() => {
    if (health && aiConfig.configured && narrative === null && !loading && !narrativeLoading && signals.length >= 0) {
      generateNarrative(health, signals)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [health])

  const labelStyle = health ? LABEL_COLORS[health.label] : LABEL_COLORS['Healthy']

  return (
    <div
      className="bg-[#1c1c1c] border border-[#383838] rounded-xl p-5"
      style={{ display: "flex", flexDirection: "column", gap: "14px" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2>Team Health</h2>
          <p style={{ marginTop: "2px" }}>Aggregate signal score</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          title="Refresh"
          style={{
            background: "none", border: "none", cursor: loading ? "not-allowed" : "pointer",
            color: "var(--text-3)", padding: "4px",
          }}
        >
          <RefreshCw
            size={14}
            style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
          />
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ height: "40px", borderRadius: "6px", background: "var(--surf-2)", animation: "pulse 1.5s ease-in-out infinite" }} />
          <div style={{ height: "16px", borderRadius: "4px", background: "var(--surf-2)", width: "60%", animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
      ) : health ? (
        <>
          {/* Score ring + label */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Score ring */}
            <div style={{ position: "relative", width: "64px", height: "64px", flexShrink: 0 }}>
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle
                  cx="32" cy="32" r="26"
                  fill="none"
                  stroke="var(--surf-3)"
                  strokeWidth="7"
                />
                <circle
                  cx="32" cy="32" r="26"
                  fill="none"
                  stroke={labelStyle.color}
                  strokeWidth="7"
                  strokeDasharray={`${(health.score / 100) * 163.4} 163.4`}
                  strokeLinecap="round"
                  transform="rotate(-90 32 32)"
                />
              </svg>
              <span style={{
                position: "absolute",
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: "16px",
                fontWeight: 700,
                color: labelStyle.color,
              }}>
                {health.score}
              </span>
            </div>

            {/* Label + breakdown */}
            <div style={{ flex: 1 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 10px",
                  borderRadius: "20px",
                  fontSize: "var(--text-label)",
                  fontWeight: 600,
                  color: labelStyle.color,
                  background: labelStyle.bg,
                  border: `1px solid ${labelStyle.border}`,
                  marginBottom: "8px",
                }}
              >
                {health.label}
              </span>

              {/* Category breakdown badges */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {(Object.entries(health.breakdown) as [string, number][]).map(([key, count]) => (
                  <span
                    key={key}
                    style={{
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "var(--text-caption)",
                      background: count > 0 ? "var(--surf-3)" : "var(--surf-2)",
                      color: count > 0 ? "var(--text-1)" : "var(--text-3)",
                      border: "1px solid var(--border-2)",
                    }}
                  >
                    {BREAKDOWN_LABELS[key]}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* AI Narrative */}
          {aiConfig.configured && (
            <div style={{
              borderRadius: "6px",
              padding: "10px 12px",
              background: "var(--surf-2)",
              border: "1px solid var(--border-2)",
            }}>
              {narrativeLoading ? (
                <p style={{ fontSize: "var(--text-body)", color: "var(--text-3)", fontStyle: "italic", margin: 0 }}>
                  Generating summary…
                </p>
              ) : narrative ? (
                <>
                  <AIGeneratedBadge />
                  <p style={{ fontSize: "var(--text-body)", color: "var(--text-2)", lineHeight: 1.5, margin: 0, marginTop: "4px" }}>
                    {narrative}
                  </p>
                </>
              ) : null}
            </div>
          )}

          {/* View details link */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Link
              href="/radar"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "var(--text-caption)",
                color: "var(--text-3)",
                textDecoration: "none",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-2)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-3)")}
            >
              View details <ExternalLink size={10} />
            </Link>
          </div>
        </>
      ) : (
        <p style={{ color: "var(--text-3)", fontSize: "var(--text-body)" }}>Could not load team health.</p>
      )}
    </div>
  )
}
