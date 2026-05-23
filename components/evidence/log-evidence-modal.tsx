"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MarkdownTextarea } from "@/components/ui/markdown-textarea"
import { Link2 } from "lucide-react"
import { createEvidence, type EvidenceCategory, type EvidenceSentiment } from "@/lib/services/evidence"
import { useAIConfig } from "@/lib/hooks/use-ai-config"
import { callAI } from "@/lib/services/ai"
import { EVIDENCE_CATEGORISATION_SYSTEM } from "@/lib/ai/prompts"

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

const SENTIMENT_CONFIG = {
  positive: { label: "Positive", color: "#4ade80", symbol: "↑" },
  neutral:  { label: "Neutral",  color: "#9ca3af", symbol: "–" },
  negative: { label: "Negative", color: "#f87171", symbol: "↓" },
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as EvidenceCategory[]
const SENTIMENTS: EvidenceSentiment[] = ["positive", "neutral", "negative"]

interface LogEvidenceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meetingId: string
  meetingTitle: string
  meetingDate: string
  personId: string
  personName?: string | null
  /** Used when personId belongs to a 1:1. For Other meetings, show selector. */
  availablePeople: Array<{ id: string; name: string }>
}

export function LogEvidenceModal({
  open,
  onOpenChange,
  meetingId,
  meetingTitle,
  meetingDate,
  personId,
  personName,
  availablePeople,
}: LogEvidenceModalProps) {
  const [category, setCategory] = useState<EvidenceCategory>("general")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [occurredAt, setOccurredAt] = useState(meetingDate)
  const [sentiment, setSentiment] = useState<EvidenceSentiment>("neutral")
  const [resolvedPersonId, setResolvedPersonId] = useState(personId)
  const [saving, setSaving] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const aiConfig = useAIConfig()

  useEffect(() => {
    if (open) {
      setTitle("")
      setContent("")
      setCategory("general")
      setSentiment("neutral")
      setOccurredAt(meetingDate)
      setResolvedPersonId(personId)
    }
  }, [open, meetingDate, personId])

  const handleSuggestCategory = async () => {
    if (!title.trim()) return
    setSuggesting(true)
    try {
      const result = await callAI({
        systemPrompt: EVIDENCE_CATEGORISATION_SYSTEM,
        userPrompt: `Title: ${title}\nNotes: ${content}`,
        maxTokens: 80,
        temperature: 0,
      })
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.category && CATEGORIES.includes(parsed.category as EvidenceCategory)) {
          setCategory(parsed.category as EvidenceCategory)
        }
        if (parsed.sentiment && SENTIMENTS.includes(parsed.sentiment as EvidenceSentiment)) {
          setSentiment(parsed.sentiment as EvidenceSentiment)
        }
      }
    } catch {
      // silent — AI suggestion is non-critical
    } finally {
      setSuggesting(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim() || !resolvedPersonId) return
    setSaving(true)
    try {
      await createEvidence({
        personId: resolvedPersonId,
        category,
        title: title.trim(),
        content: content.trim() || null,
        occurredAt,
        meetingId,
        taskId: null,
        sentiment,
        includedInReview: true,
        reviewPeriodStart: null,
        reviewPeriodEnd: null,
      })
      onOpenChange(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: "520px" }}>
        <DialogHeader>
          <DialogTitle>Log as Evidence</DialogTitle>
          <DialogDescription>
            Save evidence from this meeting to the Evidence Bank.
          </DialogDescription>
        </DialogHeader>

        {/* Linked meeting indicator */}
        <div className="log-evidence-meeting-link">
          <Link2 />
          {meetingTitle} · {new Date(meetingDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </div>

        <div className="log-evidence-grid">
          {/* Person selector — shown if no pre-resolved person */}
          {!personId && (
            <div className="log-evidence-person-field">
              <label className="form-label">Person *</label>
              <select
                value={resolvedPersonId}
                onChange={e => setResolvedPersonId(e.target.value)}
                className="evidence-form-select"
                style={{ color: resolvedPersonId ? "var(--text-1)" : "var(--text-3)" }}
              >
                <option value="">Select person...</option>
                {availablePeople.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {personName && (
            <p className="log-evidence-person-hint">
              Evidence will be logged for <strong style={{ color: "var(--text-1)" }}>{personName}</strong>
            </p>
          )}

          <div className="log-evidence-row-2col">
            <div className="log-evidence-field">
              <div className="log-evidence-cat-row">
                <label className="form-label" style={{ margin: 0 }}>Category</label>
                {aiConfig.configured && title.trim().length >= 10 && (
                  <button
                    type="button"
                    onClick={handleSuggestCategory}
                    disabled={suggesting}
                    className={`log-evidence-suggest-btn ${suggesting ? "log-evidence-suggest-btn--loading" : "log-evidence-suggest-btn--active"}`}
                  >
                    {suggesting ? "Suggesting…" : "✦ Suggest"}
                  </button>
                )}
              </div>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as EvidenceCategory)}
                className="evidence-form-select"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div className="log-evidence-field">
              <label className="form-label">Date</label>
              <Input type="date" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} />
            </div>
          </div>

          <div className="log-evidence-field">
            <label className="form-label">Title *</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Brief description of the evidence..."
              autoFocus
            />
          </div>

          <div className="log-evidence-field">
            <label className="form-label">Notes (optional)</label>
            <MarkdownTextarea value={content} onValueChange={setContent} placeholder="Add context or specifics..." rows={3} />
          </div>

          <div className="log-evidence-sentiment-row">
            <label className="form-label" style={{ margin: 0 }}>Sentiment</label>
            {SENTIMENTS.map(s => {
              const cfg = SENTIMENT_CONFIG[s]
              const active = sentiment === s
              return (
                <button key={s} type="button" onClick={() => setSentiment(s)}
                  style={{ padding: "3px 10px", borderRadius: "4px", fontSize: "var(--text-label)", fontWeight: 500, cursor: "pointer", border: `1px solid ${active ? cfg.color + "60" : "var(--border-2)"}`, background: active ? cfg.color + "15" : "var(--surf-2)", color: active ? cfg.color : "var(--text-3)" }}>
                  {cfg.symbol} {cfg.label}
                </button>
              )
            })}
          </div>

          <div className="log-evidence-footer">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!title.trim() || (!personId && !resolvedPersonId) || saving}>
              {saving ? "Saving..." : "Save Evidence"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
