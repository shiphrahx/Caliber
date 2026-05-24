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
    <div className="radar-empty">
      <p className="radar-empty-text">No assessments yet</p>
    </div>
  )
  return (
    <div className="radar-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="var(--border-2)" />
          <PolarAngleAxis dataKey="area" tick={{ fill: "var(--text-3)", fontSize: 13 }} />
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
      <div className="radar-legend">
        <span className="radar-legend-item">
          <span className="radar-legend-line" style={{ background: "#00ffe5" }} /> Assessed
        </span>
        <span className="radar-legend-item">
          <span className="radar-legend-line" style={{ background: "#00f058", opacity: 0.5 }} /> Expected
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
    <div
      className="promo-banner"
      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
    >
      <div>
        <span className="promo-banner-label" style={{ color: colors.color }}>
          {readiness.label}
        </span>
        <span className="promo-banner-sub">
          {readiness.atNextLevel} of {readiness.total} areas at {readiness.nextLevel} level
        </span>
      </div>
      <span className="promo-banner-note">
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
    <div className="comp-card">
      {/* Card header */}
      <div className="comp-card-header">
        <button className="comp-card-toggle-btn" onClick={() => setExpanded(e => !e)}>
          {expanded
            ? <ChevronDown />
            : <ChevronRight />}
        </button>

        <span className="comp-card-name">{area.name}</span>

        {/* Level buttons */}
        <div className="comp-level-btns">
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
          <span className="comp-saved-flash">
            <Check /> Saved
          </span>
        )}
      </div>

      {/* Expected level for this person */}
      {personLevel && (
        <div className="comp-expected-level">
          {expectedLevel ? (
            <span>
              Expected at {personLevel}: <span style={{ color: LEVEL_COLORS[expectedLevel]?.color ?? "var(--text-2)" }}>{expectedLevel}</span>
            </span>
          ) : (
            <span>No expectation defined for {personLevel}</span>
          )}
        </div>
      )}

      {/* Expanded body */}
      {expanded && (
        <div className="comp-card-body">
          {/* Notes */}
          <div className="comp-notes-wrap">
            <div className="comp-notes-header">
              <Label>Assessment notes</Label>
              {aiConfigured && assessment && (
                <button
                  onClick={handleGenerateReasoning}
                  disabled={generatingReasoning}
                  className="comp-gen-reasoning-btn"
                  style={{ color: generatingReasoning ? "var(--text-3)" : "#00f058", cursor: generatingReasoning ? "not-allowed" : "pointer" }}
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
          <div className="comp-evidence-wrap">
            <div className="comp-evidence-header">
              <Label>Linked evidence</Label>
              <button
                onClick={() => setShowEvidencePicker(p => !p)}
                className="comp-link-evidence-btn"
              >
                <Link2 /> Link evidence
              </button>
            </div>

            {linkedEvidence.length > 0 ? (
              <div className="comp-evidence-list">
                {linkedEvidence.map(e => (
                  <div key={e.id} className="comp-evidence-item">
                    <span className="comp-evidence-item-title">{e.title}</span>
                    <span className="comp-evidence-item-date">{e.occurredAt}</span>
                    <button className="comp-evidence-unlink-btn" onClick={() => toggleEvidence(e.id)}>
                      <Trash2 />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="comp-evidence-empty">No evidence linked.</p>
            )}

            {/* Evidence picker */}
            {showEvidencePicker && (
              <div className="comp-evidence-picker">
                {allEvidence.length === 0 ? (
                  <p className="comp-evidence-picker-empty">No evidence entries yet.</p>
                ) : (
                  allEvidence.map(e => {
                    const linked = assessment?.evidenceIds?.includes(e.id)
                    return (
                      <div
                        key={e.id}
                        onClick={() => toggleEvidence(e.id)}
                        className="comp-evidence-picker-item"
                        style={{ borderLeft: `2px solid ${linked ? "#00f058" : "transparent"}` }}
                      >
                        <span className="comp-evidence-picker-item-title">{e.title}</span>
                        <span className="comp-evidence-picker-item-date">{e.occurredAt}</span>
                        {linked && <Check className="comp-evidence-picker-check" />}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Assessment history */}
          <div className="comp-history-wrap">
            <div className="comp-history-header">
              <Label>Assessment history</Label>
              {!historyLoaded && (
                <button className="comp-load-history-btn" onClick={onLoadHistory}>
                  Load history
                </button>
              )}
            </div>
            {historyLoaded && history.length === 0 && (
              <p className="comp-history-empty">No history yet.</p>
            )}
            {historyLoaded && history.length > 0 && (
              <div className="comp-history-list">
                {history.map(h => (
                  <div key={h.id} className="comp-history-item">
                    <span className="comp-history-date">{h.assessedAt}</span>
                    <span className="comp-history-level" style={{ color: LEVEL_COLORS[h.assessedLevel]?.color ?? "var(--text-2)" }}>
                      {h.assessedLevel}
                    </span>
                    {h.notes && (
                      <span className="comp-history-notes">
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
    <div className="growth-plan-card">
      <div className="growth-plan-header">
        <button className="growth-plan-toggle-btn" onClick={() => setExpanded(e => !e)}>
          {expanded ? <ChevronDown /> : <ChevronRight />}
        </button>
        <span className="growth-plan-title">{plan.title}</span>
        {plan.areaName && (
          <span className="growth-plan-area-chip">{plan.areaName}</span>
        )}
        {plan.targetLevel && (
          <span className="growth-plan-target-level" style={{ color: LEVEL_COLORS[plan.targetLevel]?.color ?? "var(--text-2)" }}>
            → {plan.targetLevel}
          </span>
        )}
        <span className="growth-plan-status-chip" style={{ background: statusColors.bg, color: statusColors.color }}>
          {plan.status}
        </span>
        {plan.status === 'active' && (
          <button className="growth-plan-complete-btn" onClick={() => save({ status: 'completed' })}>
            Complete
          </button>
        )}
        <button className="growth-plan-delete-btn" onClick={() => onDelete(plan.id)}>
          <Trash2 />
        </button>
      </div>

      {expanded && (
        <div className="growth-plan-body">
          <div className="growth-plan-2col">
            <div>
              <Label className="growth-plan-label">Target area</Label>
              <select
                value={plan.areaId ?? ""}
                onChange={e => save({ areaId: e.target.value || null })}
                disabled={saving}
                className="evidence-form-select"
              >
                <option value="">No area</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="growth-plan-label">Target level</Label>
              <select
                value={plan.targetLevel ?? ""}
                onChange={e => save({ targetLevel: e.target.value || null })}
                disabled={saving}
                className="evidence-form-select"
              >
                <option value="">No target</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="growth-plan-2col">
            <div>
              <Label className="growth-plan-label">Status</Label>
              <select
                value={plan.status}
                onChange={e => save({ status: e.target.value as GrowthPlan['status'] })}
                disabled={saving}
                className="evidence-form-select"
              >
                {['active', 'paused', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label className="growth-plan-label">Target date</Label>
              <input
                type="date"
                value={plan.targetDate ?? ""}
                onChange={e => save({ targetDate: e.target.value || null })}
                disabled={saving}
                className="evidence-form-select"
              />
            </div>
          </div>

          <div>
            <Label className="growth-plan-label">Description</Label>
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
            <Label className="growth-plan-label">Progress notes</Label>
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
    <div className="add-growth-plan-form">
      <div className="add-growth-plan-grid">
        <div>
          <Label className="growth-plan-label">Title *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Improve system design skills" />
        </div>
        <div className="growth-plan-3col">
          <div>
            <Label className="growth-plan-label">Target area</Label>
            <select value={areaId} onChange={e => setAreaId(e.target.value)} className="evidence-form-select">
              <option value="">None</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="growth-plan-label">Target level</Label>
            <select value={targetLevel} onChange={e => setTargetLevel(e.target.value)} className="evidence-form-select">
              <option value="">None</option>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <Label className="growth-plan-label">Target date</Label>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="evidence-form-select" />
          </div>
        </div>
        <div className="add-growth-plan-footer">
          <button onClick={onCancel} className="add-growth-plan-cancel-btn">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="add-growth-plan-save-btn"
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
      <div className="competency-section">
        <div className="competency-card-wrap competency-card-wrap--loading">
          <p className="competency-loading-text">Loading competency data…</p>
        </div>
      </div>
    )
  }

  if (!framework) {
    return (
      <div className="competency-section">
        <div className="competency-card-wrap">
          <h2 className="competency-no-framework-title">Competencies</h2>
          <p className="competency-no-framework-text">
            No career framework set up yet. Define competency areas and level expectations to start tracking.
          </p>
          <a href="/framework" className="competency-setup-link">
            <ExternalLink /> Set up Career Framework
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="competency-section">
      <div className="competency-card-wrap">
        <div className="competency-card-header">
          <div>
            <h2 className="competency-card-title">Competencies</h2>
            <p className="competency-card-subtitle">{framework.name}</p>
          </div>
          <a href="/framework" className="competency-framework-link">
            <ExternalLink /> Edit framework
          </a>
        </div>

        {/* Promotion readiness */}
        {assessments.length > 0 && personLevel && (
          <>
            <PromotionBanner readiness={readiness} />
            {readiness.nextLevel && (
              <div className="competency-promo-readiness">
                <div className="promo-packet-row">
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
                    <button className="promo-packet-clear-btn" onClick={() => setPromotionPacket(null)}>
                      ✕ Clear
                    </button>
                  )}
                </div>
                {promotionPacket && (
                  <div className="promo-packet-content">{promotionPacket}</div>
                )}
              </div>
            )}
          </>
        )}

        {/* Radar chart */}
        {areas.length > 0 && (
          <div className="competency-radar-wrap">
            <CompetencyRadar data={radarData} />
          </div>
        )}

        {/* Competency area cards */}
        {areas.length === 0 ? (
          <p className="competency-no-areas">No competency areas defined in the framework.</p>
        ) : (
          <div className="competency-areas-wrap">
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
          <div className="growth-plans-header">
            <h3 className="growth-plans-title">Growth Plans</h3>
            <div className="growth-plans-actions">
              <AIButton
                configured={aiConfig.configured}
                loading={aiConfig.loading}
                generating={suggestingPlan}
                onClick={handleSuggestGrowthPlan}
                label="Suggest plan"
                tooltip={aiConfig.tooltip ?? "Suggests a plan for your biggest competency gap"}
                showSetupLink={false}
              />
              <button className="growth-plan-add-btn" onClick={() => setAddingPlan(true)}>
                <Plus /> Add plan
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
            <p className="growth-plan-empty">No active growth plans.</p>
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
            <details className="growth-plan-archive">
              <summary className="growth-plan-archive-summary">
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
