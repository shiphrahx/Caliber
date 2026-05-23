'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, CheckCircle, User, ExternalLink, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  getMondayOfWeek,
  formatWeekRange,
  addDays,
  getOrCreateWeeklyReview,
  getWeeklyReview,
  getDismissedItems,
  dismissItem,
  updateReviewNotes,
  completeWeeklyReview,
  reopenWeeklyReview,
  type WeeklyReview,
  type DismissedItem,
  type ReviewSnapshot,
} from '@/lib/services/weekly-review'
import { useWeeklyReviewSignals, type ReviewSignal, type SignalSeverity } from '@/lib/hooks/use-weekly-review-signals'
import { ReviewSection } from '@/components/review/review-section'
import { DismissDialog } from '@/components/review/dismiss-dialog'
import { updateTask } from '@/lib/services/tasks'
import { AIButton } from '@/components/ui/ai-button'
import { useAIConfig } from '@/lib/hooks/use-ai-config'
import { callAI, handleAIError } from '@/lib/services/ai'
import { REFLECTION_PROMPTS_SYSTEM } from '@/lib/ai/prompts'

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityDot(severity: SignalSeverity) {
  const color = severity === 'critical' ? '#f87171' : severity === 'warning' ? '#f97316' : '#60a5fa'
  return (
    <span style={{
      width: '7px', height: '7px', borderRadius: '50%',
      background: color, flexShrink: 0, display: 'inline-block', marginTop: '5px',
    }} />
  )
}

function priorityBadge(priority: string | undefined | null) {
  if (!priority) return null
  const styles: Record<string, { bg: string; color: string }> = {
    'Low':       { bg: '#0a0a1e', color: '#818cf8' },
    'Medium':    { bg: '#1a0a1e', color: '#c084fc' },
    'High':      { bg: '#1e0d00', color: '#f97316' },
    'Very High': { bg: '#1a0a0a', color: '#f87171' },
  }
  const s = styles[priority] ?? styles['Medium']
  return (
    <span style={{
      fontSize: '9px', padding: '1px 5px', borderRadius: '3px',
      background: s.bg, color: s.color, fontFamily: 'var(--font-mono)',
      flexShrink: 0,
    }}>
      {priority}
    </span>
  )
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatDayName(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long' })
}

// ── Action buttons ────────────────────────────────────────────────────────────

function Btn({
  onClick, children, variant = 'secondary',
}: {
  onClick?: () => void
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'dismiss'
}) {
  const [hovered, setHovered] = useState(false)

  const base: React.CSSProperties = {
    fontSize: '10px', padding: '3px 8px', borderRadius: '4px',
    cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
    background: 'transparent', transition: 'none',
  }

  let style: React.CSSProperties = { ...base }
  if (variant === 'primary') {
    style = { ...base, border: `1px solid ${hovered ? '#00f058' : '#00f058'}`, color: '#00f058', background: hovered ? '#0a1e0a' : 'transparent' }
  } else if (variant === 'dismiss') {
    style = { ...base, border: '1px solid transparent', color: hovered ? 'var(--text-2)' : 'var(--text-3)' }
  } else {
    style = { ...base, border: `1px solid ${hovered ? 'var(--border-3)' : 'var(--border-2)'}`, color: hovered ? 'var(--text-1)' : 'var(--text-2)' }
  }

  return (
    <button
      onClick={onClick}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  )
}

// ── Signal row ────────────────────────────────────────────────────────────────

function SignalRow({
  signal,
  onDismiss,
  actions,
}: {
  signal: ReviewSignal
  onDismiss: (signal: ReviewSignal) => void
  actions?: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '10px 16px', borderBottom: '1px solid var(--border-1)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      {severityDot(signal.severity)}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-1)' }}>{signal.message}</span>
          {signal.meta?.isNewHire === true && (
            <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 5px', borderRadius: '3px', background: 'rgba(0,240,88,0.12)', color: '#00f058', border: '1px solid rgba(0,240,88,0.3)', whiteSpace: 'nowrap' }}>
              New hire
            </span>
          )}
        </div>
        {typeof signal.meta?.subtitle === 'string' && signal.meta.subtitle && (
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>
            {signal.meta.subtitle}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'flex-start' }}>
        {actions}
        <Btn variant="dismiss" onClick={() => onDismiss(signal)}>Dismiss</Btn>
      </div>
    </div>
  )
}

// ── Section icons ─────────────────────────────────────────────────────────────

const ICON_PEOPLE = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.2" />
    <path d="M2 14c0-2.5 2.7-4.5 6-4.5s6 2 6 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)
const ICON_ACTIONS = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M2 8h9M2 12h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
)
const ICON_TASKS = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const ICON_WEEK = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)
const ICON_REFLECTION = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 13V3a1 1 0 011-1h8a1 1 0 011 1v10l-5-3-5 3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
)
const ICON_GOALS = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="8" cy="8" r="0.8" fill="currentColor" />
  </svg>
)
const ICON_COMPLETE = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WeeklyReviewPage() {
  const router = useRouter()

  const [weekStart, setWeekStart] = useState<string>(getMondayOfWeek())
  const isCurrentWeek = weekStart === getMondayOfWeek()

  const [review, setReview] = useState<WeeklyReview | null>(null)
  const [dismissed, setDismissed] = useState<DismissedItem[]>([])
  const [loadingReview, setLoadingReview] = useState(true)

  const [sectionState, setSectionState] = useState<Record<string, boolean>>({
    people: false,
    actions: false,
    tasks: false,
    goals: false,
    week: false,
    reflection: false,
  })

  const [notes, setNotes] = useState('')
  const notesDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [dismissTarget, setDismissTarget] = useState<ReviewSignal | null>(null)

  const [activitySummary, setActivitySummary] = useState<{
    meetingsHeld: { id: string; title: string }[]
    tasksCompleted: { id: string; title: string }[]
    evidenceLogged: number
    actionItemsCreated: number
  } | null>(null)

  const [completing, setCompleting] = useState(false)

  const [reflectionPrompts, setReflectionPrompts] = useState<string[]>([])
  const [generatingPrompts, setGeneratingPrompts] = useState(false)
  const aiConfig = useAIConfig()

  // Load review + dismissed items
  const loadReview = useCallback(async () => {
    setLoadingReview(true)
    try {
      let r: WeeklyReview
      if (isCurrentWeek) {
        r = await getOrCreateWeeklyReview(weekStart)
      } else {
        const existing = await getWeeklyReview(weekStart)
        if (!existing) {
          setReview(null)
          setDismissed([])
          setLoadingReview(false)
          return
        }
        r = existing
      }
      setReview(r)
      setNotes(r.notes ?? '')
      const items = await getDismissedItems(r.id)
      setDismissed(items)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingReview(false)
    }
  }, [weekStart, isCurrentWeek])

  useEffect(() => { loadReview() }, [loadReview])

  // Load activity summary
  useEffect(() => {
    async function loadActivity() {
      const supabase = createClient()
      const weekEnd = addDays(weekStart, 6)
      const [
        { data: meetings },
        { data: tasks },
        { data: evidence },
        { data: actionItems },
      ] = await Promise.all([
        supabase.from('meetings').select('id, title').gte('meeting_date', weekStart).lte('meeting_date', weekEnd),
        supabase.from('tasks').select('id, title').eq('status', 'completed').gte('completion_date', weekStart).lte('completion_date', weekEnd),
        supabase.from('evidence_entries').select('id').gte('occurred_at', weekStart).lte('occurred_at', weekEnd),
        supabase.from('tasks').select('id').eq('source', 'meeting_action').gte('created_at', weekStart + 'T00:00:00').lte('created_at', weekEnd + 'T23:59:59'),
      ])
      setActivitySummary({
        meetingsHeld: (meetings ?? []).map(m => ({ id: m.id, title: m.title })),
        tasksCompleted: (tasks ?? []).map(t => ({ id: t.id, title: t.title })),
        evidenceLogged: (evidence ?? []).length,
        actionItemsCreated: (actionItems ?? []).length,
      })
    }
    loadActivity()
  }, [weekStart])

  const { signals, refetch: refetchSignals } = useWeeklyReviewSignals(dismissed)

  const handleNotesChange = (val: string) => {
    setNotes(val)
    if (!review) return
    if (notesDebounce.current) clearTimeout(notesDebounce.current)
    notesDebounce.current = setTimeout(() => {
      updateReviewNotes(review.id, val).catch(console.error)
    }, 1000)
  }

  const handleDismiss = async (signal: ReviewSignal, note: string) => {
    if (!review) return
    const item = await dismissItem(review.id, signal.type, signal.entityId, signal.entityType, note)
    setDismissed(d => [...d, item])
    setDismissTarget(null)
    refetchSignals()
  }

  const handleMarkTaskDone = async (taskId: string) => {
    await updateTask(taskId, { status: 'Done' })
    refetchSignals()
  }

  const handleMoveTaskNextWeek = async (taskId: string, currentDueDate: string) => {
    const newDate = addDays(currentDueDate, 7)
    await updateTask(taskId, { dueDate: newDate })
    refetchSignals()
  }

  const toggleSection = (key: string) => setSectionState(s => ({ ...s, [key]: !s[key] }))

  const handleComplete = async () => {
    if (!review) return
    setCompleting(true)
    try {
      const snapshot: ReviewSnapshot = {
        overdueTasks: signals.filter(s => s.type === 'overdue_task').length,
        noRecent1on1: signals.filter(s => s.type === 'no_recent_1on1').length,
        unresolvedActions: signals.filter(s => s.type === 'unresolved_action').length,
        noEvidence: signals.filter(s => s.type === 'no_evidence').length,
        upcomingDeadlines: signals.filter(s => s.type === 'upcoming_deadline').length,
        missingNotes: signals.filter(s => s.type === 'missing_notes').length,
        totalSignals: signals.length,
        criticalSignals: signals.filter(s => s.severity === 'critical').length,
        warningSignals: signals.filter(s => s.severity === 'warning').length,
      }
      const updated = await completeWeeklyReview(review.id, snapshot)
      setReview(updated)
    } finally {
      setCompleting(false)
    }
  }

  const handleReopen = async () => {
    if (!review) return
    const updated = await reopenWeeklyReview(review.id)
    setReview(updated)
  }

  const goToPrevWeek = () => setWeekStart(addDays(weekStart, -7))
  const goToNextWeek = () => setWeekStart(addDays(weekStart, 7))
  const goToCurrentWeek = () => setWeekStart(getMondayOfWeek())

  const handleGenerateReflectionPrompts = async () => {
    setGeneratingPrompts(true)
    try {
      const context = [
        activitySummary ? `Meetings held: ${activitySummary.meetingsHeld.length}. Tasks completed: ${activitySummary.tasksCompleted.length}. Evidence logged: ${activitySummary.evidenceLogged}.` : '',
        signals.length > 0 ? `Signals: ${signals.slice(0, 5).map(s => s.message).join('; ')}` : '',
        notes ? `Notes so far: ${notes.slice(0, 300)}` : '',
      ].filter(Boolean).join('\n')
      const result = await callAI({
        systemPrompt: REFLECTION_PROMPTS_SYSTEM,
        userPrompt: context || 'Manager completed a weekly review. No additional data available.',
        maxTokens: 300,
        temperature: 0.7,
      })
      const jsonMatch = result.content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const prompts = JSON.parse(jsonMatch[0])
        setReflectionPrompts(Array.isArray(prompts) ? prompts : [])
      }
    } catch (err) {
      handleAIError(err)
    } finally {
      setGeneratingPrompts(false)
    }
  }

  // Signal bucketing
  const peopleSignals = signals.filter(s =>
    s.type === 'no_recent_1on1' || s.type === 'no_evidence' || s.type === 'missing_notes'
  )
  const actionSignals = signals.filter(s => s.type === 'unresolved_action')
  const taskSignals = signals.filter(s => s.type === 'overdue_task' || s.type === 'upcoming_deadline')
  const overdueSignals = taskSignals.filter(s => s.type === 'overdue_task')
  const upcomingSignals = taskSignals.filter(s => s.type === 'upcoming_deadline')
  const goalSignals = signals.filter(s => s.type === 'stale_goal')

  // Sections auto-check when all their signals are cleared
  const effectiveSectionState = {
    people:     peopleSignals.length === 0 || sectionState.people,
    actions:    actionSignals.length === 0  || sectionState.actions,
    tasks:      taskSignals.length === 0    || sectionState.tasks,
    goals:      goalSignals.length === 0    || sectionState.goals,
    week:       sectionState.week,
    reflection: sectionState.reflection,
  }

  // Progress = completed sections / 5 (week excluded — no action items)
  const PROGRESS_SECTIONS = ['people', 'actions', 'tasks', 'goals', 'reflection'] as const
  const reviewedCount = PROGRESS_SECTIONS.filter(k => effectiveSectionState[k]).length
  const progressPct = Math.round((reviewedCount / PROGRESS_SECTIONS.length) * 100)

  const isReadOnly = !isCurrentWeek && review?.status === 'completed'
  const isCompleted = review?.status === 'completed'

  const warnCount = signals.filter(s => s.severity === 'critical' || s.severity === 'warning').length

  const topbar = (
    /* Sticky topbar — title only, status badge on right */
    <div style={{
      background: 'var(--surf)',
      borderBottom: '1px solid var(--border-1)',
      height: '40px',
      padding: '0 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 'var(--text-label)', fontWeight: 500, color: 'var(--text-1)', fontFamily: 'var(--font-sans)' }}>
        Weekly Review
      </span>
    </div>
  )

  if (loadingReview) {
    return (
      <>
        {topbar}
        <div style={{ padding: '32px', color: 'var(--text-2)', fontSize: '12px' }}>
          Loading weekly review...
        </div>
      </>
    )
  }

  return (
    <>
      {topbar}
      <div style={{ padding: '16px' }}>

      {/* h1 + week nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 500, margin: 0, color: 'var(--text-1)' }}>Weekly Review</h1>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={goToPrevWeek}
            style={{ width: '26px', height: '26px', background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--text-2)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-3)'; e.currentTarget.style.color = 'var(--text-1)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-2)' }}
          >
            <ChevronLeft style={{ width: '13px', height: '13px' }} />
          </button>
          {!isCurrentWeek && (
            <button
              onClick={goToCurrentWeek}
              style={{ height: '26px', padding: '0 8px', background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--text-2)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontFamily: 'var(--font-sans)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-3)'; e.currentTarget.style.color = 'var(--text-1)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-2)' }}
            >
              This week
            </button>
          )}
          <button
            onClick={goToNextWeek}
            style={{ width: '26px', height: '26px', background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--text-2)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-3)'; e.currentTarget.style.color = 'var(--text-1)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-2)' }}
          >
            <ChevronRight style={{ width: '13px', height: '13px' }} />
          </button>
        </div>
      </div>

      {/* Date range + status badge */}
      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
        {formatWeekRange(weekStart)}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
          marginLeft: '10px', fontFamily: 'var(--font-mono)',
          ...(isCompleted ? { background: '#0a1e0a', color: '#00f058' } : { background: '#0a1e28', color: '#60a5fa' }),
        }}>
          {isCompleted ? '✓ Completed' : '◎ In Progress'}
        </span>
        {isCompleted && review?.completedAt && (
          <span style={{ marginLeft: '12px', fontSize: '11px', color: 'var(--text-3)' }}>
            {new Date(review.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {isCurrentWeek && (
        <div style={{ height: '3px', background: 'var(--border-1)', borderRadius: '2px', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #00ffe5, #00f058)', borderRadius: '2px', transition: 'width 0.4s ease' }} />
        </div>
      )}

      {/* Past week — no review */}
      {!isCurrentWeek && !review && (
        <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>
          No review was recorded for this week.
        </p>
      )}

      {/* Snapshot for past completed reviews */}
      {isReadOnly && review?.snapshot && (
        <div style={{
          background: 'var(--surf)', border: '1px solid var(--border-1)',
          borderRadius: '8px', padding: '16px', marginBottom: '20px',
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
        }}>
          {[
            { label: 'Overdue tasks', value: review.snapshot.overdueTasks },
            { label: 'No recent 1:1', value: review.snapshot.noRecent1on1 },
            { label: 'Unresolved actions', value: review.snapshot.unresolvedActions },
            { label: 'No evidence', value: review.snapshot.noEvidence },
            { label: 'Upcoming deadlines', value: review.snapshot.upcomingDeadlines },
            { label: 'Missing notes', value: review.snapshot.missingNotes },
          ].map(stat => (
            <div key={stat.label}>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)' }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {(review || isCurrentWeek) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Section 1: People Check */}
          <ReviewSection
            title="People Check"
            icon={ICON_PEOPLE}
            signalCount={isReadOnly ? 0 : peopleSignals.length}
            criticalCount={isReadOnly ? 0 : peopleSignals.filter(s => s.severity === 'critical').length}
            warningCount={isReadOnly ? 0 : peopleSignals.filter(s => s.severity === 'warning').length}
            infoCount={isReadOnly ? 0 : peopleSignals.filter(s => s.severity === 'info').length}
            isReviewed={effectiveSectionState.people}
            onMarkReviewed={() => toggleSection('people')}
            emptyMessage="All clear — everyone has been seen recently"
          >
            {!isReadOnly ? (() => {
              const byPerson: Record<string, { name: string; id: string; signals: ReviewSignal[] }> = {}
              for (const s of peopleSignals) {
                if (!s.personId) continue
                if (!byPerson[s.personId]) byPerson[s.personId] = { name: s.personName ?? s.personId, id: s.personId, signals: [] }
                byPerson[s.personId].signals.push(s)
              }
              return (
                <>
                  {Object.entries(byPerson).map(([personId, { name, signals: pSignals }]) => (
                    <div key={personId}>
                      {/* Person sub-header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '7px 16px', background: 'var(--surf-2)',
                        borderBottom: '1px solid var(--border-1)',
                      }}>
                        <User style={{ width: '11px', height: '11px', color: 'var(--text-3)', flexShrink: 0 }} />
                        <Link
                          href={`/people/${personId}`}
                          style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          {name}
                          <ExternalLink style={{ width: '9px', height: '9px', color: 'var(--text-3)' }} />
                        </Link>
                      </div>
                      {/* Per-signal rows with own actions */}
                      {pSignals.map((s, i) => {
                        const lastDate = s.meta?.lastDate ? formatDate(s.meta.lastDate as string) : null
                        const subtitle = s.type === 'no_recent_1on1'
                          ? [lastDate ? `Last 1:1: ${lastDate}` : 'No 1:1 on record'].filter(Boolean).join(' · ')
                          : s.type === 'no_evidence'
                          ? 'No evidence in 90 days'
                          : s.type === 'missing_notes'
                          ? 'No meeting notes in 21 days'
                          : null
                        const signalWithSubtitle = subtitle ? { ...s, meta: { ...s.meta, subtitle } } : s
                        return (
                          <SignalRow
                            key={i}
                            signal={signalWithSubtitle}
                            onDismiss={setDismissTarget}
                            actions={
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {(s.type === 'no_recent_1on1') && (
                                  <>
                                    <Btn variant="primary" onClick={() => router.push(`/meetings?new=1&type=1:1&personId=${personId}`)}>
                                      Schedule 1:1
                                    </Btn>
                                    <Btn onClick={() => router.push(`/evidence?new=1&personId=${personId}`)}>
                                      Log note
                                    </Btn>
                                  </>
                                )}
                                {s.type === 'no_evidence' && (
                                  <Btn variant="primary" onClick={() => router.push(`/evidence?new=1&personId=${personId}`)}>
                                    Log evidence
                                  </Btn>
                                )}
                                {s.type === 'missing_notes' && (
                                  <Btn variant="primary" onClick={() => router.push(`/evidence?new=1&personId=${personId}`)}>
                                    Log note
                                  </Btn>
                                )}
                              </div>
                            }
                          />
                        )
                      })}
                    </div>
                  ))}
                </>
              )
            })() : null}
          </ReviewSection>

          {/* Section 2: Action Items & Follow-ups */}
          <ReviewSection
            title="Action Items & Follow-ups"
            icon={ICON_ACTIONS}
            signalCount={isReadOnly ? 0 : actionSignals.length}
            criticalCount={isReadOnly ? 0 : actionSignals.filter(s => s.severity === 'critical').length}
            warningCount={isReadOnly ? 0 : actionSignals.filter(s => s.severity === 'warning').length}
            infoCount={isReadOnly ? 0 : actionSignals.filter(s => s.severity === 'info').length}
            isReviewed={effectiveSectionState.actions}
            onMarkReviewed={() => toggleSection('actions')}
            emptyMessage="All action items resolved"
          >
            {!isReadOnly ? (
              <>
                {actionSignals.map((s, i) => {
                  const daysAgo = s.meta?.daysAgo as number | undefined
                  const meetingTitle = s.meta?.meetingTitle as string | undefined
                  const subtitle = [
                    meetingTitle ? `From: ${meetingTitle}` : null,
                    daysAgo != null ? `${daysAgo} days ago` : null,
                  ].filter(Boolean).join(' · ')
                  const signalWithSubtitle = { ...s, meta: { ...s.meta, subtitle } }
                  return (
                    <SignalRow
                      key={i}
                      signal={signalWithSubtitle}
                      onDismiss={setDismissTarget}
                      actions={
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {Boolean(s.meta?.taskId) && (
                            <Btn variant="primary" onClick={() => handleMarkTaskDone(s.meta!.taskId as string)}>
                              Mark done
                            </Btn>
                          )}
                          <Link href={`/meetings/${s.entityId}`} style={{ textDecoration: 'none' }}>
                            <Btn>View meeting</Btn>
                          </Link>
                        </div>
                      }
                    />
                  )
                })}
              </>
            ) : null}
          </ReviewSection>

          {/* Section 3: Tasks & Deadlines */}
          <ReviewSection
            title="Tasks & Deadlines"
            icon={ICON_TASKS}
            signalCount={isReadOnly ? 0 : taskSignals.length}
            criticalCount={isReadOnly ? 0 : overdueSignals.filter(s => s.severity === 'critical').length}
            warningCount={isReadOnly ? 0 : overdueSignals.filter(s => s.severity === 'warning').length}
            infoCount={isReadOnly ? 0 : upcomingSignals.length}
            isReviewed={effectiveSectionState.tasks}
            onMarkReviewed={() => toggleSection('tasks')}
            emptyMessage="No overdue tasks and no deadlines this week"
          >
            {!isReadOnly ? (
              <>
                {/* Overdue label only when both groups exist */}
                {overdueSignals.length > 0 && upcomingSignals.length > 0 && (
                  <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-1)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Overdue
                    </span>
                  </div>
                )}
                {overdueSignals.map((s, i) => {
                  const daysOverdue = s.meta?.daysOverdue as number | undefined
                  const dueDate = s.meta?.dueDate as string | undefined
                  const priority = s.meta?.priority as string | undefined
                  const subtitle = [
                    dueDate ? `Due ${formatDate(dueDate)}` : null,
                    daysOverdue != null ? `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue` : null,
                  ].filter(Boolean).join(' · ')
                  const taskTitle = (s.meta?.title as string | undefined) ?? s.message.replace(/^"|".*$/g, '').trim()
                  return (
                    <div
                      key={i}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 16px', borderBottom: '1px solid var(--border-1)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {severityDot(s.severity)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {taskTitle}{priorityBadge(priority)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>{subtitle}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <Btn variant="primary" onClick={() => handleMarkTaskDone(s.entityId)}>Mark done</Btn>
                        <Btn onClick={() => handleMoveTaskNextWeek(s.entityId, s.meta?.dueDate as string)}>+7 days</Btn>
                        <Btn variant="dismiss" onClick={() => setDismissTarget(s)}>Dismiss</Btn>
                      </div>
                    </div>
                  )
                })}

                {/* Due this week divider */}
                {upcomingSignals.length > 0 && (
                  <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-1)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Due this week
                    </span>
                  </div>
                )}
                {upcomingSignals.map((s, i) => {
                  const dueDate = s.meta?.dueDate as string | undefined
                  const priority = s.meta?.priority as string | undefined
                  const subtitle = [
                    dueDate ? `Due ${formatDate(dueDate)}` : null,
                    dueDate ? formatDayName(dueDate) : null,
                  ].filter(Boolean).join(' · ')
                  const taskTitle = s.message.match(/"([^"]+)"/)?.[1] ?? s.message
                  return (
                    <div
                      key={i}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 16px', borderBottom: i < upcomingSignals.length - 1 ? '1px solid var(--border-1)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {severityDot('info')}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {taskTitle}{priorityBadge(priority)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>{subtitle}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <Btn variant="primary" onClick={() => handleMarkTaskDone(s.entityId)}>Mark done</Btn>
                        <Btn variant="dismiss" onClick={() => setDismissTarget(s)}>Dismiss</Btn>
                      </div>
                    </div>
                  )
                })}
              </>
            ) : null}
          </ReviewSection>

          {/* Section 4: Career Goal Staleness */}
          <ReviewSection
            title="Career Goal Staleness"
            icon={ICON_GOALS}
            signalCount={isReadOnly ? 0 : goalSignals.length}
            criticalCount={isReadOnly ? 0 : goalSignals.filter(s => s.severity === 'critical').length}
            warningCount={isReadOnly ? 0 : goalSignals.filter(s => s.severity === 'warning').length}
            infoCount={isReadOnly ? 0 : goalSignals.filter(s => s.severity === 'info').length}
            isReviewed={effectiveSectionState.goals}
            onMarkReviewed={() => toggleSection('goals')}
            emptyMessage="All career goals have recent activity"
          >
            {!isReadOnly && goalSignals.length > 0 ? (
              <>
                {goalSignals.map((s, i) => {
                  const daysSince = s.meta?.daysSince as number | undefined
                  const timePeriod = s.meta?.timePeriod as string | undefined
                  const periodLabel =
                    timePeriod === 'short_term' ? 'Short-term'
                    : timePeriod === 'mid_term' ? 'Mid-term'
                    : timePeriod === 'long_term' ? 'Long-term'
                    : null
                  const subtitle = [
                    periodLabel,
                    daysSince != null ? `No activity in ${daysSince} day${daysSince === 1 ? '' : 's'}` : null,
                  ].filter(Boolean).join(' · ')
                  const goalTitle = s.message.match(/"([^"]+)"/)?.[1] ?? s.message
                  return (
                    <div
                      key={i}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 16px', borderBottom: i < goalSignals.length - 1 ? '1px solid var(--border-1)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {severityDot(s.severity)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {goalTitle}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>{subtitle}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <Btn variant="primary" onClick={() => router.push('/career-goals')}>
                          Update goal
                        </Btn>
                        <Btn variant="dismiss" onClick={() => setDismissTarget(s)}>Dismiss</Btn>
                      </div>
                    </div>
                  )
                })}
              </>
            ) : null}
          </ReviewSection>

          {/* Section 5: Week in Review */}
          <ReviewSection
            title="Week in Review"
            icon={ICON_WEEK}
            signalCount={1}
            badgeLabel="Summary"
            badgeVariant="info"
            isReviewed={effectiveSectionState.week}
            onMarkReviewed={() => toggleSection('week')}
            defaultExpanded={false}
          >
            {activitySummary ? (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1px', background: 'var(--border-1)',
              }}>
                {[
                  { num: activitySummary.meetingsHeld.length, label: 'Meetings held' },
                  { num: activitySummary.tasksCompleted.length, label: 'Tasks completed' },
                  { num: activitySummary.evidenceLogged, label: 'Evidence logged' },
                  { num: activitySummary.actionItemsCreated, label: 'Action items' },
                ].map(cell => (
                  <div key={cell.label} style={{ background: 'var(--surf)', padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: 500, fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>
                      {cell.num}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {cell.label}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '16px', fontSize: '12px', color: 'var(--text-3)' }}>Loading…</div>
            )}
          </ReviewSection>

          {/* Section 6: Reflection */}
          <ReviewSection
            title="Reflection"
            icon={ICON_REFLECTION}
            signalCount={1}
            isReviewed={effectiveSectionState.reflection}
            onMarkReviewed={() => toggleSection('reflection')}
          >
            <div style={{ padding: '16px' }}>
              {/* AI reflection prompts */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: reflectionPrompts.length > 0 ? '10px' : 0 }}>
                  <AIButton
                    configured={aiConfig.configured}
                    loading={aiConfig.loading}
                    generating={generatingPrompts}
                    onClick={handleGenerateReflectionPrompts}
                    label="Generate reflection prompts"
                    tooltip={aiConfig.tooltip}
                    showSetupLink={true}
                    disabled={isReadOnly}
                  />
                  {reflectionPrompts.length > 0 && (
                    <button
                      onClick={() => setReflectionPrompts([])}
                      style={{ fontSize: '11px', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>
                {reflectionPrompts.length > 0 && (
                  <div style={{ display: 'grid', gap: '6px', marginBottom: '12px' }}>
                    {reflectionPrompts.map((prompt, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '8px',
                        padding: '8px 12px', background: 'var(--surf-2)',
                        border: '1px solid var(--border-1)', borderRadius: '5px',
                      }}>
                        <span style={{ fontSize: '11px', color: '#00f058', flexShrink: 0, marginTop: '1px' }}>✦</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5, fontStyle: 'italic' }}>{prompt}</span>
                      </div>
                    ))}
                  </div>
                )}
                {reflectionPrompts.length === 0 && (
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', fontStyle: 'italic', marginBottom: '10px', lineHeight: 1.6 }}>
                    "Take a moment to reflect on your week. What patterns are you noticing?"
                  </p>
                )}
              </div>
              <textarea
                value={notes}
                onChange={e => handleNotesChange(e.target.value)}
                placeholder="What went well this week? What needs attention next week? Any concerns about the team?"
                disabled={isReadOnly}
                style={{
                  width: '100%', minHeight: '100px',
                  background: 'var(--surf-2)', border: '1px solid var(--border-2)',
                  borderRadius: '6px', padding: '10px 12px',
                  color: 'var(--text-1)', fontFamily: 'var(--font-sans)',
                  fontSize: '12px', resize: 'vertical', outline: 'none', lineHeight: 1.6,
                  boxSizing: 'border-box', opacity: isReadOnly ? 0.7 : 1,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-3)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-2)' }}
              />
              {!isReadOnly && (
                <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '6px 0 0' }}>
                  Auto-saves as you type
                </p>
              )}
            </div>
          </ReviewSection>

          {/* Section 7: Complete Review */}
          {isCurrentWeek && (
            <ReviewSection
              title="Complete Review"
              icon={ICON_COMPLETE}
              signalCount={1}
              isReviewed={false}
              onMarkReviewed={() => {}}
              showCheckbox={false}
              nonInteractiveHeader={true}
            >
              <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                    <strong style={{ color: 'var(--text-2)', fontWeight: 500 }}>{dismissed.length}</strong> dismissed
                    {' · '}
                    <strong style={{ color: signals.filter(s => s.severity === 'critical').length > 0 ? '#f87171' : 'var(--text-2)', fontWeight: 500 }}>
                      {signals.filter(s => s.severity === 'critical').length}
                    </strong> critical remaining
                    {' · '}
                    <strong style={{ color: 'var(--text-2)', fontWeight: 500 }}>{signals.length}</strong> total remaining
                  </div>
                  {!isCompleted && warnCount > 0 && (
                    <div style={{ fontSize: '11px', color: '#f97316', marginTop: '4px' }}>
                      ⚠ You have {warnCount} unresolved items. You can still complete the review or address them first.
                    </div>
                  )}
                </div>

                {isCompleted ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: '#00f058', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CheckCircle style={{ width: '14px', height: '14px' }} />
                      Week reviewed
                    </span>
                    <Link
                      href={`/summary?week=${weekStart}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        background: 'transparent', border: '1px solid var(--border-2)',
                        borderRadius: '5px', color: 'var(--text-2)',
                        fontSize: '11px', padding: '5px 10px',
                        textDecoration: 'none', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Generate weekly summary <ArrowRight style={{ width: '11px', height: '11px' }} />
                    </Link>
                    <button
                      onClick={handleReopen}
                      style={{
                        background: 'transparent', border: '1px solid var(--border-2)',
                        borderRadius: '5px', color: 'var(--text-3)',
                        fontSize: '11px', padding: '5px 10px', cursor: 'pointer',
                      }}
                    >
                      Reopen
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleComplete}
                    disabled={completing}
                    style={{
                      background: 'linear-gradient(90deg, #00ffe5, #00f058)',
                      border: 'none', borderRadius: '5px',
                      color: '#0a1a0a', fontSize: '12px', fontWeight: 600,
                      padding: '5px 13px', cursor: completing ? 'not-allowed' : 'pointer',
                      opacity: completing ? 0.7 : 1, fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {completing ? 'Saving…' : '✓ Mark Week as Reviewed'}
                  </button>
                )}
              </div>
            </ReviewSection>
          )}

        </div>
      )}

      {/* Dismiss dialog */}
      {dismissTarget && (
        <DismissDialog
          onConfirm={(note) => handleDismiss(dismissTarget, note)}
          onCancel={() => setDismissTarget(null)}
        />
      )}
    </div>
    </>
  )
}
