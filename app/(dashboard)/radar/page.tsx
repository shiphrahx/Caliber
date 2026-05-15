'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle, AlertTriangle, Info, ChevronDown, ChevronRight, Plus,
  CheckCircle, ExternalLink
} from 'lucide-react'
import { useRadar, type PersonAttention } from '@/lib/hooks/use-person-signals'
import { completeFollowUp, getFollowUpsForPerson, markFollowUpsSurfaced, type FollowUp } from '@/lib/services/follow-ups'
import { updateTask } from '@/lib/services/tasks'
import { getMeetings } from '@/lib/services/meetings'
import { FollowUpForm } from '@/components/follow-ups/follow-up-form'
import { FollowUpList } from '@/components/follow-ups/follow-up-list'
import { scoreToColor, scoreToBg } from '@/lib/signals/types'
import type { Signal } from '@/lib/signals/types'
import { AIButton } from '@/components/ui/ai-button'
import { useAIConfig } from '@/lib/hooks/use-ai-config'
import { callAI, handleAIError } from '@/lib/services/ai'
import { RECURRING_TOPICS_SYSTEM } from '@/lib/ai/prompts'

// ── Helpers ───────────────────────────────────────────────────────────────────

function SeverityIcon({ severity }: { severity: Signal['severity'] }) {
  if (severity === 'critical') return <AlertCircle style={{ width: '12px', height: '12px', color: '#ff6b6b', flexShrink: 0 }} />
  if (severity === 'warning') return <AlertTriangle style={{ width: '12px', height: '12px', color: '#ffa94d', flexShrink: 0 }} />
  return <Info style={{ width: '12px', height: '12px', color: 'var(--text-3)', flexShrink: 0 }} />
}

function ScoreBadge({ score }: { score: number }) {
  const color = scoreToColor(score)
  const bg = scoreToBg(score)
  return (
    <span style={{
      fontSize: 'var(--text-caption)',
      fontWeight: 700,
      color,
      background: bg,
      border: `1px solid ${color}40`,
      borderRadius: '4px',
      padding: '2px 8px',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {score}
    </span>
  )
}

// ── Attention filter ──────────────────────────────────────────────────────────

type SeverityFilter = 'all' | 'critical' | 'warning'

function matchesSeverityFilter(pa: PersonAttention, filter: SeverityFilter): boolean {
  if (filter === 'all') return true
  return pa.signals.some(s => s.severity === filter)
}

// ── Person attention card ─────────────────────────────────────────────────────

function PersonCard({
  pa,
  onRefresh,
}: {
  pa: PersonAttention
  onRefresh: () => void
}) {
  const router = useRouter()
  const [showFollowUps, setShowFollowUps] = useState(false)
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loadingFollowUps, setLoadingFollowUps] = useState(false)
  const [addingFollowUp, setAddingFollowUp] = useState(false)

  const loadFollowUps = useCallback(async () => {
    setLoadingFollowUps(true)
    try {
      const data = await getFollowUpsForPerson(pa.personId)
      setFollowUps(data)
      // Mark any open follow-ups as surfaced
      const open = data.filter(f => f.status === 'open')
      if (open.length > 0) {
        await markFollowUpsSurfaced(open.map(f => ({ id: f.id, timesSurfaced: f.timesSurfaced })))
      }
    } finally {
      setLoadingFollowUps(false)
    }
  }, [pa.personId])

  const toggleFollowUps = () => {
    if (!showFollowUps && followUps.length === 0) loadFollowUps()
    setShowFollowUps(s => !s)
  }

  const handleMarkTaskDone = async (taskId: string) => {
    await updateTask(taskId, { status: 'Done' })
    onRefresh()
  }

  return (
    <div style={{
      background: 'var(--surf)',
      border: '1px solid var(--border-1)',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        background: 'var(--surf-2)',
        borderBottom: '1px solid var(--border-1)',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'var(--surf-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'var(--text-meta)',
          fontWeight: 600,
          color: 'var(--text-2)',
          flexShrink: 0,
        }}>
          {pa.personName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link
              href={`/people/${pa.personId}`}
              style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--text-1)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {pa.personName}
              <ExternalLink style={{ width: '10px', height: '10px', color: 'var(--text-3)' }} />
            </Link>
            <ScoreBadge score={pa.score} />
          </div>
          {pa.personRole && (
            <div style={{ fontSize: 'var(--text-meta)', color: 'var(--text-2)', marginTop: '2px' }}>{pa.personRole}</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={() => router.push(`/meetings?new=1&type=1:1&personId=${pa.personId}`)}
            style={{ background: 'var(--surf-3)', border: '1px solid var(--border-2)', borderRadius: '4px', color: 'var(--text-2)', fontSize: 'var(--text-caption)', padding: '4px 8px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}
          >
            Schedule 1:1
          </button>
          <button
            onClick={() => router.push(`/evidence?new=1&personId=${pa.personId}`)}
            style={{ background: 'var(--surf-3)', border: '1px solid var(--border-2)', borderRadius: '4px', color: 'var(--text-2)', fontSize: 'var(--text-caption)', padding: '4px 8px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)' }}
          >
            Log evidence
          </button>
          <button
            onClick={() => setAddingFollowUp(true)}
            style={{ background: 'var(--surf-3)', border: '1px solid var(--border-2)', borderRadius: '4px', color: 'var(--text-2)', fontSize: 'var(--text-caption)', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontFamily: 'var(--font-sans)' }}
          >
            <Plus style={{ width: '10px', height: '10px' }} /> Follow-up
          </button>
        </div>
      </div>

      {/* Signals list */}
      {pa.signals.length > 0 && (
        <div>
          {pa.signals.map((signal, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderBottom: '1px solid var(--border-1)',
                fontSize: 'var(--text-meta)',
              }}
            >
              <SeverityIcon severity={signal.severity} />
              <span style={{ flex: 1, color: 'var(--text-2)' }}>{signal.message}</span>
              {/* Quick actions per signal type */}
              {signal.type === 'overdue_task' && (
                <button
                  onClick={() => handleMarkTaskDone(signal.entityId)}
                  style={{ background: 'none', border: '1px solid var(--border-2)', borderRadius: '4px', color: 'var(--text-3)', fontSize: 'var(--text-caption)', padding: '2px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Mark done
                </button>
              )}
              {(signal.type === 'overdue_follow_up' || signal.type === 'ageing_follow_up' || signal.type === 'surfaced_follow_up') && (
                <button
                  onClick={async () => { await completeFollowUp(signal.entityId); onRefresh() }}
                  style={{ background: 'none', border: '1px solid var(--border-2)', borderRadius: '4px', color: '#00f058', fontSize: 'var(--text-caption)', padding: '2px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Complete
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Follow-ups section */}
      {pa.openFollowUpCount > 0 && (
        <div style={{ borderTop: pa.signals.length > 0 ? 'none' : '1px solid var(--border-1)' }}>
          <button
            onClick={toggleFollowUps}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              width: '100%',
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderTop: '1px solid var(--border-1)',
              color: 'var(--text-3)',
              fontSize: 'var(--text-caption)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              textAlign: 'left',
            }}
          >
            {showFollowUps ? <ChevronDown style={{ width: '11px', height: '11px' }} /> : <ChevronRight style={{ width: '11px', height: '11px' }} />}
            {pa.openFollowUpCount} open follow-up{pa.openFollowUpCount !== 1 ? 's' : ''}
          </button>

          {showFollowUps && (
            <div style={{ padding: '4px 16px 12px' }}>
              {loadingFollowUps ? (
                <p style={{ fontSize: 'var(--text-meta)', color: 'var(--text-3)' }}>Loading...</p>
              ) : (
                <FollowUpList followUps={followUps} onChanged={() => { loadFollowUps(); onRefresh() }} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Add follow-up form */}
      {addingFollowUp && (
        <FollowUpForm
          personId={pa.personId}
          personName={pa.personName}
          sourceType="manual"
          onSaved={() => { setAddingFollowUp(false); loadFollowUps(); onRefresh() }}
          onCancel={() => setAddingFollowUp(false)}
        />
      )}
    </div>
  )
}

// ── Radar page ────────────────────────────────────────────────────────────────

interface RecurringTopic {
  topic: string
  frequency: number
  first_seen: string
  latest: string
  escalating: boolean
}

export default function RadarPage() {
  const { people, loading, error, refetch } = useRadar()
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [showAllClear, setShowAllClear] = useState(false)
  const [recurringTopics, setRecurringTopics] = useState<RecurringTopic[]>([])
  const [detectingTopics, setDetectingTopics] = useState(false)
  const [topicsDetected, setTopicsDetected] = useState(false)
  const aiConfig = useAIConfig()

  const handleDetectRecurringTopics = async () => {
    setDetectingTopics(true)
    try {
      const meetings = await getMeetings()
      const withNotes = meetings
        .filter(m => m.notes)
        .sort((a, b) => a.meetingDate.localeCompare(b.meetingDate))
        .slice(0, 30)
      if (withNotes.length === 0) {
        setRecurringTopics([])
        setTopicsDetected(true)
        return
      }
      const notesText = withNotes.map(m => {
        const plain = (m.notes ?? '').replace(/<[^>]+>/g, ' ').trim()
        return `[${m.meetingDate}] ${m.title}: ${plain.slice(0, 400)}`
      }).join('\n\n')
      const result = await callAI({
        systemPrompt: RECURRING_TOPICS_SYSTEM,
        userPrompt: notesText,
        maxTokens: 600,
        temperature: 0.2,
      })
      const jsonMatch = result.content.match(/\[[\s\S]*\]/)
      try {
        setRecurringTopics(jsonMatch ? JSON.parse(jsonMatch[0]) : [])
      } catch {
        setRecurringTopics([])
      }
      setTopicsDetected(true)
    } catch (err) {
      handleAIError(err)
    } finally {
      setDetectingTopics(false)
    }
  }

  const needsAttention = people.filter(p => p.score > 0)
  const allClear = people.filter(p => p.score === 0)

  const filtered = needsAttention
    .filter(p => matchesSeverityFilter(p, severityFilter))

  const criticalCount = people.filter(p => p.signals.some(s => s.severity === 'critical')).length

  if (loading) {
    return (
      <div style={{ padding: '32px', color: 'var(--text-2)', fontSize: 'var(--text-meta)' }}>
        Computing attention signals...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '32px' }}>
        <p style={{ color: '#ff6b6b', fontSize: 'var(--text-meta)' }}>{error}</p>
      </div>
    )
  }

  return (
    <>
      <div className="page-topbar">
        <span className="page-topbar-title">People Radar</span>
      </div>
      <div className="page-content">
      {/* Header subtitle */}
      <div style={{ marginBottom: '20px' }}>
        <p>
          {needsAttention.length > 0
            ? `${needsAttention.length} person${needsAttention.length !== 1 ? 's' : ''} need${needsAttention.length === 1 ? 's' : ''} attention`
            : 'All clear — everyone is on track'}
        </p>
      </div>

      {/* Quick stats */}
      {needsAttention.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ background: '#2a0a0a', border: '1px solid #5a2020', borderRadius: '6px', padding: '10px 16px', minWidth: '100px' }}>
            <div style={{ fontSize: 'var(--text-overline)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Critical</div>
            <div style={{ fontSize: 'var(--text-section)', fontWeight: 700, color: '#ff6b6b' }}>{criticalCount}</div>
          </div>
          <div style={{ background: 'var(--surf)', border: '1px solid var(--border-1)', borderRadius: '6px', padding: '10px 16px', minWidth: '100px' }}>
            <div style={{ fontSize: 'var(--text-overline)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Needs attention</div>
            <div style={{ fontSize: 'var(--text-section)', fontWeight: 700, color: 'var(--text-1)' }}>{needsAttention.length}</div>
          </div>
          <div style={{ background: '#0d1f14', border: '1px solid #1a3a25', borderRadius: '6px', padding: '10px 16px', minWidth: '100px' }}>
            <div style={{ fontSize: 'var(--text-overline)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>All clear</div>
            <div style={{ fontSize: 'var(--text-section)', fontWeight: 700, color: '#00f058' }}>{allClear.length}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {needsAttention.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {(['all', 'critical', 'warning'] as SeverityFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setSeverityFilter(f)}
              style={{
                background: severityFilter === f ? 'var(--surf-3)' : 'var(--surf-2)',
                border: `1px solid ${severityFilter === f ? 'var(--border-3)' : 'var(--border-1)'}`,
                borderRadius: '4px',
                color: severityFilter === f ? 'var(--text-1)' : 'var(--text-3)',
                fontSize: 'var(--text-meta)',
                padding: '5px 12px',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                textTransform: 'capitalize',
              }}
            >
              {f === 'all' ? 'All signals' : f}
            </button>
          ))}
        </div>
      )}

      {/* Person cards */}
      {filtered.length === 0 && needsAttention.length > 0 && (
        <p style={{ fontSize: 'var(--text-meta)', color: 'var(--text-3)' }}>No people match this filter.</p>
      )}

      {people.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--text-2)', marginBottom: '12px' }}>No active team members yet.</p>
          <Link href="/people" style={{ color: '#00f058', fontSize: 'var(--text-meta)', textDecoration: 'none' }}>
            Add your team →
          </Link>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(pa => (
          <PersonCard key={pa.personId} pa={pa} onRefresh={refetch} />
        ))}
      </div>

      {/* All clear section */}
      {allClear.length > 0 && (
        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-1)', paddingTop: '16px' }}>
          <button
            onClick={() => setShowAllClear(s => !s)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: 'var(--text-3)',
              fontSize: 'var(--text-meta)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              padding: 0,
              marginBottom: '10px',
            }}
          >
            {showAllClear ? <ChevronDown style={{ width: '13px', height: '13px' }} /> : <ChevronRight style={{ width: '13px', height: '13px' }} />}
            <CheckCircle style={{ width: '13px', height: '13px', color: '#00f058' }} />
            People with no signals ({allClear.length})
          </button>

          {showAllClear && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {allClear.map(pa => (
                <div key={pa.personId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'var(--surf-2)', borderRadius: '5px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00f058', flexShrink: 0 }} />
                  <Link href={`/people/${pa.personId}`} style={{ fontSize: 'var(--text-meta)', color: 'var(--text-2)', textDecoration: 'none' }}>
                    {pa.personName}
                  </Link>
                  {pa.personRole && (
                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)' }}>{pa.personRole}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recurring Topics */}
      <div style={{ marginTop: '28px', borderTop: '1px solid var(--border-1)', paddingTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Recurring Topics</h2>
            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)', marginTop: '2px' }}>
              Topics that surface across 3+ meeting notes
            </p>
          </div>
          <AIButton
            configured={aiConfig.configured}
            loading={aiConfig.loading}
            generating={detectingTopics}
            onClick={handleDetectRecurringTopics}
            label={topicsDetected ? "Re-analyse" : "Detect recurring topics"}
            tooltip={aiConfig.tooltip}
            showSetupLink={true}
          />
        </div>

        {topicsDetected && recurringTopics.length === 0 && (
          <p style={{ fontSize: 'var(--text-meta)', color: 'var(--text-3)' }}>No recurring topics found in recent meeting notes.</p>
        )}

        {recurringTopics.length > 0 && (
          <div style={{ display: 'grid', gap: '8px' }}>
            {recurringTopics.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '12px 16px', background: 'var(--surf)', border: `1px solid ${t.escalating ? '#f87171' : 'var(--border-1)'}`,
                borderRadius: '6px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 'var(--text-body)' }}>{t.topic}</span>
                    {t.escalating && (
                      <span style={{ fontSize: 'var(--text-caption)', color: '#f87171', background: '#2a0a0a', border: '1px solid #f8717140', borderRadius: '3px', padding: '1px 6px' }}>Escalating</span>
                    )}
                  </div>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)' }}>
                    {t.frequency} meeting{t.frequency !== 1 ? 's' : ''} · first {t.first_seen} · latest {t.latest}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </>
  )
}
