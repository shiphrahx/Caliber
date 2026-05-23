"use client"

import { useState, useEffect } from "react"
import { Plus, ChevronDown, ChevronRight, Link2, Trash2, Check, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MarkdownTextarea } from "@/components/ui/markdown-textarea"
import {
  getEvidenceForPerson,
  createEvidence,
  updateEvidence,
  deleteEvidence,
  type EvidenceEntry,
  type EvidenceCategory,
  type EvidenceSentiment,
} from "@/lib/services/evidence"
import { BatchEvidenceImportModal } from "./batch-evidence-import-modal"

const CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  achievement: "Achievement",
  feedback_given: "Feedback Given",
  feedback_received: "Feedback Received",
  concern: "Concern",
  growth: "Growth",
  delivery: "Delivery",
  behaviour: "Behaviour",
  promotion_evidence: "Promotion Evidence",
  general: "General",
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

const CATEGORIES = Object.keys(CATEGORY_LABELS) as EvidenceCategory[]
const SENTIMENTS: EvidenceSentiment[] = ["positive", "neutral", "negative"]

interface EvidenceFormState {
  category: EvidenceCategory
  title: string
  content: string
  occurredAt: string
  sentiment: EvidenceSentiment
}

const emptyForm = (): EvidenceFormState => ({
  category: "general",
  title: "",
  content: "",
  occurredAt: new Date().toISOString().split("T")[0],
  sentiment: "neutral",
})

interface EvidenceSectionProps {
  personId: string
  personName: string
  /** Pre-linked meeting for "Log as Evidence" flow */
  prefillMeetingId?: string
  prefillMeetingTitle?: string
  prefillMeetingDate?: string
  onPrefillConsumed?: () => void
  /** People list for batch import person resolution */
  allPeople?: Array<{ id: string; name: string }>
}

export function EvidenceSection({
  personId,
  personName,
  prefillMeetingId,
  prefillMeetingTitle,
  prefillMeetingDate,
  onPrefillConsumed,
  allPeople = [],
}: EvidenceSectionProps) {
  const [entries, setEntries] = useState<EvidenceEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<EvidenceFormState>(emptyForm())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EvidenceFormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [linkedMeetingId, setLinkedMeetingId] = useState<string | undefined>(undefined)
  const [batchImportOpen, setBatchImportOpen] = useState(false)

  // People list: merge allPeople with the current person to ensure they're always included
  const batchPeople = allPeople.length > 0
    ? allPeople
    : [{ id: personId, name: personName }]

  useEffect(() => {
    getEvidenceForPerson(personId).then(setEntries).catch(console.error)
  }, [personId])

  // Handle prefill from "Log as Evidence" button on meeting detail
  useEffect(() => {
    if (prefillMeetingId) {
      setForm({
        ...emptyForm(),
        title: prefillMeetingTitle ? `From meeting: ${prefillMeetingTitle}` : "",
        occurredAt: prefillMeetingDate ?? new Date().toISOString().split("T")[0],
        category: "general",
      })
      setLinkedMeetingId(prefillMeetingId)
      setShowForm(true)
      onPrefillConsumed?.()
    }
  }, [prefillMeetingId, prefillMeetingTitle, prefillMeetingDate, onPrefillConsumed])

  const handleSubmit = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const created = await createEvidence({
        personId,
        category: form.category,
        title: form.title.trim(),
        content: form.content.trim() || null,
        occurredAt: form.occurredAt,
        sentiment: form.sentiment,
        meetingId: linkedMeetingId ?? null,
        taskId: null,
        includedInReview: true,
        reviewPeriodStart: null,
        reviewPeriodEnd: null,
      })
      setEntries([created, ...entries])
      setForm(emptyForm())
      setLinkedMeetingId(undefined)
      setShowForm(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleStartEdit = (entry: EvidenceEntry) => {
    setEditingId(entry.id)
    setEditForm({
      category: entry.category,
      title: entry.title,
      content: entry.content ?? "",
      occurredAt: entry.occurredAt,
      sentiment: entry.sentiment ?? "neutral",
    })
  }

  const handleSaveEdit = async (id: string) => {
    setSaving(true)
    try {
      const updated = await updateEvidence(id, {
        category: editForm.category,
        title: editForm.title.trim(),
        content: editForm.content.trim() || null,
        occurredAt: editForm.occurredAt,
        sentiment: editForm.sentiment,
      })
      setEntries(entries.map(e => e.id === id ? updated : e))
      setEditingId(null)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteEvidence(id)
      setEntries(entries.filter(e => e.id !== id))
      if (expandedId === id) setExpandedId(null)
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

  return (
    <div style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "8px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2>Evidence</h2>
          <p style={{ marginTop: "2px" }}>
            {entries.length} {entries.length === 1 ? "entry" : "entries"} logged for {personName}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <a
            href={`/people/${personId}/review`}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "4px", fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-2)", border: "1px solid var(--border-2)", background: "var(--surf-2)", textDecoration: "none", cursor: "pointer" }}
          >
            Review Prep
          </a>
          <button
            onClick={() => setBatchImportOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "4px", fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-2)", border: "1px solid var(--border-2)", background: "var(--surf-2)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
            title="Import multiple evidence entries from pasted text"
          >
            <FileText style={{ width: "11px", height: "11px" }} /> Import from text
          </button>
          <button
            onClick={() => { setShowForm(true); setLinkedMeetingId(undefined) }}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "linear-gradient(90deg, #00ffe5 0%, #00f058 100%)", border: "none", color: "#0a1a0a", padding: "4px 10px", borderRadius: "4px", fontSize: "var(--text-caption)", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            <Plus style={{ width: "11px", height: "11px" }} /> Add Evidence
          </button>
        </div>
      </div>

      {/* Quick-add form */}
      {showForm && (
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-1)", background: "var(--surf-2)" }}>
          <div style={{ display: "grid", gap: "14px" }}>
            {/* Row 1: category + date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: "12px" }}>
              <div style={{ display: "grid", gap: "4px" }}>
                <label className="form-label">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value as EvidenceCategory })}
                  style={{ background: "var(--surf)", border: "1px solid var(--border-2)", borderRadius: "6px", color: "var(--text-1)", padding: "6px 10px", fontSize: "var(--text-label)", cursor: "pointer" }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gap: "4px" }}>
                <label className="form-label">Date</label>
                <Input type="date" value={form.occurredAt} onChange={e => setForm({ ...form, occurredAt: e.target.value })} />
              </div>
            </div>

            {/* Row 2: title */}
            <div style={{ display: "grid", gap: "4px" }}>
              <label className="form-label">Title *</label>
              <Input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Brief description of the evidence..."
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) handleSubmit() }}
              />
            </div>

            {/* Row 3: content */}
            <div style={{ display: "grid", gap: "4px" }}>
              <label className="form-label">Notes (optional)</label>
              <MarkdownTextarea
                value={form.content}
                onValueChange={v => setForm({ ...form, content: v })}
                placeholder="Add context, specifics, or quotes..."
                rows={3}
              />
            </div>

            {/* Row 4: sentiment + linked meeting notice + actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label className="form-label" style={{ margin: 0 }}>Sentiment</label>
                <div style={{ display: "flex", gap: "4px" }}>
                  {SENTIMENTS.map(s => {
                    const cfg = SENTIMENT_CONFIG[s]
                    const active = form.sentiment === s
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm({ ...form, sentiment: s })}
                        style={{
                          padding: "3px 10px", borderRadius: "4px", fontSize: "var(--text-label)", fontWeight: 500,
                          cursor: "pointer", border: `1px solid ${active ? cfg.color + "60" : "var(--border-2)"}`,
                          background: active ? cfg.color + "15" : "var(--surf-2)", color: active ? cfg.color : "var(--text-3)",
                        }}
                      >{cfg.symbol} {cfg.label}</button>
                    )
                  })}
                </div>
                {linkedMeetingId && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "var(--text-caption)", color: "#60a5fa" }}>
                    <Link2 style={{ width: "11px", height: "11px" }} /> Linked to meeting
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button variant="outline" onClick={() => { setShowForm(false); setForm(emptyForm()); setLinkedMeetingId(undefined) }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!form.title.trim() || saving}>
                  {saving ? "Saving..." : "Save Evidence"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div style={{ padding: "12px 0", minHeight: "120px" }}>
        {entries.length === 0 && !showForm ? (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--text-3)", marginBottom: "12px" }}>
              No evidence logged yet. Start capturing achievements, feedback, and observations throughout the year.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus style={{ width: "14px", height: "14px" }} /> Add First Entry
            </Button>
          </div>
        ) : (
          entries.map(entry => {
            const cat = CATEGORY_COLORS[entry.category]
            const sent = entry.sentiment ? SENTIMENT_CONFIG[entry.sentiment] : null
            const isExpanded = expandedId === entry.id
            const isEditing = editingId === entry.id

            return (
              <div key={entry.id} style={{ borderBottom: "1px solid var(--border-1)", transition: "background 0.1s" }}>
                {/* Entry row */}
                <div
                  style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  onMouseEnter={e => (e.currentTarget.style.background = "#292929")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {isExpanded
                    ? <ChevronDown style={{ width: "12px", height: "12px", color: "var(--text-3)", flexShrink: 0 }} />
                    : <ChevronRight style={{ width: "12px", height: "12px", color: "var(--text-3)", flexShrink: 0 }} />}

                  {/* Category badge */}
                  <span style={{ padding: "2px 7px", borderRadius: "3px", fontSize: "var(--text-caption)", fontWeight: 600, background: cat.bg, color: cat.color, flexShrink: 0 }}>
                    {CATEGORY_LABELS[entry.category]}
                  </span>

                  {/* Title */}
                  <span style={{ flex: 1, fontSize: "var(--text-label)", color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.title}
                  </span>

                  {/* Sentiment */}
                  {sent && (
                    <span style={{ fontSize: "var(--text-caption)", color: sent.color, flexShrink: 0 }}>
                      {sent.symbol} {sent.label}
                    </span>
                  )}

                  {/* Date */}
                  <span style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", flexShrink: 0, minWidth: "90px", textAlign: "right" }}>
                    {formatDate(entry.occurredAt)}
                  </span>

                  {/* Meeting link indicator */}
                  {entry.meetingId && (
                    <span title={`Linked to meeting: ${entry.meetingTitle ?? entry.meetingId}`} style={{ color: "#60a5fa" }}>
                      <Link2 style={{ width: "12px", height: "12px" }} />
                    </span>
                  )}
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ padding: "12px 20px 16px 42px", borderTop: "1px solid var(--border-1)", background: "var(--surf-2)" }}>
                    {isEditing ? (
                      <div style={{ display: "grid", gap: "12px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: "12px" }}>
                          <div style={{ display: "grid", gap: "4px" }}>
                            <label className="form-label">Category</label>
                            <select
                              value={editForm.category}
                              onChange={e => setEditForm({ ...editForm, category: e.target.value as EvidenceCategory })}
                              style={{ background: "var(--surf)", border: "1px solid var(--border-2)", borderRadius: "6px", color: "var(--text-1)", padding: "6px 10px", fontSize: "var(--text-label)", cursor: "pointer" }}
                            >
                              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                            </select>
                          </div>
                          <div style={{ display: "grid", gap: "4px" }}>
                            <label className="form-label">Date</label>
                            <Input type="date" value={editForm.occurredAt} onChange={e => setEditForm({ ...editForm, occurredAt: e.target.value })} />
                          </div>
                        </div>
                        <div style={{ display: "grid", gap: "4px" }}>
                          <label className="form-label">Title</label>
                          <Input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                        </div>
                        <div style={{ display: "grid", gap: "4px" }}>
                          <label className="form-label">Notes</label>
                          <MarkdownTextarea value={editForm.content} onValueChange={v => setEditForm({ ...editForm, content: v })} rows={3} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                          <div style={{ display: "flex", gap: "4px" }}>
                            {SENTIMENTS.map(s => {
                              const cfg = SENTIMENT_CONFIG[s]
                              const active = editForm.sentiment === s
                              return (
                                <button key={s} type="button" onClick={() => setEditForm({ ...editForm, sentiment: s })}
                                  style={{ padding: "3px 10px", borderRadius: "4px", fontSize: "var(--text-label)", fontWeight: 500, cursor: "pointer", border: `1px solid ${active ? cfg.color + "60" : "var(--border-2)"}`, background: active ? cfg.color + "15" : "var(--surf-2)", color: active ? cfg.color : "var(--text-3)" }}>
                                  {cfg.symbol} {cfg.label}
                                </button>
                              )
                            })}
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                            <Button onClick={() => handleSaveEdit(entry.id)} disabled={saving}>
                              <Check style={{ width: "13px", height: "13px" }} /> Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {entry.content ? (
                          <p style={{ fontSize: "var(--text-label)", color: "var(--text-2)", whiteSpace: "pre-wrap", marginBottom: "12px" }}>{entry.content}</p>
                        ) : (
                          <p style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", fontStyle: "italic", marginBottom: "12px" }}>No additional notes.</p>
                        )}
                        {entry.meetingTitle && (
                          <p style={{ fontSize: "var(--text-caption)", color: "#60a5fa", marginBottom: "12px" }}>
                            <Link2 style={{ width: "11px", height: "11px", display: "inline", marginRight: "4px" }} />
                            Meeting: {entry.meetingTitle}
                          </p>
                        )}
                        <div style={{ display: "flex", gap: "8px" }}>
                          <Button variant="outline" onClick={() => handleStartEdit(entry)}>Edit</Button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={deletingId === entry.id}
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "4px", fontSize: "var(--text-label)", border: "1px solid #7f1d1d", background: "transparent", color: "#f87171", cursor: deletingId === entry.id ? "not-allowed" : "pointer", opacity: deletingId === entry.id ? 0.6 : 1 }}
                          >
                            <Trash2 style={{ width: "13px", height: "13px" }} />
                            {deletingId === entry.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Batch Import Modal */}
      <BatchEvidenceImportModal
        open={batchImportOpen}
        onOpenChange={setBatchImportOpen}
        people={batchPeople}
        contextPersonId={personId}
        contextPersonName={personName}
        onSaved={(count) => {
          // Refresh entries after batch save
          getEvidenceForPerson(personId).then(setEntries).catch(console.error)
        }}
      />
    </div>
  )
}
