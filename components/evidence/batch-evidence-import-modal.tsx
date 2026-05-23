"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { AlertCircle, Loader2, Upload, CheckSquare, Square } from "lucide-react"
import { toast } from "sonner"
import { callAI, handleAIError } from "@/lib/services/ai"
import {
  BATCH_EVIDENCE_EXTRACTION_SYSTEM,
  buildBatchEvidencePrompt,
  type BatchExtractedEvidence,
} from "@/lib/ai/prompts"
import { createEvidence, type EvidenceCategory, type EvidenceSentiment } from "@/lib/services/evidence"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Person {
  id: string
  name: string
}

export interface BatchEvidenceImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  people: Person[]
  /** If provided, pre-fill context person for the extract prompt */
  contextPersonId?: string
  contextPersonName?: string
  /** Called after entries are saved */
  onSaved?: (count: number) => void
}

// Editable row extends the extracted entry with a personId (resolved) and a selected flag
interface PreviewRow extends BatchExtractedEvidence {
  _key: string
  selected: boolean
  personId: string | null   // resolved from personName
  ambiguous: boolean        // could not resolve personName to exactly one person
}

const CATEGORY_OPTIONS: EvidenceCategory[] = [
  'achievement', 'feedback_given', 'feedback_received', 'concern', 'growth',
  'delivery', 'behaviour', 'promotion_evidence', 'general',
]
const CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  achievement:        'Achievement',
  feedback_given:     'Feedback Given',
  feedback_received:  'Feedback Received',
  concern:            'Concern',
  growth:             'Growth',
  delivery:           'Delivery',
  behaviour:          'Behaviour',
  promotion_evidence: 'Promotion Evidence',
  general:            'General',
}
const SENTIMENT_LABELS: Record<EvidenceSentiment, string> = {
  positive: 'Positive ↑',
  neutral:  'Neutral –',
  negative: 'Negative ↓',
}
const SENTINEL_COLORS: Record<EvidenceSentiment, string> = {
  positive: '#4ade80',
  neutral:  '#9ca3af',
  negative: '#f87171',
}

function resolvePersonId(personName: string | null, people: Person[]): { id: string | null; ambiguous: boolean } {
  if (!personName) return { id: null, ambiguous: false }
  const exact = people.find(p => p.name.toLowerCase() === personName.toLowerCase())
  if (exact) return { id: exact.id, ambiguous: false }
  const partial = people.filter(p => p.name.toLowerCase().includes(personName.toLowerCase()))
  if (partial.length === 1) return { id: partial[0].id, ambiguous: false }
  return { id: null, ambiguous: true }
}

const MAX_TEXT_LENGTH = 3000

// ─── Modal ────────────────────────────────────────────────────────────────────

export function BatchEvidenceImportModal({
  open,
  onOpenChange,
  people,
  contextPersonId,
  contextPersonName,
  onSaved,
}: BatchEvidenceImportModalProps) {
  const [step, setStep] = useState<'input' | 'preview'>('input')
  const [text, setText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleClose = () => {
    onOpenChange(false)
    // Reset after animation
    setTimeout(() => {
      setStep('input')
      setText('')
      setRows([])
      setError(null)
    }, 200)
  }

  const handleExtract = useCallback(async () => {
    if (!text.trim()) { setError('Paste some text to extract evidence from.'); return }
    setError(null)
    setExtracting(true)

    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await callAI({
        systemPrompt: BATCH_EVIDENCE_EXTRACTION_SYSTEM,
        userPrompt: buildBatchEvidencePrompt({
          text: text.slice(0, MAX_TEXT_LENGTH),
          people,
          today,
          contextPersonName: contextPersonName,
        }),
        maxTokens: 1500,
        temperature: 0.2,
        preferFast: false,
      })

      // Parse JSON array from response
      let extracted: BatchExtractedEvidence[] = []
      try {
        const match = res.content.match(/\[[\s\S]*\]/)
        if (!match) throw new Error('No JSON array in response')
        extracted = JSON.parse(match[0])
      } catch {
        setError('Could not parse AI response. Try again or rephrase your text.')
        return
      }

      if (!Array.isArray(extracted) || extracted.length === 0) {
        setError('No extractable evidence found in the pasted text. Try including more specific observations.')
        return
      }

      const previewRows: PreviewRow[] = extracted.map((e, i) => {
        // If contextPersonId is set and no explicit personName, default to context person
        const resolvedName = e.personName ?? contextPersonName ?? null
        const { id, ambiguous } = resolvePersonId(resolvedName, people)
        return {
          ...e,
          personName: resolvedName,
          _key: `${i}-${Date.now()}`,
          selected: true,
          personId: contextPersonId && !e.personName ? contextPersonId : id,
          ambiguous: contextPersonId && !e.personName ? false : ambiguous,
        }
      })

      setRows(previewRows)
      setStep('preview')
    } catch (err) {
      handleAIError(err)
    } finally {
      setExtracting(false)
    }
  }, [text, people, contextPersonName, contextPersonId])

  const handleSave = useCallback(async () => {
    const toSave = rows.filter(r => r.selected && r.personId)
    if (toSave.length === 0) {
      toast.info('No entries selected to save.')
      return
    }
    setSaving(true)
    let saved = 0
    try {
      for (const row of toSave) {
        await createEvidence({
          personId: row.personId!,
          category: (row.category as EvidenceCategory) ?? 'general',
          title: row.title,
          content: row.content ?? null,
          occurredAt: row.occurredAt,
          sentiment: (row.sentiment as EvidenceSentiment) ?? 'neutral',
          includedInReview: true,
        })
        saved++
      }
      toast.success(`Saved ${saved} evidence entr${saved === 1 ? 'y' : 'ies'}.`)
      onSaved?.(saved)
      handleClose()
    } catch (err) {
      toast.error('Failed to save some entries. Please try again.')
      console.error('[batch-evidence] save error:', err)
    } finally {
      setSaving(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, onSaved])

  const updateRow = (key: string, patch: Partial<PreviewRow>) => {
    setRows(prev => prev.map(r => r._key === key ? { ...r, ...patch } : r))
  }

  const toggleAll = (selected: boolean) => {
    setRows(prev => prev.map(r => ({ ...r, selected })))
  }

  const selectedCount = rows.filter(r => r.selected).length
  const saveable = rows.filter(r => r.selected && r.personId).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Import Evidence from Text</DialogTitle>
          <DialogDescription>
            Paste a Slack thread, email, doc excerpt, or meeting notes. AI will extract individual evidence entries.
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <>
            <div className="batch-input-area">
              <div>
                <Label htmlFor="paste-input" className="batch-label-row">
                  <span>Text to extract from</span>
                  <span className={`batch-char-count ${text.length > MAX_TEXT_LENGTH ? "batch-char-count--over" : "batch-char-count--ok"}`}>
                    {text.length}/{MAX_TEXT_LENGTH}
                  </span>
                </Label>
                <Textarea
                  id="paste-input"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Paste Slack messages, email content, performance notes, or any text containing observations about your team..."
                  rows={10}
                  className="batch-textarea"
                />
              </div>

              {contextPersonName && (
                <p className="batch-context-hint">
                  Context: entries will be attributed to <strong style={{ color: "var(--text-2)" }}>{contextPersonName}</strong> unless another name is found.
                </p>
              )}

              {error && (
                <div className="batch-extract-error">
                  <AlertCircle size={13} /> {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleExtract} disabled={extracting || !text.trim()}>
                {extracting
                  ? <><Loader2 size={13} style={{ marginRight: 6, animation: "spin 1s linear infinite" }} /> Extracting…</>
                  : <><Upload size={13} style={{ marginRight: 6 }} /> Extract Evidence</>
                }
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="batch-preview-area">
              {/* Toolbar */}
              <div className="batch-toolbar">
                <div className="batch-toolbar-btns">
                  <button type="button" onClick={() => toggleAll(true)} className="batch-toolbar-btn">Select all</button>
                  <button type="button" onClick={() => toggleAll(false)} className="batch-toolbar-btn">Deselect all</button>
                </div>
                <span className="batch-toolbar-count">{selectedCount} selected · {saveable} will save</span>
              </div>

              {/* Preview table */}
              <div className="batch-table">
                {rows.length === 0 ? (
                  <div className="batch-empty">No evidence entries extracted.</div>
                ) : rows.map((row) => (
                  <div
                    key={row._key}
                    className="batch-row"
                    style={{
                      background: row.selected ? "var(--surf)" : "var(--surf-2)",
                      opacity: row.selected ? 1 : 0.5,
                    }}
                  >
                    <div className="batch-row-inner">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => updateRow(row._key, { selected: !row.selected })}
                        className="batch-row-checkbox"
                        style={{ color: row.selected ? "#00f058" : "var(--text-3)" }}
                      >
                        {row.selected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>

                      <div className="batch-row-fields">
                        {/* Title */}
                        <Input
                          value={row.title}
                          onChange={e => updateRow(row._key, { title: e.target.value })}
                          style={{ fontSize: "var(--text-label)", fontWeight: 600 }}
                          placeholder="Title"
                        />

                        {/* Row 2: category, sentiment, date, person */}
                        <div className="batch-row-grid">
                          {/* Category */}
                          <Select
                            value={row.category ?? 'general'}
                            onValueChange={val => updateRow(row._key, { category: val as EvidenceCategory })}
                          >
                            <SelectTrigger style={{ fontSize: "var(--text-caption)" }}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map(c => (
                                <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Sentiment */}
                          <Select
                            value={row.sentiment ?? 'neutral'}
                            onValueChange={val => updateRow(row._key, { sentiment: val as EvidenceSentiment })}
                          >
                            <SelectTrigger style={{ fontSize: "var(--text-caption)", color: SENTINEL_COLORS[(row.sentiment as EvidenceSentiment) ?? 'neutral'] }}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(['positive', 'neutral', 'negative'] as EvidenceSentiment[]).map(s => (
                                <SelectItem key={s} value={s} style={{ color: SENTINEL_COLORS[s] }}>
                                  {SENTIMENT_LABELS[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Date */}
                          <Input
                            type="date"
                            value={row.occurredAt}
                            onChange={e => updateRow(row._key, { occurredAt: e.target.value })}
                            style={{ fontSize: "var(--text-caption)" }}
                          />

                          {/* Person */}
                          <Select
                            value={row.personId ?? '__ambiguous__'}
                            onValueChange={val => updateRow(row._key, { personId: val === '__ambiguous__' ? null : val, ambiguous: false })}
                          >
                            <SelectTrigger
                              style={{
                                fontSize: "var(--text-caption)",
                                borderColor: row.ambiguous || (!row.personId && row.selected) ? "#f8717160" : undefined,
                              }}
                            >
                              <SelectValue placeholder={row.ambiguous ? "⚠ Ambiguous — pick person" : "Select person"} />
                            </SelectTrigger>
                            <SelectContent>
                              {people.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Ambiguity warning */}
                        {row.ambiguous && (
                          <p className="batch-row-warn">
                            ⚠ Could not match &ldquo;{row.personName}&rdquo; — please select a person manually.
                          </p>
                        )}

                        {/* Missing person warning */}
                        {!row.personId && !row.ambiguous && row.selected && (
                          <p className="batch-row-err">Person required — this entry will not be saved.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('input')}>← Back</Button>
              <Button onClick={handleSave} disabled={saving || saveable === 0}>
                {saving
                  ? <><Loader2 size={13} style={{ marginRight: 6, animation: "spin 1s linear infinite" }} /> Saving…</>
                  : `Save ${saveable} entr${saveable === 1 ? 'y' : 'ies'}`
                }
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
