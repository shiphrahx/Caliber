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
    getAllEvidence().then(setEntries).catch(console.error)
    getPeople().then(setPeople).catch(console.error)
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
    <div style={{ padding: "32px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1>Evidence Bank</h1>
          <p style={{ marginTop: "4px" }}>Continuous evidence log for performance reviews</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "linear-gradient(90deg, #00ffe5 0%, #00f058 100%)", border: "none", color: "#0a1a0a", padding: "6px 14px", borderRadius: "4px", fontSize: "var(--text-label)", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
        >
          <Plus style={{ width: "14px", height: "14px" }} /> Add Evidence
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Total Entries", value: totalEntries },
          { label: "This Month", value: entriesThisMonth },
          ...CATEGORIES.filter(c => categoryCounts[c]).map(c => ({
            label: CATEGORY_LABELS[c],
            value: categoryCounts[c] ?? 0,
            color: CATEGORY_COLORS[c].color,
          })),
        ].map((stat, i) => (
          <div key={i} style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "8px", padding: "16px 20px" }}>
            <span className="form-label" style={{ display: "block" }}>{stat.label}</span>
            <p style={{ fontSize: "24px", fontWeight: 700, color: ("color" in stat && stat.color) ? stat.color : "var(--text-1)", marginTop: "4px" }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick-add form */}
      {showForm && (
        <div style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "8px", padding: "20px 24px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2>New Evidence Entry</h2>
            <button onClick={() => { setShowForm(false); setForm(emptyForm()) }} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", padding: "4px" }}>
              <X style={{ width: "16px", height: "16px" }} />
            </button>
          </div>
          <div style={{ display: "grid", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 180px", gap: "12px" }}>
              <div style={{ display: "grid", gap: "4px" }}>
                <label className="form-label">Person *</label>
                <select
                  value={form.personId}
                  onChange={e => setForm({ ...form, personId: e.target.value })}
                  style={{ background: "var(--surf-2)", border: "1px solid var(--border-2)", borderRadius: "6px", color: form.personId ? "var(--text-1)" : "var(--text-3)", padding: "6px 10px", fontSize: "var(--text-label)", cursor: "pointer" }}
                >
                  <option value="">Select person...</option>
                  {people.filter(p => p.status === "active").map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gap: "4px" }}>
                <label className="form-label">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value as EvidenceCategory })}
                  style={{ background: "var(--surf-2)", border: "1px solid var(--border-2)", borderRadius: "6px", color: "var(--text-1)", padding: "6px 10px", fontSize: "var(--text-label)", cursor: "pointer" }}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gap: "4px" }}>
                <label className="form-label">Date</label>
                <Input type="date" value={form.occurredAt} onChange={e => setForm({ ...form, occurredAt: e.target.value })} />
              </div>
            </div>

            <div style={{ display: "grid", gap: "4px" }}>
              <label className="form-label">Title *</label>
              <Input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Brief description of the evidence..."
              />
            </div>

            <div style={{ display: "grid", gap: "4px" }}>
              <label className="form-label">Notes (optional)</label>
              <MarkdownTextarea value={form.content} onValueChange={v => setForm({ ...form, content: v })} placeholder="Add context, specifics, or quotes..." rows={3} />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label className="form-label" style={{ margin: 0 }}>Sentiment</label>
                <div style={{ display: "flex", gap: "4px" }}>
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
              <div style={{ display: "flex", gap: "8px" }}>
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
      <div style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "8px", padding: "16px 20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span className="form-label" style={{ margin: 0, flexShrink: 0 }}>Filter</span>

          <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)}
            style={{ background: "var(--surf-2)", border: "1px solid var(--border-2)", borderRadius: "6px", color: filterPerson ? "var(--text-1)" : "var(--text-3)", padding: "4px 8px", fontSize: "var(--text-label)", cursor: "pointer" }}>
            <option value="">All people</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value as EvidenceCategory | "")}
            style={{ background: "var(--surf-2)", border: "1px solid var(--border-2)", borderRadius: "6px", color: filterCategory ? "var(--text-1)" : "var(--text-3)", padding: "4px 8px", fontSize: "var(--text-label)", cursor: "pointer" }}>
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>

          <select value={filterSentiment} onChange={e => setFilterSentiment(e.target.value as EvidenceSentiment | "")}
            style={{ background: "var(--surf-2)", border: "1px solid var(--border-2)", borderRadius: "6px", color: filterSentiment ? "var(--text-1)" : "var(--text-3)", padding: "4px 8px", fontSize: "var(--text-label)", cursor: "pointer" }}>
            <option value="">All sentiments</option>
            {SENTIMENTS.map(s => <option key={s} value={s}>{SENTIMENT_CONFIG[s].label}</option>)}
          </select>

          <div style={{ width: "160px", flexShrink: 0 }}>
            <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          </div>
          <span style={{ color: "var(--text-3)", fontSize: "var(--text-caption)", flexShrink: 0 }}>to</span>
          <div style={{ width: "160px", flexShrink: 0 }}>
            <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
          </div>

          {activeFilters > 0 && (
            <button onClick={clearFilters} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: "var(--text-caption)" }}>
              <X style={{ width: "12px", height: "12px" }} /> Clear ({activeFilters})
            </button>
          )}
        </div>
      </div>

      {/* Evidence list */}
      <div style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "8px", overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--text-3)", marginBottom: "12px" }}>
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
            <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--border-1)", display: "flex", gap: "12px" }}>
              <span className="col-header" style={{ flex: "0 0 160px" }}>Category</span>
              <span className="col-header" style={{ flex: "0 0 160px" }}>Person</span>
              <span className="col-header" style={{ flex: 1 }}>Evidence</span>
              <span className="col-header" style={{ flex: "0 0 90px" }}>Sentiment</span>
              <span className="col-header" style={{ flex: "0 0 100px", textAlign: "right" }}>Date</span>
              <span className="col-header" style={{ flex: "0 0 60px" }}></span>
            </div>
            {filtered.map(entry => {
              const cat = CATEGORY_COLORS[entry.category]
              const sent = entry.sentiment ? SENTIMENT_CONFIG[entry.sentiment] : null
              return (
                <div key={entry.id}
                  style={{ padding: "10px 20px", borderBottom: "1px solid var(--border-1)", display: "flex", gap: "12px", alignItems: "center" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#292929")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ flex: "0 0 160px" }}>
                    <span style={{ padding: "2px 7px", borderRadius: "3px", fontSize: "var(--text-caption)", fontWeight: 600, background: cat.bg, color: cat.color }}>
                      {CATEGORY_LABELS[entry.category]}
                    </span>
                  </div>
                  <div style={{ flex: "0 0 160px" }}>
                    {entry.personName ? (
                      <a href={`/people/${entry.personId}`} style={{ fontSize: "var(--text-label)", color: "var(--text-2)", textDecoration: "none" }}
                        onMouseEnter={e => ((e.target as HTMLElement).style.color = "var(--text-1)")}
                        onMouseLeave={e => ((e.target as HTMLElement).style.color = "var(--text-2)")}
                      >{entry.personName}</a>
                    ) : (
                      <span style={{ fontSize: "var(--text-caption)", color: "var(--text-3)" }}>{personMap[entry.personId] ?? "Unknown"}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <p style={{ fontSize: "var(--text-label)", color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: entry.content ? "2px" : 0 }}>{entry.title}</p>
                    {entry.content && (
                      <p style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.content}</p>
                    )}
                  </div>
                  <div style={{ flex: "0 0 90px" }}>
                    {sent && (
                      <span style={{ fontSize: "var(--text-caption)", color: sent.color }}>{sent.symbol} {sent.label}</span>
                    )}
                  </div>
                  <div style={{ flex: "0 0 100px", textAlign: "right" }}>
                    <span style={{ fontSize: "var(--text-caption)", color: "var(--text-3)" }}>{formatDate(entry.occurredAt)}</span>
                  </div>
                  <div style={{ flex: "0 0 60px", display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={() => handleDelete(entry.id)} disabled={deletingId === entry.id}
                      style={{ background: "none", border: "none", color: "var(--text-3)", cursor: deletingId === entry.id ? "not-allowed" : "pointer", padding: "4px", borderRadius: "4px", opacity: deletingId === entry.id ? 0.5 : 1 }}
                      title="Delete entry"
                    >
                      <X style={{ width: "14px", height: "14px" }} />
                    </button>
                  </div>
                </div>
              )
            })}
            <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border-1)" }}>
              <span style={{ fontSize: "var(--text-caption)", color: "var(--text-3)" }}>
                Showing {filtered.length} of {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
