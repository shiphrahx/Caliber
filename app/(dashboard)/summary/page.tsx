'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, Copy, Download, FileText,
  RefreshCw, ChevronDown, ChevronRight as ChevronRt, AlertCircle,
} from 'lucide-react'
import {
  getMondayOfWeek,
  formatWeekRange,
  addDays,
  getWeeklyReview,
  saveSummaryMarkdown,
  saveEditedSummary,
} from '@/lib/services/weekly-review'
import { useWeeklySummaryData } from '@/lib/hooks/use-weekly-summary-data'
import { generateSummaryMarkdown, stripMarkdown } from '@/lib/summary/template'
import { AIButton } from '@/components/ui/ai-button'
import { useAIConfig } from '@/lib/hooks/use-ai-config'
import { callAI, handleAIError } from '@/lib/services/ai'
import { SUMMARY_REWRITE_PROMPTS, SUMMARY_REWRITE_LABELS } from '@/lib/ai/prompts'
import { toast } from 'sonner'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtShort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function priorityColor(p: string): string {
  if (p === 'Very High') return '#ff6b6b'
  if (p === 'High') return '#ffa94d'
  if (p === 'Medium') return '#ffd43b'
  return 'var(--text-3)'
}

// ── Data Preview Section ──────────────────────────────────────────────────────

function PreviewSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  if (count === 0) return null
  return (
    <div className="sum-preview-section">
      <button onClick={() => setOpen(o => !o)} className="sum-preview-toggle">
        <span className="sum-preview-toggle-title">{title}</span>
        <div className="sum-preview-toggle-right">
          <span className="sum-preview-toggle-count">{count}</span>
          <span className="sum-preview-toggle-icon">
            {open
              ? <ChevronDown style={{ width: '11px', height: '11px', color: 'var(--text-3)' }} />
              : <ChevronRt style={{ width: '11px', height: '11px', color: 'var(--text-3)' }} />
            }
          </span>
        </div>
      </button>
      {open && <div className="sum-preview-body">{children}</div>}
    </div>
  )
}

function PreviewItem({ children }: { children: React.ReactNode }) {
  return <div className="sum-preview-item">{children}</div>
}

// ── Export button ─────────────────────────────────────────────────────────────

function ExportBtn({
  label, icon, onClick, primary = false,
}: { label: string; icon: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`sum-export-btn ${primary ? 'sum-export-btn--primary' : 'sum-export-btn--secondary'}`}
    >
      {icon} {label}
    </button>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SummaryPage() {
  const searchParams = useSearchParams()
  const weekParam = searchParams.get('week')
  const [weekStart, setWeekStart] = useState(() => weekParam ?? getMondayOfWeek())
  const [content, setContent] = useState('')
  const [isEdited, setIsEdited] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'copiedPlain'>('idle')
  const [regenerating, setRegenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rewriting, setRewriting] = useState(false)
  const [showRewriteMenu, setShowRewriteMenu] = useState(false)
  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRegenerate = useRef(false)
  const aiConfig = useAIConfig()

  const { data, loading, error, refetch } = useWeeklySummaryData(weekStart)

  useEffect(() => {
    setContent('')
    setIsEdited(false)
    setGeneratedAt(null)
    getWeeklyReview(weekStart).then(review => {
      if (review?.editedSummary) {
        setContent(review.editedSummary)
        setIsEdited(true)
        setGeneratedAt(review.summaryGeneratedAt)
      } else if (review?.summaryMarkdown) {
        setContent(review.summaryMarkdown)
        setIsEdited(false)
        setGeneratedAt(review.summaryGeneratedAt)
      }
    })
  }, [weekStart])

  useEffect(() => {
    if (!data || loading) return
    if (!pendingRegenerate.current && content) return
    pendingRegenerate.current = false
    const md = generateSummaryMarkdown(data)
    setContent(md)
    setIsEdited(false)
    saveSummaryMarkdown(weekStart, md).then(r => setGeneratedAt(r.summaryGeneratedAt))
  }, [data, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleContentChange = useCallback((val: string) => {
    setContent(val)
    setIsEdited(true)
    if (saveDebounce.current) clearTimeout(saveDebounce.current)
    saveDebounce.current = setTimeout(async () => {
      setSaving(true)
      await saveEditedSummary(weekStart, val).catch(console.error)
      setSaving(false)
    }, 1000)
  }, [weekStart])

  const handleRegenerate = async () => {
    if (isEdited) {
      if (!confirm('This will overwrite your edits with fresh data. Continue?')) return
    }
    setRegenerating(true)
    pendingRegenerate.current = true
    try {
      await refetch()
    } finally {
      setRegenerating(false)
    }
  }

  const handleRewrite = async (format: string) => {
    if (!content.trim()) { toast.error('No summary content to rewrite.'); return }
    setShowRewriteMenu(false)
    setRewriting(true)
    try {
      const systemPrompt = format === 'custom'
        ? (prompt('Enter your rewrite instructions:') ?? '')
        : SUMMARY_REWRITE_PROMPTS[format]
      if (!systemPrompt) { setRewriting(false); return }
      const result = await callAI({
        systemPrompt,
        userPrompt: content,
        maxTokens: 800,
        temperature: 0.4,
      })
      handleContentChange(result.content)
      toast.success(`Rewritten as ${SUMMARY_REWRITE_LABELS[format] ?? format}.`)
    } catch (err) {
      handleAIError(err)
    } finally {
      setRewriting(false)
    }
  }

  const copyMarkdown = async () => {
    await navigator.clipboard.writeText(content)
    setCopyState('copied')
    setTimeout(() => setCopyState('idle'), 2000)
  }

  const copyPlainText = async () => {
    await navigator.clipboard.writeText(stripMarkdown(content))
    setCopyState('copiedPlain')
    setTimeout(() => setCopyState('idle'), 2000)
  }

  const downloadMd = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `week-summary-${weekStart}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const prevWeek = () => setWeekStart(w => addDays(w, -7))
  const nextWeek = () => setWeekStart(w => addDays(w, 7))
  const goToday = () => setWeekStart(getMondayOfWeek())
  const isCurrentWeek = weekStart === getMondayOfWeek()

  const isEmpty = !loading && data && (
    data.completedTasks.length === 0 &&
    data.meetings.length === 0 &&
    data.inProgressTasks.length === 0
  )

  return (
    <>
      {/* Top bar */}
      <div className="page-topbar">
        <div className="sum-topbar-left">
          <span className="page-topbar-title">Weekly Summary</span>
          {saving && <span className="sum-saving">saving…</span>}
        </div>

        {/* Week nav */}
        <div className="sum-nav">
          <button onClick={prevWeek} className="sum-nav-btn">
            <ChevronLeft style={{ width: '13px', height: '13px' }} />
          </button>
          <span className="sum-nav-range">{formatWeekRange(weekStart)}</span>
          <button onClick={nextWeek} className="sum-nav-btn">
            <ChevronRight style={{ width: '13px', height: '13px' }} />
          </button>
          {!isCurrentWeek && (
            <button onClick={goToday} className="sum-nav-today">This week</button>
          )}
        </div>
      </div>

      <div className="sum-layout">
        {/* Left pane — editable summary */}
        <div className="sum-left">
          {/* Toolbar */}
          <div className="sum-toolbar">
            <ExportBtn
              label={copyState === 'copied' ? 'Copied ✓' : 'Copy markdown'}
              icon={<Copy style={{ width: '11px', height: '11px' }} />}
              onClick={copyMarkdown}
              primary
            />
            <ExportBtn
              label={copyState === 'copiedPlain' ? 'Copied ✓' : 'Copy as plain text'}
              icon={<FileText style={{ width: '11px', height: '11px' }} />}
              onClick={copyPlainText}
            />
            <ExportBtn
              label="Download .md"
              icon={<Download style={{ width: '11px', height: '11px' }} />}
              onClick={downloadMd}
            />
            <div className="sum-toolbar-spacer" />
            {generatedAt && (
              <span className="sum-generated-at">
                Generated at {fmtTime(generatedAt)}
                {isEdited && <span className="sum-edited-mark">· edited</span>}
              </span>
            )}
            <button
              onClick={handleRegenerate}
              disabled={regenerating || loading}
              className="sum-regen-btn"
            >
              <RefreshCw style={{ width: '10px', height: '10px' }} />
              Regenerate
            </button>
            {/* AI rewrite menu */}
            <div className="sum-rewrite-wrap">
              <AIButton
                configured={aiConfig.configured}
                loading={aiConfig.loading}
                generating={rewriting}
                onClick={() => setShowRewriteMenu(m => !m)}
                label="Rewrite for…"
                tooltip={aiConfig.tooltip}
                showSetupLink={false}
              />
              {showRewriteMenu && aiConfig.configured && (
                <div className="sum-rewrite-menu">
                  {Object.keys(SUMMARY_REWRITE_PROMPTS).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => handleRewrite(fmt)}
                      className="sum-rewrite-item"
                    >
                      {SUMMARY_REWRITE_LABELS[fmt]}
                    </button>
                  ))}
                  <button onClick={() => handleRewrite('custom')} className="sum-rewrite-custom">
                    {SUMMARY_REWRITE_LABELS['custom']}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Editor */}
          {loading ? (
            <div className="sum-editor-loading">Loading…</div>
          ) : error ? (
            <div className="sum-editor-error">
              <AlertCircle style={{ width: '14px', height: '14px', flexShrink: 0, marginTop: '2px' }} />
              {error}
            </div>
          ) : isEmpty && !content ? (
            <div className="sum-editor-empty">
              <div className="sum-editor-empty-text">
                Your weekly summary will appear here once you start tracking tasks and meetings in Caliber.
              </div>
              <div className="sum-editor-sample">
                {`# Week Summary — sample\n\n## Completed\n- Finish sprint planning ⚡\n- Review PR backlog\n\n## Meetings\n3 meetings (2 1:1s, 1 team)\n\n## People\n- 1:1s held with: Alice, Bob`}
              </div>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              spellCheck={false}
              className="sum-textarea"
            />
          )}
        </div>

        {/* Right pane — data preview */}
        <div className="sum-right">
          <div className="sum-right-header">
            <span className="sum-right-header-label">Source data</span>
          </div>

          {data && (
            <>
              <PreviewSection title="Completed tasks" count={data.completedTasks.length}>
                {data.completedTasks.map(t => (
                  <PreviewItem key={t.id}>
                    <Link href="/tasks" className="sum-preview-item-link">
                      <span style={{ color: priorityColor(t.priority), marginRight: '5px', fontSize: '10px' }}>●</span>
                      {t.title}
                    </Link>
                  </PreviewItem>
                ))}
              </PreviewSection>

              <PreviewSection title="In progress" count={data.inProgressTasks.length}>
                {data.inProgressTasks.map(t => (
                  <PreviewItem key={t.id}>
                    <span style={{ color: priorityColor(t.priority), marginRight: '5px', fontSize: '10px' }}>●</span>
                    {t.title}
                    {t.dueDate && <span style={{ color: 'var(--text-3)', marginLeft: '6px' }}>due {fmtShort(t.dueDate)}</span>}
                  </PreviewItem>
                ))}
              </PreviewSection>

              <PreviewSection title="Overdue tasks" count={data.overdueTasks.length}>
                {data.overdueTasks.map(t => (
                  <PreviewItem key={t.id}>
                    <span style={{ color: '#ff6b6b', marginRight: '5px' }}>⚠️</span>
                    {t.title}
                    {t.daysOverdue != null && <span style={{ color: '#ff6b6b', marginLeft: '6px' }}>{t.daysOverdue}d overdue</span>}
                  </PreviewItem>
                ))}
              </PreviewSection>

              <PreviewSection title="Blocked tasks" count={data.blockedTasks.length}>
                {data.blockedTasks.map(t => (
                  <PreviewItem key={t.id}>
                    <span style={{ marginRight: '5px' }}>🚫</span>{t.title}
                  </PreviewItem>
                ))}
              </PreviewSection>

              <PreviewSection title="Meetings this week" count={data.meetings.length}>
                {data.meetings.map(m => (
                  <PreviewItem key={m.id}>
                    <Link href="/meetings" className="sum-preview-item-link">
                      <span style={{ color: 'var(--text-3)', marginRight: '5px', fontSize: 'var(--text-caption)' }}>{m.type}</span>
                      {m.title}
                      {m.personName && <span style={{ color: 'var(--text-3)', marginLeft: '6px' }}>· {m.personName}</span>}
                      <span style={{ color: 'var(--text-3)', marginLeft: '6px' }}>{fmtShort(m.date)}</span>
                    </Link>
                  </PreviewItem>
                ))}
              </PreviewSection>

              <PreviewSection title="People seen this week" count={data.activePeople.filter(p => p.seenThisWeek).length}>
                {data.activePeople.filter(p => p.seenThisWeek).map(p => (
                  <PreviewItem key={p.id}>
                    <Link href={`/people/${p.id}`} className="sum-preview-item-link">{p.name}</Link>
                  </PreviewItem>
                ))}
              </PreviewSection>

              <PreviewSection title="People not seen" count={data.activePeople.filter(p => !p.seenThisWeek).length}>
                {data.activePeople.filter(p => !p.seenThisWeek).map(p => (
                  <PreviewItem key={p.id}>
                    <Link href={`/people/${p.id}`} style={{ textDecoration: 'none', color: 'var(--text-3)' }}>{p.name}</Link>
                  </PreviewItem>
                ))}
              </PreviewSection>

              <PreviewSection title="Follow-ups completed" count={data.completedFollowUps.length}>
                {data.completedFollowUps.map(f => (
                  <PreviewItem key={f.id}>
                    {f.title}
                    {f.personName && <span style={{ color: 'var(--text-3)', marginLeft: '6px' }}>· {f.personName}</span>}
                  </PreviewItem>
                ))}
              </PreviewSection>

              <PreviewSection title="Open follow-ups" count={data.openFollowUps.length}>
                {data.openFollowUps.map(f => (
                  <PreviewItem key={f.id}>
                    {f.title}
                    {f.dueDate && f.dueDate < new Date().toISOString().split('T')[0] && (
                      <span style={{ color: '#ff6b6b', marginLeft: '6px' }}>overdue</span>
                    )}
                  </PreviewItem>
                ))}
              </PreviewSection>

              <PreviewSection title="Next week tasks" count={data.nextWeekTasks.length}>
                {data.nextWeekTasks.map(t => (
                  <PreviewItem key={t.id}>
                    <span style={{ color: priorityColor(t.priority), marginRight: '5px', fontSize: '10px' }}>●</span>
                    {t.title}
                    {t.dueDate && <span style={{ color: 'var(--text-3)', marginLeft: '6px' }}>due {fmtShort(t.dueDate)}</span>}
                  </PreviewItem>
                ))}
              </PreviewSection>

              {data.reflectionNotes && (
                <PreviewSection title="Weekly review notes" count={1}>
                  <div className="sum-preview-notes">{data.reflectionNotes}</div>
                </PreviewSection>
              )}

              {data.evidenceThisWeek.length > 0 && (
                <PreviewSection title="Evidence logged" count={data.evidenceThisWeek.length}>
                  {data.evidenceThisWeek.map(e => (
                    <PreviewItem key={e.id}>
                      {e.category && <span style={{ color: 'var(--text-3)', marginRight: '5px' }}>[{e.category}]</span>}
                      {e.personName ?? 'No person'}
                      <span style={{ color: 'var(--text-3)', marginLeft: '6px' }}>{fmtShort(e.occurredAt)}</span>
                    </PreviewItem>
                  ))}
                </PreviewSection>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
