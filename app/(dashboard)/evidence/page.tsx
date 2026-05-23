"use client"

import { useState, useEffect, useMemo } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MarkdownTextarea } from "@/components/ui/markdown-textarea"
import {
  getAllEvidence,
  createEvidence,
  deleteEvidence,
  type EvidenceEntry,
  type EvidenceCategory,
  type EvidenceSentiment,
} from "@/lib/services/evidence"
import { getPeople, type Person } from "@/lib/services/people"
import { toast } from "sonner"

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

const CATEGORIES = Object.keys(CATEGORY_LABELS) as EvidenceCategory[]
const SENTIMENTS: EvidenceSentiment[] = ["positive", "neutral", "negative"]

interface EvidenceFormState {
  personId: string
  category: EvidenceCategory
  title: string
  content: string
  occurredAt: string
  sentiment: EvidenceSentiment
}

const emptyForm = (): EvidenceFormState => ({
  personId: "",
  category: "general",
  title: "",
  content: "",
  occurredAt: new Date().toISOString().split("T")[0],
  sentiment: "neutral",
})

const thisMonth = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
}

export default function EvidencePage() {
  const [entries, setEntries] = useState<EvidenceEntry[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<EvidenceFormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Filters
  const [filterPerson, setFilterPerson] = useState("")
  const [filterCategory, setFilterCategory] = useState<EvidenceCategory | "">("")
  const [filterSentiment, setFilterSentiment] = useState<EvidenceSentiment | "">("")
  const [filterFrom, setFilterFrom] = useState("")
  const [filterTo, setFilterTo] = useState("")

  useEffect(() => {
    getAllEvidence().then(setEntries).catch(err => { console.error(err); toast.error('Failed to load evidence') })
    getPeople().then(setPeople).catch(err => { console.error(err); toast.error('Failed to load people') })
  }, [])

  // Stats
  const totalEntries = entries.length
  const entriesThisMonth = useMemo(() => {
    const month = thisMonth()
    return entries.filter(e => e.occurredAt >= month).length
  }, [entries])

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<EvidenceCategory, number>> = {}
    entries.forEach(e => { counts[e.category] = (counts[e.category] ?? 0) + 1 })
    return counts
  }, [entries])

  // Filtered list
  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (filterPerson && e.personId !== filterPerson) return false
      if (filterCategory && e.category !== filterCategory) return false
      if (filterSentiment && e.sentiment !== filterSentiment) return false
      if (filterFrom && e.occurredAt < filterFrom) return false
      if (filterTo && e.occurredAt > filterTo) return false
      return true
    })
  }, [entries, filterPerson, filterCategory, filterSentiment, filterFrom, filterTo])

  const activeFilters = [filterPerson, filterCategory, filterSentiment, filterFrom, filterTo].filter(Boolean).length

  const clearFilters = () => {
    setFilterPerson("")
    setFilterCategory("")
    setFilterSentiment("")
    setFilterFrom("")
    setFilterTo("")
  }

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.personId) return
    setSaving(true)
    try {
      const created = await createEvidence({
        personId: form.personId,
        category: form.category,
        title: form.title.trim(),
        content: form.content.trim() || null,
        occurredAt: form.occurredAt,
        sentiment: form.sentiment,
        meetingId: null,
        taskId: null,
        includedInReview: true,
        reviewPeriodStart: null,
        reviewPeriodEnd: null,
      })
      setEntries([created, ...entries])
      setForm(emptyForm())
      setShowForm(false)
    } catch (err) {
      console.error(err)
      toast.error('Failed to save evidence')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteEvidence(id)
      setEntries(entries.filter(e => e.id !== id))
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete evidence')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

  const personMap = useMemo(() => {
    const m: Record<string, string> = {}
    people.forEach(p => { m[p.id] = p.name })
    return m
  }, [people])

  return (
    <>
      <div className="page-topbar">
        <span className="page-topbar-title">Evidence Bank</span>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus style={{ width: "13px", height: "13px" }} /> Add Evidence
        </button>
      </div>
      <div className="page-content">

        {/* Stats bar */}
        <div className="ev-stats-grid">
          {[
            { label: "Total Entries", value: totalEntries },
            { label: "This Month", value: entriesThisMonth },
            ...CATEGORIES.filter(c => categoryCounts[c]).map(c => ({
              label: CATEGORY_LABELS[c],
              value: categoryCounts[c] ?? 0,
              color: CATEGORY_COLORS[c].color,
            })),
          ].map((stat, i) => (
            <div key={i} className="ev-stat-card">
              <span className="form-label" style={{ display: "block" }}>{stat.label}</span>
              <p className="ev-stat-value" style={{ color: ("color" in stat && stat.color) ? stat.color : "var(--text-1)" }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick-add form */}
        {showForm && (
          <div className="ev-form-card">
            <div className="ev-form-header">
              <h2>New Evidence Entry</h2>
              <button className="ev-form-close-btn" onClick={() => { setShowForm(false); setForm(emptyForm()) }}>
                <X />
              </button>
            </div>
            <div className="ev-form-grid">
              <div className="ev-form-row-3">
                <div className="ev-form-field">
                  <label className="form-label">Person *</label>
                  <select
                    value={form.personId}
                    onChange={e => setForm({ ...form, personId: e.target.value })}
                    className="ev-form-select"
                    style={{ color: form.personId ? "var(--text-1)" : "var(--text-3)" }}
                  >
                    <option value="">Select person...</option>
                    {people.filter(p => p.status === "active").map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="ev-form-field">
                  <label className="form-label">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value as EvidenceCategory })}
                    className="ev-form-select"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div className="ev-form-field">
                  <label className="form-label">Date</label>
                  <Input type="date" value={form.occurredAt} onChange={e => setForm({ ...form, occurredAt: e.target.value })} />
                </div>
              </div>

              <div className="ev-form-field">
                <label className="form-label">Title *</label>
                <Input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Brief description of the evidence..."
                />
              </div>

              <div className="ev-form-field">
                <label className="form-label">Notes (optional)</label>
                <MarkdownTextarea value={form.content} onValueChange={v => setForm({ ...form, content: v })} placeholder="Add context, specifics, or quotes..." rows={3} />
              </div>

              <div className="ev-form-footer">
                <div className="ev-form-sentiment-row">
                  <label className="form-label" style={{ margin: 0 }}>Sentiment</label>
                  <div className="ev-form-sentiment-btns">
                    {SENTIMENTS.map(s => {
                      const cfg = SENTIMENT_CONFIG[s]
                      const active = form.sentiment === s
                      return (
                        <button key={s} type="button" onClick={() => setForm({ ...form, sentiment: s })}
                          style={{ padding: "3px 10px", borderRadius: "4px", fontSize: "var(--text-label)", fontWeight: 500, cursor: "pointer", border: `1px solid ${active ? cfg.color + "60" : "var(--border-2)"}`, background: active ? cfg.color + "15" : "var(--surf-2)", color: active ? cfg.color : "var(--text-3)" }}>
                          {cfg.symbol} {cfg.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="ev-form-actions">
                  <Button variant="outline" onClick={() => { setShowForm(false); setForm(emptyForm()) }}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={!form.title.trim() || !form.personId || saving}>
                    {saving ? "Saving..." : "Save Evidence"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="ev-filter-card">
          <div className="ev-filter-row">
            <span className="form-label ev-filter-label">Filter</span>

            <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)}
              className="ev-filter-select"
              style={{ color: filterPerson ? "var(--text-1)" : "var(--text-3)" }}>
              <option value="">All people</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value as EvidenceCategory | "")}
              className="ev-filter-select"
              style={{ color: filterCategory ? "var(--text-1)" : "var(--text-3)" }}>
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>

            <select value={filterSentiment} onChange={e => setFilterSentiment(e.target.value as EvidenceSentiment | "")}
              className="ev-filter-select"
              style={{ color: filterSentiment ? "var(--text-1)" : "var(--text-3)" }}>
              <option value="">All sentiments</option>
              {SENTIMENTS.map(s => <option key={s} value={s}>{SENTIMENT_CONFIG[s].label}</option>)}
            </select>

            <div className="ev-filter-date-wrap">
              <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
            </div>
            <span className="ev-filter-sep">to</span>
            <div className="ev-filter-date-wrap">
              <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
            </div>

            {activeFilters > 0 && (
              <button onClick={clearFilters} className="ev-filter-clear-btn">
                <X /> Clear ({activeFilters})
              </button>
            )}
          </div>
        </div>

        {/* Evidence list */}
        <div className="ev-list-card">
          {filtered.length === 0 ? (
            <div className="ev-list-empty">
              <p className="ev-list-empty-text">
                {activeFilters > 0 ? "No entries match the current filters." : "No evidence logged yet. Start capturing achievements and observations."}
              </p>
              {activeFilters === 0 && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus style={{ width: "14px", height: "14px" }} /> Add First Entry
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="ev-list-header-row">
                <span className="col-header ev-list-col-category">Category</span>
                <span className="col-header ev-list-col-person">Person</span>
                <span className="col-header ev-list-col-evidence">Evidence</span>
                <span className="col-header ev-list-col-sentiment">Sentiment</span>
                <span className="col-header ev-list-col-date">Date</span>
                <span className="col-header ev-list-col-actions"></span>
              </div>
              {filtered.map(entry => {
                const cat = CATEGORY_COLORS[entry.category]
                const sent = entry.sentiment ? SENTIMENT_CONFIG[entry.sentiment] : null
                return (
                  <div key={entry.id} className="ev-list-row">
                    <div className="ev-list-col-category">
                      <span className="ev-cat-badge" style={{ background: cat.bg, color: cat.color }}>
                        {CATEGORY_LABELS[entry.category]}
                      </span>
                    </div>
                    <div className="ev-list-col-person">
                      {entry.personName ? (
                        <a href={`/people/${entry.personId}`} className="ev-person-link">{entry.personName}</a>
                      ) : (
                        <span className="ev-person-unknown">{personMap[entry.personId] ?? "Unknown"}</span>
                      )}
                    </div>
                    <div className="ev-entry-col">
                      <p className="ev-entry-title" style={{ marginBottom: entry.content ? "2px" : 0 }}>{entry.title}</p>
                      {entry.content && (
                        <p className="ev-entry-content">{entry.content}</p>
                      )}
                    </div>
                    <div className="ev-list-col-sentiment">
                      {sent && (
                        <span className="ev-sentiment" style={{ color: sent.color }}>{sent.symbol} {sent.label}</span>
                      )}
                    </div>
                    <div className="ev-list-col-date">
                      <span className="ev-date">{formatDate(entry.occurredAt)}</span>
                    </div>
                    <div className="ev-list-col-actions" style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button onClick={() => handleDelete(entry.id)} disabled={deletingId === entry.id}
                        className="ev-delete-btn"
                        title="Delete entry"
                      >
                        <X />
                      </button>
                    </div>
                  </div>
                )
              })}
              <div className="ev-footer">
                <span className="ev-footer-text">
                  Showing {filtered.length} of {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
