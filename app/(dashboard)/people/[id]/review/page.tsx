"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronDown, ChevronRight, Printer, Plus, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MarkdownTextarea } from "@/components/ui/markdown-textarea"
import { AIButton, AIGeneratedBadge } from "@/components/ui/ai-button"
import { useAIConfig } from "@/lib/hooks/use-ai-config"
import { callAI, handleAIError } from "@/lib/services/ai"
import { REVIEW_DRAFT_SYSTEM, buildReviewDraftPrompt } from "@/lib/ai/prompts"
import { getPeople, type Person } from "@/lib/services/people"
import { getMeetingsForPerson, type Meeting } from "@/lib/services/meetings"
import {
  getEvidenceForPersonInPeriod,
  getReviewCycles,
  createReviewCycle,
  getReviewSummary,
  upsertReviewSummary,
  createEvidence,
  type EvidenceEntry,
  type EvidenceCategory,
  type ReviewCycle,
} from "@/lib/services/evidence"

const CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  achievement:        "Achievement",
  feedback_given:     "Feedback Given",
  feedback_received:  "Feedback Received",
  concern:            "Concern",
  growth:             "Growth",
  delivery:           "Delivery",
  behaviour:          "Behaviour",
  promotion_evidence: "Promotion Evidence",
  general:            "General",
}

const CATEGORY_COLORS: Record<EvidenceCategory, { bg: string; color: string }> = {
  achievement:        { bg: "#0d2015", color: "#4ade80" },
  feedback_given:     { bg: "#0c1a3d", color: "#60a5fa" },
  feedback_received:  { bg: "#1a0d2e", color: "#c084fc" },
  concern:            { bg: "#2a0a0a", color: "#f87171" },
  growth:             { bg: "#0d1e1e", color: "#2dd4bf" },
  delivery:           { bg: "#0f1526", color: "#818cf8" },
  behaviour:          { bg: "#1e1500", color: "#fbbf24" },
  promotion_evidence: { bg: "#1e1200", color: "#f59e0b" },
  general:            { bg: "#1a1a1a", color: "#9ca3af" },
}

const SENTIMENT_CONFIG = {
  positive: { label: "Positive", color: "#4ade80", symbol: "↑" },
  neutral:  { label: "Neutral",  color: "#9ca3af", symbol: "–" },
  negative: { label: "Negative", color: "#f87171", symbol: "↓" },
}

type SectionKey = "impact" | "strengths" | "growth" | "behaviour" | "promotion" | "meetings" | "concerns" | "notes"

const sixMonthsAgo = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 6)
  return d.toISOString().split("T")[0]
}

const today = () => new Date().toISOString().split("T")[0]

export default function ReviewPrepPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [personId, setPersonId] = useState<string | null>(null)
  const [person, setPerson] = useState<Person | null>(null)
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [reviewCycles, setReviewCycles] = useState<ReviewCycle[]>([])
  const [selectedCycleId, setSelectedCycleId] = useState<string>("custom")
  const [periodStart, setPeriodStart] = useState(sixMonthsAgo())
  const [periodEnd, setPeriodEnd] = useState(today())
  const [summaryText, setSummaryText] = useState("")
  const [managerNotes, setManagerNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<SectionKey>>(new Set())
  const [showNewCycleForm, setShowNewCycleForm] = useState(false)
  const [newCycleName, setNewCycleName] = useState("")
  const [savingCycle, setSavingCycle] = useState(false)
  const [savingEvidenceId, setSavingEvidenceId] = useState<string | null>(null)
  const [generatingDraft, setGeneratingDraft] = useState(false)
  const [draftAbort, setDraftAbort] = useState<AbortController | null>(null)
  const [showAIBadge, setShowAIBadge] = useState(false)
  const aiConfig = useAIConfig()

  useEffect(() => {
    params.then(({ id }) => setPersonId(id))
  }, [params])

  useEffect(() => {
    if (!personId) return
    getPeople().then(all => {
      const found = all.find(p => p.id === personId)
      if (found) setPerson(found)
    }).catch(console.error)
    getReviewCycles().then(setReviewCycles).catch(console.error)
    getMeetingsForPerson(personId).then(setMeetings).catch(console.error)
  }, [personId])

  const loadEvidence = useCallback(() => {
    if (!personId) return
    getEvidenceForPersonInPeriod(personId, periodStart, periodEnd).then(setEvidence).catch(console.error)
  }, [personId, periodStart, periodEnd])

  useEffect(() => { loadEvidence() }, [loadEvidence])

  useEffect(() => {
    if (!personId) return
    getReviewSummary(personId, periodStart, periodEnd).then(s => {
      setSummaryText(s?.summaryText ?? "")
      setManagerNotes(s?.managerNotes ?? "")
    }).catch(console.error)
  }, [personId, periodStart, periodEnd])

  useEffect(() => {
    if (selectedCycleId === "custom") return
    const cycle = reviewCycles.find(c => c.id === selectedCycleId)
    if (cycle) { setPeriodStart(cycle.startDate); setPeriodEnd(cycle.endDate) }
  }, [selectedCycleId, reviewCycles])

  const handleCycleChange = (id: string) => {
    setSelectedCycleId(id)
    if (id === "custom") return
    const cycle = reviewCycles.find(c => c.id === id)
    if (cycle) { setPeriodStart(cycle.startDate); setPeriodEnd(cycle.endDate) }
  }

  const handleCreateCycle = async () => {
    if (!newCycleName.trim()) return
    setSavingCycle(true)
    try {
      const cycle = await createReviewCycle({ name: newCycleName.trim(), startDate: periodStart, endDate: periodEnd, status: "active" })
      setReviewCycles([cycle, ...reviewCycles])
      setSelectedCycleId(cycle.id)
      setNewCycleName("")
      setShowNewCycleForm(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingCycle(false)
    }
  }

  const handleGenerateDraft = async () => {
    if (!person) return
    if (summaryText.trim() && !confirm('This will replace your current summary draft. Continue?')) return
    const abort = new AbortController()
    setDraftAbort(abort)
    setGeneratingDraft(true)
    try {
      const result = await callAI({
        systemPrompt: REVIEW_DRAFT_SYSTEM,
        userPrompt: buildReviewDraftPrompt({
          name: person.name,
          role: person.role,
          level: person.level,
          teams: person.teams,
          startDate: person.startDate,
          periodStart,
          periodEnd,
          evidence,
          meetings: meetings.map(m => ({ meetingType: m.meetingType, title: m.title, meetingDate: m.meetingDate, notes: m.notes })),
        }),
        maxTokens: 2000,
        temperature: 0.4,
      }, abort.signal)
      setSummaryText(result.content)
      setShowAIBadge(true)
    } catch (err) {
      handleAIError(err)
    } finally {
      setGeneratingDraft(false)
      setDraftAbort(null)
    }
  }

  const handleSaveNotes = async () => {
    if (!personId) return
    setSavingNotes(true)
    try {
      await upsertReviewSummary({
        personId,
        reviewCycleId: selectedCycleId !== "custom" ? selectedCycleId : null,
        periodStart,
        periodEnd,
        summaryText: summaryText || null,
        managerNotes: managerNotes || null,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setSavingNotes(false)
    }
  }

  const handleSaveAsEvidence = async (meeting: Meeting) => {
    if (!personId) return
    setSavingEvidenceId(meeting.id)
    try {
      const created = await createEvidence({
        personId,
        category: "general",
        title: meeting.title,
        content: meeting.notes || null,
        occurredAt: meeting.meetingDate,
        meetingId: meeting.id,
        taskId: null,
        sentiment: null,
        includedInReview: true,
        reviewPeriodStart: periodStart,
        reviewPeriodEnd: periodEnd,
      })
      setEvidence(prev => [created, ...prev])
    } catch (err) {
      console.error(err)
    } finally {
      setSavingEvidenceId(null)
    }
  }

  const toggleSection = (key: SectionKey) => {
    const s = new Set(collapsedSections)
    s.has(key) ? s.delete(key) : s.add(key)
    setCollapsedSections(s)
  }

  const periodMeetings = useMemo(() =>
    meetings.filter(m => m.meetingDate >= periodStart && m.meetingDate <= periodEnd)
      .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime()),
    [meetings, periodStart, periodEnd]
  )

  const impactEntries = useMemo(() =>
    evidence.filter(e => ["achievement", "delivery"].includes(e.category) && e.includedInReview),
    [evidence])

  const strengthsEntries = useMemo(() =>
    evidence.filter(e =>
      (["feedback_given", "feedback_received", "behaviour"].includes(e.category) && e.sentiment === "positive") && e.includedInReview),
    [evidence])

  const growthEntries = useMemo(() =>
    evidence.filter(e =>
      (["growth"].includes(e.category) ||
        (["feedback_given"].includes(e.category) && (e.sentiment === "negative" || e.sentiment === "neutral")) ||
        e.category === "concern") && e.includedInReview),
    [evidence])

  const behaviourEntries = useMemo(() =>
    evidence.filter(e => e.category === "behaviour" && e.includedInReview),
    [evidence])

  const promotionEntries = useMemo(() =>
    evidence.filter(e => e.category === "promotion_evidence" && e.includedInReview),
    [evidence])

  const concernEntries = useMemo(() =>
    evidence.filter(e => e.category === "concern" && e.includedInReview),
    [evidence])

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

  const handlePrint = () => window.print()

  if (!person) {
    return (
      <div className="person-not-found">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="review-page review-prep-page">
      {/* Header */}
      <div className="review-header">
        <button className="review-back-btn" onClick={() => router.push(`/people/${personId}`)}>
          <ArrowLeft /> Back to {person.name}
        </button>
        <div className="review-header-row">
          <div>
            <h1>Review Prep — {person.name}</h1>
            <p className="review-sub">{person.role}</p>
          </div>
          <div className="review-header-actions">
            <Button variant="outline" onClick={handlePrint}>
              <Printer style={{ width: "14px", height: "14px" }} /> Export
            </Button>
          </div>
        </div>
      </div>

      {/* Period selector */}
      <div className="review-period-card">
        <div className="review-period-row">
          <div className="review-period-field">
            <label className="form-label">Review Cycle</label>
            <select value={selectedCycleId} onChange={e => handleCycleChange(e.target.value)}
              className="review-period-select">
              <option value="custom">Custom range</option>
              {reviewCycles.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({formatDate(c.startDate)} – {formatDate(c.endDate)})</option>
              ))}
            </select>
          </div>
          <div className="review-period-field">
            <label className="form-label">From</label>
            <Input type="date" value={periodStart} onChange={e => { setPeriodStart(e.target.value); setSelectedCycleId("custom") }} style={{ width: "150px" }} />
          </div>
          <div className="review-period-field">
            <label className="form-label">To</label>
            <Input type="date" value={periodEnd} onChange={e => { setPeriodEnd(e.target.value); setSelectedCycleId("custom") }} style={{ width: "150px" }} />
          </div>
          <div className="review-period-padtop">
            <button onClick={() => setShowNewCycleForm(!showNewCycleForm)} className="review-period-save-btn">
              <Plus /> Save as cycle
            </button>
          </div>
        </div>
        {showNewCycleForm && (
          <div className="review-new-cycle-form">
            <div className="review-new-cycle-field">
              <label className="form-label">Cycle name</label>
              <Input value={newCycleName} onChange={e => setNewCycleName(e.target.value)} placeholder="e.g. H1 2026, Annual 2025" />
            </div>
            <Button onClick={handleCreateCycle} disabled={!newCycleName.trim() || savingCycle}>
              {savingCycle ? "Saving..." : "Save Cycle"}
            </Button>
            <Button variant="outline" onClick={() => setShowNewCycleForm(false)}>Cancel</Button>
          </div>
        )}
        <div className="review-period-stats">
          <span className="review-period-stat">
            {evidence.length} evidence {evidence.length === 1 ? "entry" : "entries"} in period
          </span>
          <span className="review-period-stat">
            {periodMeetings.length} {periodMeetings.length === 1 ? "meeting" : "meetings"} in period
          </span>
        </div>
      </div>

      {/* Summary */}
      <ReviewSection
        title="Summary"
        sectionKey="impact"
        collapsed={collapsedSections.has("impact")}
        onToggle={() => toggleSection("impact")}
        count={summaryText ? 1 : 0}
        emptyMessage="Write a synthesis of this person's performance for the review period. Capture the overall narrative before diving into specifics."
        headerExtra={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {generatingDraft && draftAbort && (
              <button className="review-cancel-btn" onClick={() => draftAbort.abort()}>Cancel</button>
            )}
            <AIButton
              configured={aiConfig.configured}
              loading={aiConfig.loading}
              generating={generatingDraft}
              onClick={handleGenerateDraft}
              label="Generate draft"
              tooltip={aiConfig.tooltip}
              showSetupLink={true}
            />
          </div>
        }
      >
        {showAIBadge && (
          <div className="review-ai-badge-wrap">
            <AIGeneratedBadge onDismiss={() => setShowAIBadge(false)} />
          </div>
        )}
        <MarkdownTextarea
          value={summaryText}
          onValueChange={setSummaryText}
          placeholder="Write a high-level summary of performance during this period..."
          rows={6}
        />
      </ReviewSection>

      {/* Impact & Delivery */}
      <ReviewSection
        title="Impact & Delivery"
        sectionKey="impact"
        collapsed={collapsedSections.has("impact")}
        onToggle={() => toggleSection("impact")}
        count={impactEntries.length}
        emptyMessage="No delivery evidence logged yet. Add evidence from the person's profile or tag meeting notes as evidence."
      >
        {impactEntries.map(e => (
          <EvidenceCard key={e.id} entry={e} formatDate={formatDate} />
        ))}
      </ReviewSection>

      {/* Strengths */}
      <ReviewSection
        title="Strengths"
        sectionKey="strengths"
        collapsed={collapsedSections.has("strengths")}
        onToggle={() => toggleSection("strengths")}
        count={strengthsEntries.length}
        emptyMessage="No strengths evidence logged. Consider noting positive feedback and strong behavioural examples from your 1:1s."
      >
        {strengthsEntries.map(e => (
          <EvidenceCard key={e.id} entry={e} formatDate={formatDate} />
        ))}
      </ReviewSection>

      {/* Growth Areas */}
      <ReviewSection
        title="Growth Areas"
        sectionKey="growth"
        collapsed={collapsedSections.has("growth")}
        onToggle={() => toggleSection("growth")}
        count={growthEntries.length}
        emptyMessage="No growth evidence logged. Note development discussions from 1:1s and areas where improvement would be impactful."
      >
        {growthEntries.map(e => (
          <EvidenceCard key={e.id} entry={e} formatDate={formatDate} />
        ))}
      </ReviewSection>

      {/* Behavioural Examples */}
      <ReviewSection
        title="Behavioural Examples"
        sectionKey="behaviour"
        collapsed={collapsedSections.has("behaviour")}
        onToggle={() => toggleSection("behaviour")}
        count={behaviourEntries.length}
        emptyMessage="No behavioural examples logged."
      >
        {behaviourEntries.map(e => (
          <EvidenceCard key={e.id} entry={e} formatDate={formatDate} />
        ))}
      </ReviewSection>

      {/* Promotion Evidence */}
      {promotionEntries.length > 0 && (
        <ReviewSection
          title="Promotion Evidence"
          sectionKey="promotion"
          collapsed={collapsedSections.has("promotion")}
          onToggle={() => toggleSection("promotion")}
          count={promotionEntries.length}
          emptyMessage=""
        >
          {promotionEntries.map(e => (
            <EvidenceCard key={e.id} entry={e} formatDate={formatDate} />
          ))}
        </ReviewSection>
      )}

      {/* Open Concerns */}
      <ReviewSection
        title="Open Concerns"
        sectionKey="concerns"
        collapsed={collapsedSections.has("concerns")}
        onToggle={() => toggleSection("concerns")}
        count={concernEntries.length}
        emptyMessage="No concerns logged."
      >
        {concernEntries.map(e => (
          <EvidenceCard key={e.id} entry={e} formatDate={formatDate} />
        ))}
      </ReviewSection>

      {/* Meeting History */}
      <ReviewSection
        title="Meeting History"
        sectionKey="meetings"
        collapsed={collapsedSections.has("meetings")}
        onToggle={() => toggleSection("meetings")}
        count={periodMeetings.length}
        emptyMessage="No meetings found in this period."
      >
        {periodMeetings.map(m => (
          <div key={m.id} className="review-meeting-item">
            <div className="review-meeting-item-row">
              <div>
                <p className="review-meeting-title">{m.title}</p>
                <p className="review-meeting-meta">{m.meetingType} · {formatDate(m.meetingDate)}</p>
                {m.notes && (
                  <p className="review-meeting-notes">{m.notes.replace(/<[^>]*>/g, "")}</p>
                )}
              </div>
              <button
                onClick={() => handleSaveAsEvidence(m)}
                disabled={savingEvidenceId === m.id}
                className="review-save-as-evidence-btn"
              >
                <Plus />
                {savingEvidenceId === m.id ? "Saving..." : "Save as evidence"}
              </button>
            </div>
          </div>
        ))}
      </ReviewSection>

      {/* Manager Notes */}
      <ReviewSection
        title="Manager Notes"
        sectionKey="notes"
        collapsed={collapsedSections.has("notes")}
        onToggle={() => toggleSection("notes")}
        count={managerNotes ? 1 : 0}
        emptyMessage="Private notes for your own reference during the review conversation."
      >
        <MarkdownTextarea
          value={managerNotes}
          onValueChange={setManagerNotes}
          placeholder="Private notes for the review conversation (not included in exports)..."
          rows={4}
        />
      </ReviewSection>

      {/* Save notes */}
      <div className="review-save-footer">
        <Button onClick={handleSaveNotes} disabled={savingNotes}>
          <Save style={{ width: "14px", height: "14px" }} />
          {savingNotes ? "Saving..." : "Save Notes"}
        </Button>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .review-prep-page button,
          .review-prep-page [role="button"] { display: none !important; }
          .no-print { display: none !important; }
          body { background: white; color: black; }
        }
      `}</style>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReviewSection({
  title, collapsed, onToggle, count, emptyMessage, headerExtra, children,
}: {
  title: string
  sectionKey?: SectionKey
  collapsed: boolean
  onToggle: () => void
  count: number
  emptyMessage: string
  headerExtra?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="review-section-card">
      <div className="review-section-header-row">
        <button className="review-section-toggle-btn" onClick={onToggle}>
          {collapsed ? <ChevronRight /> : <ChevronDown />}
          <h2 className="review-section-title">{title}</h2>
          <span className="review-section-count">{count} {count === 1 ? "entry" : "entries"}</span>
        </button>
        {headerExtra && (
          <div className="review-section-extra" onClick={e => e.stopPropagation()}>
            {headerExtra}
          </div>
        )}
      </div>
      {!collapsed && (
        <div className="review-section-body">
          {count === 0 && emptyMessage ? (
            <p className="review-section-empty">{emptyMessage}</p>
          ) : children}
        </div>
      )}
    </div>
  )
}

function EvidenceCard({ entry, formatDate }: { entry: EvidenceEntry; formatDate: (d: string) => string }) {
  const cat = CATEGORY_COLORS[entry.category]
  const sent = entry.sentiment ? SENTIMENT_CONFIG[entry.sentiment] : null

  return (
    <div className="review-ev-card">
      <div className="review-ev-card-inner">
        <span className="review-ev-cat-badge" style={{ background: cat.bg, color: cat.color }}>
          {CATEGORY_LABELS[entry.category]}
        </span>
        <div className="review-ev-body">
          <div className="review-ev-header" style={{ marginBottom: entry.content ? "6px" : 0 }}>
            <p className="review-ev-title">{entry.title}</p>
            {sent && (
              <span className="review-ev-sentiment" style={{ color: sent.color }}>{sent.symbol} {sent.label}</span>
            )}
            <span className="review-ev-date">{formatDate(entry.occurredAt)}</span>
          </div>
          {entry.content && (
            <p className="review-ev-content">{entry.content}</p>
          )}
          {entry.meetingTitle && (
            <p className="review-ev-meeting">Meeting: {entry.meetingTitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}
