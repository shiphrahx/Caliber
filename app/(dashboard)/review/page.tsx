'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, AlertCircle, AlertTriangle, Info,
  CheckCircle, User, ExternalLink, ArrowRight
} from 'lucide-react'
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

// ── Helpers ──────────────────────────────────────────────────────────────────


function severityIcon(severity: SignalSeverity) {
  if (severity === 'critical') return <AlertCircle style={{ width: '13px', height: '13px', color: '#ff6b6b', flexShrink: 0 }} />
  if (severity === 'warning') return <AlertTriangle style={{ width: '13px', height: '13px', color: '#ffa94d', flexShrink: 0 }} />
  return <Info style={{ width: '13px', height: '13px', color: 'var(--text-3)', flexShrink: 0 }} />
}

function severityColor(severity: SignalSeverity): string {
  if (severity === 'critical') return '#ff6b6b'
  if (severity === 'warning') return '#ffa94d'
  return 'var(--text-2)'
}

// ── Signal row component ──────────────────────────────────────────────────────

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
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-1)',
        fontSize: 'var(--text-meta)',
      }}
    >
      {severityIcon(signal.severity)}
      <span style={{ flex: 1, color: severityColor(signal.severity) }}>{signal.message}</span>
      {actions}
      <button
        onClick={() => onDismiss(signal)}
        style={{
          background: 'none',
          border: '1px solid var(--border-2)',
          borderRadius: '4px',
          color: 'var(--text-3)',
          fontSize: 'var(--text-caption)',
          padding: '3px 8px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Dismiss
      </button>
    </div>
  )
}

// ── Action button ─────────────────────────────────────────────────────────────

function ActionBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--surf-3)',
        border: '1px solid var(--border-2)',
        borderRadius: '4px',
        color: 'var(--text-1)',
        fontSize: 'var(--text-caption)',
        padding: '3px 8px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WeeklyReviewPage() {
  const router = useRouter()

  // Week navigation
  const [weekStart, setWeekStart] = useState<string>(getMondayOfWeek())
  const isCurrentWeek = weekStart === getMondayOfWeek()

  // Review state
  const [review, setReview] = useState<WeeklyReview | null>(null)
  const [dismissed, setDismissed] = useState<DismissedItem[]>([])
  const [loadingReview, setLoadingReview] = useState(true)

  // Section reviewed state
  const [sectionState, setSectionState] = useState<Record<string, boolean>>({
    people: false,
    actions: false,
    tasks: false,
    week: false,
    reflection: false,
  })

  // Reflection notes
  const [notes, setNotes] = useState('')
  const notesDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dismiss dialog
  const [dismissTarget, setDismissTarget] = useState<ReviewSignal | null>(null)

  // Activity summary state
  const [activitySummary, setActivitySummary] = useState<{
    meetingsHeld: { id: string; title: string }[]
    tasksCompleted: { id: string; title: string }[]
    evidenceLogged: number
    actionItemsCreated: number
  } | null>(null)

  // Completing state
  const [completing, setCompleting] = useState(false)

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

  // Signals
  const { signals, refetch: refetchSignals } = useWeeklyReviewSignals(dismissed)

  // Auto-save notes on blur / debounce
  const handleNotesChange = (val: string) => {
    setNotes(val)
    if (!review) return
    if (notesDebounce.current) clearTimeout(notesDebounce.current)
    notesDebounce.current = setTimeout(() => {
      updateReviewNotes(review.id, val).catch(console.error)
    }, 1000)
  }

  // Dismiss a signal
  const handleDismiss = async (signal: ReviewSignal, note: string) => {
    if (!review) return
    const item = await dismissItem(
      review.id,
      signal.type,
      signal.entityId,
      signal.entityType,
      note
    )
    setDismissed(d => [...d, item])
    setDismissTarget(null)
    refetchSignals()
  }

  // Mark task done from review
  const handleMarkTaskDone = async (taskId: string) => {
    await updateTask(taskId, { status: 'Done' })
    refetchSignals()
  }

  // Shift task by 7 days
  const handleMoveTaskNextWeek = async (taskId: string, currentDueDate: string) => {
    const newDate = addDays(currentDueDate, 7)
    await updateTask(taskId, { dueDate: newDate })
    refetchSignals()
  }

  // Section toggle
  const toggleSection = (key: string) => {
    setSectionState(s => ({ ...s, [key]: !s[key] }))
  }

  // Complete the review
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

  // Week navigation
  const goToPrevWeek = () => setWeekStart(addDays(weekStart, -7))
  const goToNextWeek = () => setWeekStart(addDays(weekStart, 7))
  const goToCurrentWeek = () => setWeekStart(getMondayOfWeek())

  // Signal bucketing
  const peopleSignals = signals.filter(s =>
    s.type === 'no_recent_1on1' || s.type === 'no_evidence' || s.type === 'missing_notes'
  )
  const actionSignals = signals.filter(s => s.type === 'unresolved_action')
  const taskSignals = signals.filter(s => s.type === 'overdue_task' || s.type === 'upcoming_deadline')
  const overdueSignals = taskSignals.filter(s => s.type === 'overdue_task')
  const upcomingSignals = taskSignals.filter(s => s.type === 'upcoming_deadline')

  // Progress
  const totalSections = 5
  const reviewedCount = Object.values(sectionState).filter(Boolean).length
  const progressPct = Math.round((reviewedCount / totalSections) * 100)

  const isReadOnly = !isCurrentWeek && review?.status === 'completed'
  const isCompleted = review?.status === 'completed'

  if (loadingReview) {
    return (
      <div style={{ padding: '32px', color: 'var(--text-2)', fontSize: 'var(--text-meta)' }}>
        Loading weekly review...
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '860px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h1 style={{ margin: 0 }}>Weekly Review</h1>

          {/* Status badge */}
          {isCompleted ? (
            <span style={{
              fontSize: 'var(--text-caption)',
              fontWeight: 600,
              background: '#0f2a1a',
              color: '#00f058',
              border: '1px solid #1a4a2a',
              borderRadius: '4px',
              padding: '3px 8px',
            }}>
              Completed ✓
            </span>
          ) : (
            <span style={{
              fontSize: 'var(--text-caption)',
              fontWeight: 600,
              background: 'var(--surf-3)',
              color: 'var(--text-2)',
              border: '1px solid var(--border-2)',
              borderRadius: '4px',
              padding: '3px 8px',
            }}>
              In Progress
            </span>
          )}
        </div>

        {/* Week navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={goToPrevWeek}
            style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', padding: '4px' }}
          >
            <ChevronLeft style={{ width: '16px', height: '16px' }} />
          </button>

          <span style={{ fontSize: 'var(--text-body)', color: 'var(--text-2)', fontWeight: 500 }}>
            {formatWeekRange(weekStart)}
          </span>

          <button
            onClick={goToNextWeek}
            style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', padding: '4px' }}
          >
            <ChevronRight style={{ width: '16px', height: '16px' }} />
          </button>

          {!isCurrentWeek && (
            <button
              onClick={goToCurrentWeek}
              style={{
                background: 'var(--surf-3)',
                border: '1px solid var(--border-2)',
                borderRadius: '4px',
                color: 'var(--text-2)',
                fontSize: 'var(--text-meta)',
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              This week
            </button>
          )}

          {isCompleted && review?.completedAt && (
            <span style={{ fontSize: 'var(--text-meta)', color: 'var(--text-3)', marginLeft: 'auto' }}>
              Completed {new Date(review.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>

        {/* Past week — no review */}
        {!isCurrentWeek && !review && (
          <p style={{ marginTop: '32px', fontSize: 'var(--text-meta)', color: 'var(--text-3)' }}>
            No review was recorded for this week.
          </p>
        )}
      </div>

      {/* Progress bar (current week only) */}
      {isCurrentWeek && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: 'var(--text-meta)', color: 'var(--text-3)' }}>
              {reviewedCount} of {totalSections} sections reviewed
            </span>
            <span style={{ fontSize: 'var(--text-meta)', color: 'var(--text-3)' }}>{progressPct}%</span>
          </div>
          <div style={{ height: '4px', background: 'var(--surf-3)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #00ffe5, #00f058)',
              borderRadius: '2px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Show snapshot summary for past completed reviews */}
      {isReadOnly && review?.snapshot && (
        <div style={{
          background: 'var(--surf)',
          border: '1px solid var(--border-1)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
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
              <div style={{ fontSize: 'var(--text-overline)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 'var(--text-section)', fontWeight: 600, color: 'var(--text-1)' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {(review || isCurrentWeek) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Section 1: People Check */}
          <ReviewSection
            title="People Check"
            signalCount={isReadOnly ? 0 : peopleSignals.length}
            criticalCount={isReadOnly ? 0 : peopleSignals.filter(s => s.severity === 'critical').length}
            warningCount={isReadOnly ? 0 : peopleSignals.filter(s => s.severity === 'warning').length}
            isReviewed={sectionState.people}
            onMarkReviewed={() => toggleSection('people')}
            emptyMessage="All clear — everyone has been seen recently ✓"
          >
            {!isReadOnly && (() => {
              const byPerson: Record<string, { name: string; signals: ReviewSignal[] }> = {}
              for (const s of peopleSignals) {
                if (!s.personId) continue
                if (!byPerson[s.personId]) byPerson[s.personId] = { name: s.personName ?? s.personId, signals: [] }
                byPerson[s.personId].signals.push(s)
              }
              return Object.entries(byPerson).map(([personId, { name, signals: pSignals }]) => (
                <div key={personId}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'var(--surf-2)',
                    borderBottom: '1px solid var(--border-1)',
                  }}>
                    <User style={{ width: '12px', height: '12px', color: 'var(--text-3)' }} />
                    <Link
                      href={`/people/${personId}`}
                      style={{ fontSize: 'var(--text-meta)', fontWeight: 600, color: 'var(--text-1)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {name}
                      <ExternalLink style={{ width: '10px', height: '10px', color: 'var(--text-3)' }} />
                    </Link>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                      <ActionBtn onClick={() => router.push(`/meetings?new=1&type=1:1&personId=${personId}`)}>
                        Schedule 1:1
                      </ActionBtn>
                      <ActionBtn onClick={() => router.push(`/evidence?new=1&personId=${personId}`)}>
                        Log note
                      </ActionBtn>
                    </div>
                  </div>
                  {pSignals.map((s, i) => (
                    <SignalRow
                      key={i}
                      signal={s}
                      onDismiss={setDismissTarget}
                    />
                  ))}
                </div>
              ))
            })()}
          </ReviewSection>

          {/* Section 2: Action Items */}
          <ReviewSection
            title="Action Items & Follow-ups"
            signalCount={isReadOnly ? 0 : actionSignals.length}
            criticalCount={isReadOnly ? 0 : actionSignals.filter(s => s.severity === 'critical').length}
            warningCount={isReadOnly ? 0 : actionSignals.filter(s => s.severity === 'warning').length}
            isReviewed={sectionState.actions}
            onMarkReviewed={() => toggleSection('actions')}
            emptyMessage="All action items resolved ✓"
          >
            {!isReadOnly && actionSignals.map((s, i) => (
              <SignalRow
                key={i}
                signal={s}
                onDismiss={setDismissTarget}
                actions={
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {Boolean(s.meta?.taskId) && (
                      <ActionBtn onClick={() => handleMarkTaskDone(s.meta!.taskId as string)}>
                        Mark done
                      </ActionBtn>
                    )}
                    <Link
                      href={`/meetings/${s.entityId}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <ActionBtn onClick={() => {}}>View meeting</ActionBtn>
                    </Link>
                  </div>
                }
              />
            ))}
          </ReviewSection>

          {/* Section 3: Tasks & Deadlines */}
          <ReviewSection
            title="Tasks & Deadlines"
            signalCount={isReadOnly ? 0 : taskSignals.length}
            criticalCount={isReadOnly ? 0 : overdueSignals.filter(s => s.severity === 'critical').length}
            warningCount={isReadOnly ? 0 : overdueSignals.filter(s => s.severity === 'warning').length}
            isReviewed={sectionState.tasks}
            onMarkReviewed={() => toggleSection('tasks')}
            emptyMessage="No overdue tasks and no deadlines this week ✓"
          >
            {!isReadOnly && (
              <>
                {overdueSignals.length > 0 && (
                  <>
                    <div style={{ padding: '8px 16px', background: 'var(--surf-2)', borderBottom: '1px solid var(--border-1)' }}>
                      <span style={{ fontSize: 'var(--text-meta)', fontWeight: 600, color: '#ff6b6b' }}>Overdue</span>
                    </div>
                    {overdueSignals.map((s, i) => (
                      <SignalRow
                        key={i}
                        signal={s}
                        onDismiss={setDismissTarget}
                        actions={
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <ActionBtn onClick={() => handleMarkTaskDone(s.entityId)}>Mark done</ActionBtn>
                            <ActionBtn onClick={() => handleMoveTaskNextWeek(s.entityId, s.meta?.dueDate as string)}>
                              +7 days
                            </ActionBtn>
                          </div>
                        }
                      />
                    ))}
                  </>
                )}
                {upcomingSignals.length > 0 && (
                  <>
                    <div style={{ padding: '8px 16px', background: 'var(--surf-2)', borderBottom: '1px solid var(--border-1)' }}>
                      <span style={{ fontSize: 'var(--text-meta)', fontWeight: 600, color: 'var(--text-2)' }}>Due this week</span>
                    </div>
                    {upcomingSignals.map((s, i) => (
                      <SignalRow
                        key={i}
                        signal={s}
                        onDismiss={setDismissTarget}
                        actions={
                          <ActionBtn onClick={() => handleMarkTaskDone(s.entityId)}>Mark done</ActionBtn>
                        }
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </ReviewSection>

          {/* Section 4: Week in Review */}
          <ReviewSection
            title="Week in Review — What Happened"
            signalCount={0}
            isReviewed={sectionState.week}
            onMarkReviewed={() => toggleSection('week')}
            emptyMessage=""
          >
            {null}
          </ReviewSection>

          {/* Activity summary rendered outside ReviewSection emptyMessage */}
          {(() => {
            if (!activitySummary) return null
            return (
              <div style={{
                background: 'var(--surf)',
                border: '1px solid var(--border-1)',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '-12px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
              }}>
                <div>
                  <div className="form-label">Meetings held</div>
                  <div style={{ fontSize: 'var(--text-section)', fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px' }}>
                    {activitySummary.meetingsHeld.length}
                  </div>
                  {activitySummary.meetingsHeld.slice(0, 5).map(m => (
                    <div key={m.id} style={{ fontSize: 'var(--text-meta)', color: 'var(--text-2)', marginBottom: '2px' }}>
                      · {m.title}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="form-label">Tasks completed</div>
                  <div style={{ fontSize: 'var(--text-section)', fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px' }}>
                    {activitySummary.tasksCompleted.length}
                  </div>
                  {activitySummary.tasksCompleted.slice(0, 5).map(t => (
                    <div key={t.id} style={{ fontSize: 'var(--text-meta)', color: 'var(--text-2)', marginBottom: '2px' }}>
                      · {t.title}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="form-label">Evidence entries</div>
                  <div style={{ fontSize: 'var(--text-section)', fontWeight: 600, color: 'var(--text-1)' }}>
                    {activitySummary.evidenceLogged}
                  </div>
                </div>
                <div>
                  <div className="form-label">Action items created</div>
                  <div style={{ fontSize: 'var(--text-section)', fontWeight: 600, color: 'var(--text-1)' }}>
                    {activitySummary.actionItemsCreated}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Section 5: Reflection */}
          <ReviewSection
            title="Reflection"
            signalCount={0}
            isReviewed={sectionState.reflection}
            onMarkReviewed={() => toggleSection('reflection')}
            emptyMessage=""
          >
            {null}
          </ReviewSection>

          <div style={{
            background: 'var(--surf)',
            border: '1px solid var(--border-1)',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '-12px',
          }}>
            <textarea
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="What went well this week? What needs attention next week? Any concerns about the team?"
              rows={6}
              disabled={isReadOnly}
              style={{
                width: '100%',
                background: 'var(--surf-3)',
                border: '1px solid var(--border-2)',
                borderRadius: '4px',
                color: 'var(--text-1)',
                fontSize: 'var(--text-body)',
                padding: '10px 12px',
                resize: 'vertical',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                boxSizing: 'border-box',
                opacity: isReadOnly ? 0.7 : 1,
              }}
            />
            {!isReadOnly && (
              <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)', margin: '6px 0 0' }}>
                Auto-saves as you type
              </p>
            )}
          </div>

          {/* Section 6: Complete Review */}
          {isCurrentWeek && (
            <div style={{
              background: 'var(--surf)',
              border: `1px solid ${isCompleted ? '#1a3a25' : 'var(--border-1)'}`,
              borderRadius: '8px',
              padding: '20px',
            }}>
              {/* Stats */}
              <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: 'var(--text-meta)', color: 'var(--text-2)' }}>
                  <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{dismissed.length}</span> dismissed
                </div>
                <div style={{ fontSize: 'var(--text-meta)', color: 'var(--text-2)' }}>
                  <span style={{ color: signals.filter(s => s.severity === 'critical').length > 0 ? '#ff6b6b' : 'var(--text-1)', fontWeight: 600 }}>
                    {signals.filter(s => s.severity === 'critical').length}
                  </span> critical remaining
                </div>
                <div style={{ fontSize: 'var(--text-meta)', color: 'var(--text-2)' }}>
                  <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{signals.length}</span> total remaining
                </div>
              </div>

              {!isCompleted && signals.filter(s => s.severity === 'critical' || s.severity === 'warning').length > 0 && (
                <p style={{ fontSize: 'var(--text-meta)', color: '#ffa94d', marginBottom: '12px' }}>
                  You have {signals.filter(s => s.severity === 'critical' || s.severity === 'warning').length} unresolved items.
                  You can still complete the review or address them first.
                </p>
              )}

              {isCompleted ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'var(--text-body)', color: '#00f058', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle style={{ width: '16px', height: '16px' }} />
                    Week reviewed ✓
                  </span>
                  <Link
                    href={`/summary?week=${weekStart}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      background: 'var(--surf-3)', border: '1px solid var(--border-2)',
                      borderRadius: '4px', color: 'var(--text-2)',
                      fontSize: 'var(--text-meta)', padding: '5px 12px',
                      textDecoration: 'none', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Generate weekly summary <ArrowRight style={{ width: '11px', height: '11px' }} />
                  </Link>
                  <button
                    onClick={handleReopen}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-2)',
                      borderRadius: '4px',
                      color: 'var(--text-3)',
                      fontSize: 'var(--text-meta)',
                      padding: '5px 12px',
                      cursor: 'pointer',
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
                    border: 'none',
                    borderRadius: '4px',
                    color: '#000',
                    fontSize: 'var(--text-body)',
                    fontWeight: 600,
                    padding: '10px 24px',
                    cursor: completing ? 'not-allowed' : 'pointer',
                    opacity: completing ? 0.7 : 1,
                  }}
                >
                  {completing ? 'Saving...' : 'Mark Week as Reviewed'}
                </button>
              )}
            </div>
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
  )
}
