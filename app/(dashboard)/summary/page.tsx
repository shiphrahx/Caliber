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
    <div style={{ borderBottom: '1px solid var(--border-1)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <span style={{ fontSize: 'var(--text-meta)', color: 'var(--text-1)', fontWeight: 500 }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{count}</span>
          {open
            ? <ChevronDown style={{ width: '11px', height: '11px', color: 'var(--text-3)' }} />
            : <ChevronRt style={{ width: '11px', height: '11px', color: 'var(--text-3)' }} />
          }
        </div>
      </button>
      {open && <div style={{ padding: '0 12px 10px' }}>{children}</div>}
    </div>
  )
}

function PreviewItem({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 'var(--text-meta)', color: 'var(--text-2)', padding: '3px 0', borderBottom: '1px solid var(--border-1)' }}>
      {children}
    </div>
  )
}

// ── Export button ─────────────────────────────────────────────────────────────

function ExportBtn({
  label, icon, onClick, primary = false,
}: { label: string; icon: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: primary ? '5px 12px' : '5px 10px',
        background: primary ? 'linear-gradient(90deg, #00ffe5 0%, #00f058 100%)' : 'none',
        border: primary ? 'none' : '1px solid var(--border-2)',
        color: primary ? '#0a1a0a' : 'var(--text-2)',
        borderRadius: '4px', cursor: 'pointer',
        fontSize: 'var(--text-caption)', fontWeight: primary ? 600 : 400,
        fontFamily: 'var(--font-sans)',
      }}
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
  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data, loading, error, refetch } = useWeeklySummaryData(weekStart)

  // Load existing saved summary on week change
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

  // Auto-generate once data loads if no saved summary
  useEffect(() => {
    if (!data || loading || content) return
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
    if (!data) return
    setRegenerating(true)
    try {
      refetch()
      const md = generateSummaryMarkdown(data)
      setContent(md)
      setIsEdited(false)
      const r = await saveSummaryMarkdown(weekStart, md)
      setGeneratedAt(r.summaryGeneratedAt)
    } finally {
      setRegenerating(false)
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
      <div style={{
        height: '40px', padding: '0 16px', borderBottom: '1px solid var(--border-1)',
        background: 'var(--surf)', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: 'var(--text-label)', fontWeight: 500, color: 'var(--text-1)', fontFamily: 'var(--font-sans)' }}>
            Weekly Summary
          </span>
          {saving && (
            <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)' }}>saving…</span>
          )}
        </div>

        {/* Week nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={prevWeek} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft style={{ width: '13px', height: '13px' }} />
          </button>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-2)', fontFamily: 'var(--font-sans)', minWidth: '140px', textAlign: 'center' }}>
            {formatWeekRange(weekStart)}
          </span>
          <button onClick={nextWeek} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px', display: 'flex', alignItems: 'center' }}>
            <ChevronRight style={{ width: '13px', height: '13px' }} />
          </button>
          {!isCurrentWeek && (
            <button onClick={goToday} style={{ background: 'none', border: '1px solid var(--border-2)', borderRadius: '3px', cursor: 'pointer', color: 'var(--text-3)', padding: '2px 6px', fontSize: 'var(--text-caption)', fontFamily: 'var(--font-sans)' }}>
              This week
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 40px)', overflow: 'hidden' }}>
        {/* Left pane — editable summary */}
        <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-1)', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{
            padding: '8px 16px', borderBottom: '1px solid var(--border-1)',
            display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
            background: 'var(--surf)',
          }}>
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
            <div style={{ flex: 1 }} />
            {generatedAt && (
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)' }}>
                Generated at {fmtTime(generatedAt)}
                {isEdited && <span style={{ color: '#ffd43b', marginLeft: '6px' }}>· edited</span>}
              </span>
            )}
            <button
              onClick={handleRegenerate}
              disabled={regenerating || loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: 'none', border: '1px solid var(--border-2)', borderRadius: '4px',
                color: 'var(--text-3)', cursor: 'pointer', padding: '3px 8px',
                fontSize: 'var(--text-caption)', fontFamily: 'var(--font-sans)',
                opacity: regenerating || loading ? 0.5 : 1,
              }}
            >
              <RefreshCw style={{ width: '10px', height: '10px' }} />
              Regenerate
            </button>
          </div>

          {/* Editor */}
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 'var(--text-meta)' }}>
              Loading…
            </div>
          ) : error ? (
            <div style={{ flex: 1, padding: '24px', color: '#ff6b6b', fontSize: 'var(--text-meta)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <AlertCircle style={{ width: '14px', height: '14px', flexShrink: 0, marginTop: '2px' }} />
              {error}
            </div>
          ) : isEmpty && !content ? (
            <div style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <div style={{ fontSize: 'var(--text-meta)', color: 'var(--text-3)', textAlign: 'center', maxWidth: '320px' }}>
                Your weekly summary will appear here once you start tracking tasks and meetings in Cadence.
              </div>
              <div style={{
                background: 'var(--surf-2)', border: '1px solid var(--border-1)', borderRadius: '6px',
                padding: '16px', fontSize: 'var(--text-caption)', color: 'var(--text-3)',
                fontFamily: 'var(--font-mono)', maxWidth: '400px', whiteSpace: 'pre-wrap', lineHeight: 1.6,
              }}>
                {`# Week Summary — sample\n\n## Completed\n- Finish sprint planning ⚡\n- Review PR backlog\n\n## Meetings\n3 meetings (2 1:1s, 1 team)\n\n## People\n- 1:1s held with: Alice, Bob`}
              </div>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              spellCheck={false}
              style={{
                flex: 1, padding: '20px 24px', background: 'var(--surf)',
                color: 'var(--text-1)', border: 'none', outline: 'none',
                fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: 1.7,
                resize: 'none', overflowY: 'auto',
              }}
            />
          )}
        </div>

        {/* Right pane — data preview */}
        <div style={{ flex: '0 0 40%', overflowY: 'auto', background: 'var(--surf-2)' }}>
          <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid var(--border-1)' }}>
            <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
              Source data
            </span>
          </div>

          {data && (
            <>
              <PreviewSection title="Completed tasks" count={data.completedTasks.length}>
                {data.completedTasks.map(t => (
                  <PreviewItem key={t.id}>
                    <Link href={`/tasks`} style={{ textDecoration: 'none', color: 'var(--text-2)' }}>
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
                    <Link href={`/meetings`} style={{ textDecoration: 'none', color: 'var(--text-2)' }}>
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
                    <Link href={`/people/${p.id}`} style={{ textDecoration: 'none', color: 'var(--text-2)' }}>
                      {p.name}
                    </Link>
                  </PreviewItem>
                ))}
              </PreviewSection>

              <PreviewSection title="People not seen" count={data.activePeople.filter(p => !p.seenThisWeek).length}>
                {data.activePeople.filter(p => !p.seenThisWeek).map(p => (
                  <PreviewItem key={p.id}>
                    <Link href={`/people/${p.id}`} style={{ textDecoration: 'none', color: 'var(--text-3)' }}>
                      {p.name}
                    </Link>
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
                  <div style={{ fontSize: 'var(--text-meta)', color: 'var(--text-2)', padding: '4px 0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {data.reflectionNotes}
                  </div>
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
