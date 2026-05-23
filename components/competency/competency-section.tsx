"use client"

import { useState, useEffect } from "react"
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts"
import { ChevronDown, ChevronRight, Plus, Check, Link2, Trash2, ExternalLink } from "lucide-react"
import { MarkdownTextarea } from "@/components/ui/markdown-textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getActiveFramework, getAreasForFramework, getLevelsForArea,
  getLatestAssessmentsForPerson, getAssessmentHistoryForPersonArea,
  upsertAssessment, updateAssessmentEvidenceIds,
  getGrowthPlansForPerson, createGrowthPlan, updateGrowthPlan, deleteGrowthPlan,
  computePromotionReadiness, levelToScore,
  LEVELS,
  type CompetencyFramework, type CompetencyArea, type CompetencyLevel,
  type CompetencyAssessment, type GrowthPlan, type PromotionReadiness,
} from "@/lib/services/competency"
import { getEvidenceForPerson, type EvidenceEntry } from "@/lib/services/evidence"
import { AIButton } from "@/components/ui/ai-button"
import { useAIConfig } from "@/lib/hooks/use-ai-config"
import { callAI, handleAIError } from "@/lib/services/ai"
import { GROWTH_PLAN_SYSTEM, buildGrowthPlanPrompt, PROMOTION_PACKET_SYSTEM, buildPromotionPacketPrompt, ASSESSMENT_REASONING_SYSTEM } from "@/lib/ai/prompts"

const LEVEL_COLORS: Record<string, { bg: string; color: string }> = {
  Junior:    { bg: "#0d1420", color: "#818cf8" },
  Mid:       { bg: "#0a1a2e", color: "#5b9bd5" },
  Senior:    { bg: "#0f1a0a", color: "#4ade80" },
  Staff:     { bg: "#1a1200", color: "#c9a227" },
  Principal: { bg: "#1e0d00", color: "#e07030" },
}

// ─── Radar chart ──────────────────────────────────────────────────────────────

interface RadarData {
  area: string
  assessed: number
  expected: number
  fullMark: number
}

function CompetencyRadar({ data }: { data: RadarData[] }) {
  if (data.length === 0) return (
    <div style={{ height: "240px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--text-3)" }}>No assessments yet</p>
    </div>
  )
  return (
    <div style={{ height: "300px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="var(--border-2)" />
          <PolarAngleAxis dataKey="area" tick={{ fill: "var(--text-3)", fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
          <Radar
            name="Expected"
            dataKey="expected"
            stroke="#00f05860"
            fill="#00f05818"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
          <Radar
            name="Assessed"
            dataKey="assessed"
            stroke="#00ffe5"
            fill="#00ffe520"
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{ background: "var(--surf-2)", border: "1px solid var(--border-2)", borderRadius: "6px", fontSize: "13px" }}
            formatter={(value: number | undefined, name: string | undefined) => [value !== undefined ? LEVELS[value - 1] ?? value : value, name ?? ""]}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "4px" }}>
        <span style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ display: "inline-block", width: "12px", height: "2px", background: "#00ffe5", borderRadius: "2px" }} /> Assessed
        </span>
        <span style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ display: "inline-block", width: "12px", height: "2px", background: "#00f058", borderRadius: "2px", opacity: 0.5 }} /> Expected
        </span>
      </div>
    </div>
  )
}

// ─── Promotion readiness banner ───────────────────────────────────────────────

function PromotionBanner({ readiness }: { readiness: PromotionReadiness }) {
  if (!readiness.nextLevel) return null
  const colors = {
    strong:  { bg: "#0d2015", color: "#4ade80", border: "#4ade8040" },
    growing: { bg: "#1e1a00", color: "#facc15", border: "#facc1540" },
    early:   { bg: "#1a1a22", color: "#6b7280", border: "#6b728040" },
  }[readiness.signal]
  return (
    <div style={{
      padding: "12px 16px", borderRadius: "6px", marginBottom: "20px",
      background: colors.bg, border: `1px solid ${colors.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px",
    }}>
      <div>
        <span style={{ fontWeight: 600, color: colors.color, fontSize: "var(--text-body)" }}>
          {readiness.label}
        </span>
        <span style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", marginLeft: "10px" }}>
          {readiness.atNextLevel} of {readiness.total} areas at {readiness.nextLevel} level
        </span>
      </div>
      <span style={{ fontSize: "var(--text-caption)", color: "var(--text-3)" }}>
        Based on your framework and assessments
      </span>
    </div>
  )
}

// ─── Competency card ──────────────────────────────────────────────────────────

interface CompetencyCardProps {
  area: CompetencyArea
  levels: CompetencyLevel[]
  assessment: CompetencyAssessment | null
  history: CompetencyAssessment[]
  historyLoaded: boolean
  personLevel: string | null
  allEvidence: EvidenceEntry[]
  onAssess: (level: string, notes: string, evidenceIds: string[]) => Promise<void>
  onLoadHistory: () => void
  aiConfigured?: boolean
}

function CompetencyCard({
  area, levels, assessment, history, historyLoaded, personLevel,
  allEvidence, onAssess, onLoadHistory, aiConfigured = false,
}: CompetencyCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [notesLocal, setNotesLocal] = useState(assessment?.notes ?? "")
  const [showEvidencePicker, setShowEvidencePicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [generatingReasoning, setGeneratingReasoning] = useState(false)

  useEffect(() => { setNotesLocal(assessment?.notes ?? "") }, [assessment])

  const expectedLevel = personLevel && levels.find(l => l.level === personLevel)?.level
  const expectedScore = expectedLevel ? levelToScore(expectedLevel) : null
  const assessedScore = assessment ? assessment.score : null

  const gap: 'at' | 'above' | 'below' | null = assessedScore === null || expectedScore === null
    ? null
    : assessedScore >= expectedScore + 1 ? 'above'
    : assessedScore >= expectedScore ? 'at'
    : 'below'

  const gapBadge = gap === null ? null
    : gap === 'above' ? { label: 'Above level', bg: '#0c1a3d', color: '#60a5fa', border: '#60a5fa40' }
    : gap === 'at'    ? { label: 'At level',    bg: '#0d2015', color: '#4ade80', border: '#4ade8040' }
    :                   { label: 'Below expectations', bg: '#2a0a0a', color: '#f87171', border: '#f8717140' }

  const handleLevelClick = async (level: string) => {
    setSaving(true)
    try {
      const evidenceIds = assessment?.evidenceIds ?? []
      await onAssess(level, notesLocal, evidenceIds)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1800)
    } finally {
      setSaving(false)
    }
  }

  const handleNotesBlur = async () => {
    if (!assessment) return
    if (notesLocal === (assessment.notes ?? "")) return
    setSaving(true)
    try {
      await onAssess(assessment.assessedLevel, notesLocal, assessment.evidenceIds)
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateReasoning = async () => {
    if (!assessment) return
    setGeneratingReasoning(true)
    try {
      const linkedEvItems = allEvidence.filter(e => assessment.evidenceIds?.includes(e.id))
      const expLev = personLevel ? levels.find(l => l.level === personLevel) : null
      const evidenceSummary = linkedEvItems.map(e => `- ${e.title} (${e.occurredAt}): ${e.content ?? ''}`).join('\n') || 'No linked evidence.'
      const userPrompt = `Competency area: ${area.name}\nAssessed level: ${assessment.assessedLevel}\nExpected level: ${expLev?.level ?? personLevel ?? 'unknown'}\n\nEvidence:\n${evidenceSummary}`
      const result = await callAI({
        systemPrompt: ASSESSMENT_REASONING_SYSTEM,
        userPrompt,
        maxTokens: 300,
        temperature: 0.3,
      })
      setNotesLocal(result.content)
      await onAssess(assessment.assessedLevel, result.content, assessment.evidenceIds)
    } catch (err) {
      handleAIError(err)
    } finally {
      setGeneratingReasoning(false)
    }
  }

  const toggleEvidence = (evidenceId: string) => {
    if (!assessment) return
    const current = assessment.evidenceIds ?? []
    const updated = current.includes(evidenceId)
      ? current.filter(id => id !== evidenceId)
      : [...current, evidenceId]
    updateAssessmentEvidenceIds(assessment.id, updated)
      .then(() => onAssess(assessment.assessedLevel, notesLocal, updated))
      .catch(console.error)
  }

  const linkedEvidence = allEvidence.filter(e => assessment?.evidenceIds?.includes(e.id))

  return (
    <div style={{
      background: "var(--surf)",
      border: "1px solid var(--border-1)",
      borderRadius: "6px",
      marginBottom: "12px",
    }}>
      {/* Card header */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: "2px", flexShrink: 0 }}
        >
          {expanded
            ? <ChevronDown style={{ width: "13px", height: "13px" }} />
            : <ChevronRight style={{ width: "13px", height: "13px" }} />}
        </button>

        <span style={{ fontWeight: 600, color: "var(--text-1)", flex: 1, fontSize: "var(--text-body)" }}>
          {area.name}
        </span>

        {/* Level buttons */}
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {LEVELS.map(level => {
            const isActive = assessment?.assessedLevel === level
            const { bg, color } = LEVEL_COLORS[level] ?? { bg: "#222", color: "#888" }
            return (
              <button
                key={level}
                onClick={() => handleLevelClick(level)}
                disabled={saving}
                style={{
                  padding: "2px 8px", borderRadius: "4px", fontSize: "var(--text-caption)", fontWeight: 500,
                  fontFamily: "var(--font-sans)", cursor: "pointer",
                  background: isActive ? bg : "var(--surf-2)",
                  color: isActive ? color : "var(--text-3)",
                  border: `1px solid ${isActive ? color + "40" : "var(--border-2)"}`,
                  opacity: saving ? 0.5 : 1,
                  transition: "all 0.15s",
                }}
              >
                {level}
              </button>
            )
          })}
        </div>

        {/* Gap badge */}
        {gapBadge && (
          <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "var(--text-caption)", fontWeight: 500, background: gapBadge.bg, color: gapBadge.color, border: `1px solid ${gapBadge.border}` }}>
            {gapBadge.label}
          </span>
        )}

        {/* Saved flash */}
        {savedFlash && (
          <span style={{ fontSize: "var(--text-caption)", color: "#4ade80", display: "flex", alignItems: "center", gap: "4px" }}>
            <Check style={{ width: "11px", height: "11px" }} /> Saved
          </span>
        )}
      </div>

      {/* Expected level for this person */}
      {personLevel && (
        <div style={{ paddingLeft: "40px", paddingBottom: "8px", paddingRight: "16px" }}>
          {expectedLevel ? (
            <span style={{ fontSize: "var(--text-caption)", color: "var(--text-3)" }}>
              Expected at {personLevel}: <span style={{ color: LEVEL_COLORS[expectedLevel]?.color ?? "var(--text-2)" }}>{expectedLevel}</span>
            </span>
          ) : (
            <span style={{ fontSize: "var(--text-caption)", color: "var(--text-3)" }}>
              No expectation defined for {personLevel}
            </span>
          )}
        </div>
      )}

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: "12px 16px 16px 40px", borderTop: "1px solid var(--border-1)" }}>
          {/* Notes */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <Label>Assessment notes</Label>
              {aiConfigured && assessment && (
                <button
                  onClick={handleGenerateReasoning}
                  disabled={generatingReasoning}
                  style={{ fontSize: "var(--text-caption)", color: generatingReasoning ? "var(--text-3)" : "#00f058", background: "none", border: "none", cursor: generatingReasoning ? "not-allowed" : "pointer", padding: 0, fontFamily: "var(--font-sans)" }}
                >
                  {generatingReasoning ? "Generating…" : "✦ Generate reasoning"}
                </button>
              )}
            </div>
            <div onBlur={handleNotesBlur}>
              <MarkdownTextarea
                value={notesLocal}
                onValueChange={setNotesLocal}
                placeholder="Reasoning, observations, examples…"
                rows={3}
              />
            </div>
          </div>

          {/* Linked evidence */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <Label>Linked evidence</Label>
              <button
                onClick={() => setShowEvidencePicker(p => !p)}
                style={{
                  display: "flex", alignItems: "center", gap: "4px", background: "none",
                  border: "1px solid var(--border-2)", borderRadius: "4px",
                  color: "var(--text-3)", fontSize: "var(--text-caption)", padding: "3px 8px",
                  cursor: "pointer", fontFamily: "var(--font-sans)",
                }}
              >
                <Link2 style={{ width: "11px", height: "11px" }} /> Link evidence
              </button>
            </div>

            {linkedEvidence.length > 0 ? (
              <div style={{ display: "grid", gap: "4px" }}>
                {linkedEvidence.map(e => (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", background: "var(--surf-2)", borderRadius: "4px" }}>
                    <span style={{ flex: 1, fontSize: "var(--text-caption)", color: "var(--text-2)" }}>{e.title}</span>
                    <span style={{ fontSize: "var(--text-overline)", color: "var(--text-3)" }}>{e.occurredAt}</span>
                    <button
                      onClick={() => toggleEvidence(e.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: "2px" }}
                    >
                      <Trash2 style={{ width: "11px", height: "11px" }} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "var(--text-caption)", color: "var(--text-3)" }}>No evidence linked.</p>
            )}

            {/* Evidence picker */}
            {showEvidencePicker && (
              <div style={{ marginTop: "8px", background: "var(--surf-2)", border: "1px solid var(--border-2)", borderRadius: "6px", maxHeight: "180px", overflowY: "auto" }}>
                {allEvidence.length === 0 ? (
                  <p style={{ padding: "12px 16px", fontSize: "var(--text-caption)", color: "var(--text-3)" }}>No evidence entries yet.</p>
                ) : (
                  allEvidence.map(e => {
                    const linked = assessment?.evidenceIds?.includes(e.id)
                    return (
                      <div
                        key={e.id}
                        onClick={() => toggleEvidence(e.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px",
                          cursor: "pointer", borderLeft: `2px solid ${linked ? "#00f058" : "transparent"}`,
                        }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--surf-3)")}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
                      >
                        <span style={{ flex: 1, fontSize: "var(--text-caption)", color: "var(--text-2)" }}>{e.title}</span>
                        <span style={{ fontSize: "var(--text-overline)", color: "var(--text-3)" }}>{e.occurredAt}</span>
                        {linked && <Check style={{ width: "11px", height: "11px", color: "#4ade80", flexShrink: 0 }} />}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Assessment history */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Label>Assessment history</Label>
              {!historyLoaded && (
                <button
                  onClick={onLoadHistory}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-caption)", color: "#00f058", fontFamily: "var(--font-sans)", padding: 0 }}
                >
                  Load history
                </button>
              )}
            </div>
            {historyLoaded && history.length === 0 && (
              <p style={{ fontSize: "var(--text-caption)", color: "var(--text-3)" }}>No history yet.</p>
            )}
            {historyLoaded && history.length > 0 && (
              <div style={{ display: "grid", gap: "4px" }}>
                {history.map(h => (
                  <div key={h.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 8px", background: "var(--surf-2)", borderRadius: "4px" }}>
                    <span style={{ fontSize: "var(--text-overline)", color: "var(--text-3)", flexShrink: 0 }}>{h.assessedAt}</span>
                    <span style={{ fontSize: "var(--text-caption)", color: LEVEL_COLORS[h.assessedLevel]?.color ?? "var(--text-2)", fontWeight: 500 }}>
                      {h.assessedLevel}
                    </span>
                    {h.notes && (
                      <span style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {h.notes.slice(0, 60)}{h.notes.length > 60 ? "…" : ""}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Growth plan card ─────────────────────────────────────────────────────────

interface GrowthPlanCardProps {
  plan: GrowthPlan
  areas: CompetencyArea[]
  onUpdate: (id: string, updates: Parameters<typeof updateGrowthPlan>[1]) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function GrowthPlanCard({ plan, areas, onUpdate, onDelete }: GrowthPlanCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [descLocal, setDescLocal] = useState(plan.description ?? "")
  const [progressLocal, setProgressLocal] = useState(plan.progressNotes ?? "")

  useEffect(() => { setDescLocal(plan.description ?? "") }, [plan.description])
  useEffect(() => { setProgressLocal(plan.progressNotes ?? "") }, [plan.progressNotes])

  const statusColors = {
    active:    { bg: "#0c1a3d", color: "#60a5fa" },
    completed: { bg: "#0d2015", color: "#4ade80" },
    paused:    { bg: "#1a1200", color: "#c9a227" },
    cancelled: { bg: "#1a1a22", color: "#6b7280" },
  }[plan.status] ?? { bg: "#1a1a22", color: "#6b7280" }

  const save = async (updates: Parameters<typeof updateGrowthPlan>[1]) => {
    setSaving(true)
    try { await onUpdate(plan.id, updates) } finally { setSaving(false) }
  }

  return (
    <div style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "6px", marginBottom: "8px" }}>
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: "2px", flexShrink: 0 }}
        >
          {expanded ? <ChevronDown style={{ width: "13px", height: "13px" }} /> : <ChevronRight style={{ width: "13px", height: "13px" }} />}
        </button>
        <span style={{ flex: 1, fontWeight: 600, color: "var(--text-1)", fontSize: "var(--text-body)" }}>{plan.title}</span>
        {plan.areaName && (
          <span style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", background: "var(--surf-2)", padding: "1px 6px", borderRadius: "4px" }}>
            {plan.areaName}
          </span>
        )}
        {plan.targetLevel && (
          <span style={{ fontSize: "var(--text-caption)", color: LEVEL_COLORS[plan.targetLevel]?.color ?? "var(--text-2)", fontWeight: 500 }}>
            → {plan.targetLevel}
          </span>
        )}
        <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "var(--text-caption)", fontWeight: 500, background: statusColors.bg, color: statusColors.color }}>
          {plan.status}
        </span>
        {plan.status === 'active' && (
          <button
            onClick={() => save({ status: 'completed' })}
            style={{ background: "none", border: "1px solid var(--border-2)", borderRadius: "4px", color: "var(--text-3)", fontSize: "var(--text-caption)", padding: "3px 8px", cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            Complete
          </button>
        )}
        <button
          onClick={() => onDelete(plan.id)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: "4px" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#f87171")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-3)")}
        >
          <Trash2 style={{ width: "12px", height: "12px" }} />
        </button>
      </div>

      {expanded && (
        <div style={{ padding: "12px 14px 16px 40px", borderTop: "1px solid var(--border-1)", display: "grid", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <Label style={{ display: "block", marginBottom: "4px" }}>Target area</Label>
              <select
                value={plan.areaId ?? ""}
                onChange={e => save({ areaId: e.target.value || null })}
                disabled={saving}
                style={{ width: "100%", background: "var(--surf-2)", border: "1px solid var(--border-2)", borderRadius: "4px", color: "var(--text-2)", padding: "6px 8px", fontSize: "var(--text-label)", fontFamily: "var(--font-sans)" }}
              >
                <option value="">No area</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <Label style={{ display: "block", marginBottom: "4px" }}>Target level</Label>
              <select
                value={plan.targetLevel ?? ""}
                onChange={e => save({ targetLevel: e.target.value || null })}
                disabled={saving}
                style={{ width: "100%", background: "var(--surf-2)", border: "1px solid var(--border-2)", borderRadius: "4px", color: "var(--text-2)", padding: "6px 8px", fontSize: "var(--text-label)", fontFamily: "var(--font-sans)" }}
              >
                <option value="">No target</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <Label style={{ display: "block", marginBottom: "4px" }}>Status</Label>
              <select
                value={plan.status}
                onChange={e => save({ status: e.target.value as GrowthPlan['status'] })}
                disabled={saving}
                style={{ width: "100%", background: "var(--surf-2)", border: "1px solid var(--border-2)", borderRadius: "4px", color: "var(--text-2)", padding: "6px 8px", fontSize: "var(--text-label)", fontFamily: "var(--font-sans)" }}
              >
                {['active', 'paused', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label style={{ display: "block", marginBottom: "4px" }}>Target date</Label>
              <input
                type="date"
                value={plan.targetDate ?? ""}
                onChange={e => save({ targetDate: e.target.value || null })}
                disabled={saving}
                style={{ width: "100%", background: "var(--surf-2)", border: "1px solid var(--border-2)", borderRadius: "4px", color: "var(--text-2)", padding: "6px 8px", fontSize: "var(--text-label)", fontFamily: "var(--font-sans)" }}
              />
            </div>
          </div>

          <div>
            <Label style={{ display: "block", marginBottom: "4px" }}>Description</Label>
            <div onBlur={() => save({ description: descLocal })}>
              <MarkdownTextarea
                value={descLocal}
                onValueChange={setDescLocal}
                placeholder="What is this plan working toward?"
                rows={2}
              />
            </div>
          </div>

          <div>
            <Label style={{ display: "block", marginBottom: "4px" }}>Progress notes</Label>
            <div onBlur={() => save({ progressNotes: progressLocal })}>
              <MarkdownTextarea
                value={progressLocal}
                onValueChange={setProgressLocal}
                placeholder="Append updates over time…"
                rows={3}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Add growth plan form ─────────────────────────────────────────────────────

interface AddGrowthPlanFormProps {
  personId: string
  areas: CompetencyArea[]
  defaultAreaId?: string
  onSaved: (plan: GrowthPlan) => void
  onCancel: () => void
}

function AddGrowthPlanForm({ personId, areas, defaultAreaId, onSaved, onCancel }: AddGrowthPlanFormProps) {
  const [title, setTitle] = useState("")
  const [areaId, setAreaId] = useState(defaultAreaId ?? "")
  const [targetLevel, setTargetLevel] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const plan = await createGrowthPlan({ personId, title: title.trim(), areaId: areaId || undefined, targetLevel: targetLevel || undefined, targetDate: targetDate || undefined })
      onSaved(plan)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "6px", padding: "16px", marginBottom: "8px" }}>
      <div style={{ display: "grid", gap: "10px" }}>
        <div>
          <Label style={{ display: "block", marginBottom: "4px" }}>Title *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Improve system design skills" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          <div>
            <Label style={{ display: "block", marginBottom: "4px" }}>Target area</Label>
            <select value={areaId} onChange={e => setAreaId(e.target.value)} style={{ width: "100%", background: "var(--surf-2)", border: "1px solid var(--border-2)", borderRadius: "4px", color: "var(--text-2)", padding: "6px 8px", fontSize: "var(--text-label)", fontFamily: "var(--font-sans)" }}>
              <option value="">None</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <Label style={{ display: "block", marginBottom: "4px" }}>Target level</Label>
            <select value={targetLevel} onChange={e => setTargetLevel(e.target.value)} style={{ width: "100%", background: "var(--surf-2)", border: "1px solid var(--border-2)", borderRadius: "4px", color: "var(--text-2)", padding: "6px 8px", fontSize: "var(--text-label)", fontFamily: "var(--font-sans)" }}>
              <option value="">None</option>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <Label style={{ display: "block", marginBottom: "4px" }}>Target date</Label>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={{ width: "100%", background: "var(--surf-2)", border: "1px solid var(--border-2)", borderRadius: "4px", color: "var(--text-2)", padding: "6px 8px", fontSize: "var(--text-label)", fontFamily: "var(--font-sans)" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ background: "none", border: "1px solid var(--border-2)", borderRadius: "4px", color: "var(--text-2)", fontSize: "var(--text-label)", padding: "5px 12px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            style={{
              background: "linear-gradient(90deg, #00ffe5 0%, #00f058 100%)", border: "none", borderRadius: "4px",
              color: "#0a1a0a", fontSize: "var(--text-label)", fontWeight: 600, padding: "5px 14px",
              cursor: title.trim() && !saving ? "pointer" : "not-allowed",
              opacity: title.trim() && !saving ? 1 : 0.5,
              fontFamily: "var(--font-sans)",
            }}
          >
            {saving ? "Saving…" : "Save plan"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main CompetencySection ───────────────────────────────────────────────────

interface CompetencySectionProps {
  personId: string
  personLevel: string | null
  personName?: string
}

export function CompetencySection({ personId, personLevel, personName = "this engineer" }: CompetencySectionProps) {
  const [framework, setFramework] = useState<CompetencyFramework | null>(null)
  const [areas, setAreas] = useState<CompetencyArea[]>([])
  const [areaLevels, setAreaLevels] = useState<Record<string, CompetencyLevel[]>>({})
  const [assessments, setAssessments] = useState<CompetencyAssessment[]>([])
  const [historyByArea, setHistoryByArea] = useState<Record<string, CompetencyAssessment[]>>({})
  const [historyLoaded, setHistoryLoaded] = useState<Set<string>>(new Set())
  const [allEvidence, setAllEvidence] = useState<EvidenceEntry[]>([])
  const [growthPlans, setGrowthPlans] = useState<GrowthPlan[]>([])
  const [addingPlan, setAddingPlan] = useState(false)
  const [suggestingPlan, setSuggestingPlan] = useState(false)
  const [promotionPacket, setPromotionPacket] = useState<string | null>(null)
  const [generatingPacket, setGeneratingPacket] = useState(false)
  const [loading, setLoading] = useState(true)
  const aiConfig = useAIConfig()

  useEffect(() => {
    if (!personId) return
    ;(async () => {
      setLoading(true)
      try {
        const fw = await getActiveFramework()
        if (!fw) { setLoading(false); return }
        setFramework(fw)

        const [rawAreas, rawAssessments, evidence, plans] = await Promise.all([
          getAreasForFramework(fw.id),
          getLatestAssessmentsForPerson(personId),
          getEvidenceForPerson(personId),
          getGrowthPlansForPerson(personId),
        ])
        setAreas(rawAreas)
        setAssessments(rawAssessments)
        setAllEvidence(evidence)
        setGrowthPlans(plans)

        const levMap: Record<string, CompetencyLevel[]> = {}
        await Promise.all(rawAreas.map(async a => { levMap[a.id] = await getLevelsForArea(a.id) }))
        setAreaLevels(levMap)
      } finally {
        setLoading(false)
      }
    })()
  }, [personId])

  const handleLoadHistory = async (areaId: string) => {
    const hist = await getAssessmentHistoryForPersonArea(personId, areaId)
    setHistoryByArea(prev => ({ ...prev, [areaId]: hist }))
    setHistoryLoaded(prev => new Set([...prev, areaId]))
  }

  const handleAssess = async (areaId: string, level: string, notes: string, evidenceIds: string[]) => {
    const updated = await upsertAssessment({ personId, areaId, assessedLevel: level, notes, evidenceIds })
    setAssessments(prev => {
      const exists = prev.some(a => a.areaId === areaId)
      return exists ? prev.map(a => a.areaId === areaId ? updated : a) : [...prev, updated]
    })
  }

  const handleUpdateGrowthPlan = async (id: string, updates: Parameters<typeof updateGrowthPlan>[1]) => {
    const updated = await updateGrowthPlan(id, updates)
    setGrowthPlans(prev => prev.map(p => p.id === id ? updated : p))
  }

  const handleDeleteGrowthPlan = async (id: string) => {
    if (!confirm("Delete this growth plan?")) return
    await deleteGrowthPlan(id)
    setGrowthPlans(prev => prev.filter(p => p.id !== id))
  }

  const handleGeneratePromotionPacket = async (targetLevel: string) => {
    setGeneratingPacket(true)
    try {
      const result = await callAI({
        systemPrompt: PROMOTION_PACKET_SYSTEM,
        userPrompt: buildPromotionPacketPrompt({
          name: personName,
          role: null,
          currentLevel: personLevel ?? "unknown",
          targetLevel,
          assessments: assessments.map(a => {
            const area = areas.find(ar => ar.id === a.areaId)
            const expLev = personLevel ? (areaLevels[a.areaId] ?? []).find(l => l.level === personLevel) : null
            return {
              areaName: area?.name ?? a.areaId,
              assessedLevel: a.assessedLevel,
              expectedLevel: expLev?.level ?? personLevel ?? "unknown",
              notes: a.notes,
            }
          }),
          evidence: allEvidence.map(e => ({
            category: e.category,
            title: e.title,
            occurredAt: e.occurredAt,
            content: e.content,
          })),
        }),
        maxTokens: 1500,
        temperature: 0.4,
      })
      setPromotionPacket(result.content)
    } catch (err) {
      handleAIError(err)
    } finally {
      setGeneratingPacket(false)
    }
  }

  const handleSuggestGrowthPlan = async () => {
    // Find the area with the largest gap (assessed < expected)
    const gapAreas = areas.map(area => {
      const ass = assessments.find(a => a.areaId === area.id)
      const levels = areaLevels[area.id] ?? []
      const expLev = personLevel ? levels.find(l => l.level === personLevel) : null
      if (!ass || !expLev) return null
      const assessedScore = ass.score
      const expectedScore = levels.findIndex(l => l.level === expLev.level) + 1
      return { area, gap: expectedScore - assessedScore, assessedLevel: ass.assessedLevel, expectedLevel: expLev.level, levels }
    }).filter(Boolean).sort((a, b) => b!.gap - a!.gap)
    const top = gapAreas[0]
    if (!top) return

    setSuggestingPlan(true)
    try {
      const area = top.area
      const levels = top.levels
      const currentLevObj = levels.find(l => l.level === top.assessedLevel)
      const targetLevObj = levels.find(l => l.level === top.expectedLevel)
      const result = await callAI({
        systemPrompt: GROWTH_PLAN_SYSTEM,
        userPrompt: buildGrowthPlanPrompt({
          name: "this engineer",
          role: null,
          currentLevel: top.assessedLevel,
          targetLevel: top.expectedLevel,
          areaName: area.name,
          areaDescription: area.description ?? "",
          currentExpectations: currentLevObj?.expectations ?? "",
          targetExpectations: targetLevObj?.expectations ?? "",
        }),
        maxTokens: 600,
        temperature: 0.4,
      })
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return
      const parsed = JSON.parse(jsonMatch[0])
      const plan = await createGrowthPlan({
        personId,
        title: parsed.title ?? `Improve ${area.name}`,
        areaId: area.id,
        targetLevel: top.expectedLevel,
        targetDate: undefined,
        description: [
          parsed.description ?? "",
          parsed.actions?.length ? "\n**Actions:**\n" + (parsed.actions as string[]).map((a: string) => `- ${a}`).join("\n") : "",
          parsed.success_criteria ? `\n**Success criteria:** ${parsed.success_criteria}` : "",
          parsed.suggested_timeline ? `\n**Timeline:** ${parsed.suggested_timeline}` : "",
        ].filter(Boolean).join(""),
      })
      setGrowthPlans(prev => [plan, ...prev])
    } catch (err) {
      handleAIError(err)
    } finally {
      setSuggestingPlan(false)
    }
  }

  // Radar chart data
  const radarData = areas.map(area => {
    const ass = assessments.find(a => a.areaId === area.id)
    const expLevel = personLevel ? (areaLevels[area.id] ?? []).find(l => l.level === personLevel)?.level : null
    return {
      area: area.name.length > 14 ? area.name.slice(0, 12) + "…" : area.name,
      assessed: ass ? ass.score : 0,
      expected: expLevel ? levelToScore(expLevel) : 0,
      fullMark: 5,
    }
  })

  const readiness = computePromotionReadiness(personLevel ?? "", assessments)

  const activeGrowthPlans = growthPlans.filter(p => p.status === 'active')
  const completedGrowthPlans = growthPlans.filter(p => p.status !== 'active')

  if (loading) {
    return (
      <div style={{ marginTop: "24px", background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "8px", padding: "24px" }}>
        <p style={{ color: "var(--text-3)" }}>Loading competency data…</p>
      </div>
    )
  }

  if (!framework) {
    return (
      <div style={{ marginTop: "24px", background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "8px", padding: "24px" }}>
        <h2 style={{ marginBottom: "8px" }}>Competencies</h2>
        <p style={{ color: "var(--text-3)", marginBottom: "12px" }}>
          No career framework set up yet. Define competency areas and level expectations to start tracking.
        </p>
        <a
          href="/framework"
          style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            background: "linear-gradient(90deg, #00ffe5 0%, #00f058 100%)",
            border: "none", borderRadius: "4px", color: "#0a1a0a",
            fontSize: "var(--text-label)", fontWeight: 600, padding: "5px 12px",
            textDecoration: "none",
          }}
        >
          <ExternalLink style={{ width: "11px", height: "11px" }} /> Set up Career Framework
        </a>
      </div>
    )
  }

  return (
    <div style={{ marginTop: "24px" }}>
      <div style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "8px", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <h2 style={{ margin: 0 }}>Competencies</h2>
            <p style={{ marginTop: "2px" }}>{framework.name}</p>
          </div>
          <a
            href="/framework"
            style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none" }}
          >
            <ExternalLink style={{ width: "11px", height: "11px" }} /> Edit framework
          </a>
        </div>

        {/* Promotion readiness */}
        {assessments.length > 0 && personLevel && (
          <>
            <PromotionBanner readiness={readiness} />
            {readiness.nextLevel && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: promotionPacket ? "12px" : 0 }}>
                  <AIButton
                    configured={aiConfig.configured}
                    loading={aiConfig.loading}
                    generating={generatingPacket}
                    onClick={() => handleGeneratePromotionPacket(readiness.nextLevel!)}
                    label={promotionPacket ? "Regenerate promotion packet" : "Draft promotion packet"}
                    tooltip={aiConfig.tooltip}
                    showSetupLink={false}
                  />
                  {promotionPacket && (
                    <button
                      onClick={() => setPromotionPacket(null)}
                      style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>
                {promotionPacket && (
                  <div style={{ background: "var(--surf-2)", border: "1px solid var(--border-1)", borderRadius: "6px", padding: "16px 20px", fontSize: "var(--text-label)", color: "var(--text-2)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {promotionPacket}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Radar chart */}
        {areas.length > 0 && (
          <div style={{ marginBottom: "28px" }}>
            <CompetencyRadar data={radarData} />
          </div>
        )}

        {/* Competency area cards */}
        {areas.length === 0 ? (
          <p style={{ color: "var(--text-3)", marginBottom: "24px" }}>No competency areas defined in the framework.</p>
        ) : (
          <div style={{ marginBottom: "28px" }}>
            {areas.map(area => (
              <CompetencyCard
                key={area.id}
                area={area}
                levels={areaLevels[area.id] ?? []}
                assessment={assessments.find(a => a.areaId === area.id) ?? null}
                history={historyByArea[area.id] ?? []}
                historyLoaded={historyLoaded.has(area.id)}
                personLevel={personLevel}
                allEvidence={allEvidence}
                onAssess={(level, notes, evidenceIds) => handleAssess(area.id, level, notes, evidenceIds)}
                onLoadHistory={() => handleLoadHistory(area.id)}
                aiConfigured={aiConfig.configured}
              />
            ))}
          </div>
        )}

        {/* Growth plans */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h3 style={{ margin: 0 }}>Growth Plans</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AIButton
                configured={aiConfig.configured}
                loading={aiConfig.loading}
                generating={suggestingPlan}
                onClick={handleSuggestGrowthPlan}
                label="Suggest plan"
                tooltip={aiConfig.tooltip ?? "Suggests a plan for your biggest competency gap"}
                showSetupLink={false}
              />
              <button
                onClick={() => setAddingPlan(true)}
                style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  background: "linear-gradient(90deg, #00ffe5 0%, #00f058 100%)", border: "none", borderRadius: "4px",
                  color: "#0a1a0a", fontSize: "var(--text-caption)", padding: "4px 10px",
                  cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600,
                }}
              >
                <Plus style={{ width: "11px", height: "11px" }} /> Add plan
              </button>
            </div>
          </div>

          {addingPlan && (
            <AddGrowthPlanForm
              personId={personId}
              areas={areas}
              onSaved={plan => { setGrowthPlans(prev => [plan, ...prev]); setAddingPlan(false) }}
              onCancel={() => setAddingPlan(false)}
            />
          )}

          {activeGrowthPlans.length === 0 && !addingPlan && (
            <p style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", marginBottom: "12px" }}>No active growth plans.</p>
          )}

          {activeGrowthPlans.map(plan => (
            <GrowthPlanCard
              key={plan.id}
              plan={plan}
              areas={areas}
              onUpdate={handleUpdateGrowthPlan}
              onDelete={handleDeleteGrowthPlan}
            />
          ))}

          {completedGrowthPlans.length > 0 && (
            <details style={{ marginTop: "8px" }}>
              <summary style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", cursor: "pointer", marginBottom: "8px" }}>
                {completedGrowthPlans.length} completed / cancelled plan{completedGrowthPlans.length !== 1 ? "s" : ""}
              </summary>
              {completedGrowthPlans.map(plan => (
                <GrowthPlanCard
                  key={plan.id}
                  plan={plan}
                  areas={areas}
                  onUpdate={handleUpdateGrowthPlan}
                  onDelete={handleDeleteGrowthPlan}
                />
              ))}
            </details>
          )}
        </div>
      </div>
    </div>
  )
}
