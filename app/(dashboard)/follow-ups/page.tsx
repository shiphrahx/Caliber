'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, ExternalLink } from 'lucide-react'
import {
  getAllFollowUps,
  type FollowUp,
} from '@/lib/services/follow-ups'
import { getPeople, type Person } from '@/lib/services/people'
import { FollowUpForm } from '@/components/follow-ups/follow-up-form'

type ViewMode = 'active' | 'completed' | 'all'

function isOverdue(fu: FollowUp): boolean {
  if (!fu.dueDate || fu.status !== 'open') return false
  return fu.dueDate < new Date().toISOString().split('T')[0]
}

function ageDays(dateStr: string): number {
  return Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (24 * 60 * 60 * 1000))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatusBadge({ fu }: { fu: FollowUp }) {
  if (fu.status === 'completed') return <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: '#00f058', background: '#0d1f14', border: '1px solid #1a3a25', borderRadius: '4px', padding: '2px 6px' }}>Done</span>
  if (fu.status === 'cancelled') return <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)', background: 'var(--surf-3)', border: '1px solid var(--border-2)', borderRadius: '4px', padding: '2px 6px' }}>Cancelled</span>
  if (isOverdue(fu)) return <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: '#ff6b6b', background: '#2a0a0a', border: '1px solid #5a2020', borderRadius: '4px', padding: '2px 6px' }}>Overdue</span>
  return <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-2)', background: 'var(--surf-3)', border: '1px solid var(--border-2)', borderRadius: '4px', padding: '2px 6px' }}>Open</span>
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('active')
  const [personFilter, setPersonFilter] = useState<string>('all')
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)
  const [addingFor, setAddingFor] = useState<Person | null>(null)
  const [showPersonPicker, setShowPersonPicker] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [fus, ps] = await Promise.all([getAllFollowUps(), getPeople()])
      setFollowUps(fus)
      setPeople(ps.filter(p => p.status === 'active'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Filtering
  const visible = followUps.filter(fu => {
    if (viewMode === 'active' && fu.status !== 'open') return false
    if (viewMode === 'completed' && fu.status === 'open') return false
    if (personFilter !== 'all' && fu.personId !== personFilter) return false
    if (showOverdueOnly && !isOverdue(fu)) return false
    return true
  })

  // Stats
  const openCount = followUps.filter(f => f.status === 'open').length
  const overdueCount = followUps.filter(f => isOverdue(f)).length
  const completedThisMonth = followUps.filter(f => {
    if (f.status !== 'completed' || !f.completedAt) return false
    const d = new Date(f.completedAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const resolutionTimes = followUps
    .filter(f => f.status === 'completed' && f.completedAt)
    .map(f => ageDays(f.createdAt))
  const avgResolution = resolutionTimes.length > 0
    ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
    : null


  return (
    <div style={{ padding: '24px 32px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1>Follow-ups</h1>
          <p style={{ marginTop: '4px' }}>Commitments you've made to your team</p>
        </div>
        <button
          onClick={() => setShowPersonPicker(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--surf-3)',
            border: '1px solid var(--border-2)',
            borderRadius: '5px',
            color: 'var(--text-1)',
            fontSize: 'var(--text-meta)',
            fontWeight: 500,
            padding: '7px 14px',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <Plus style={{ width: '13px', height: '13px' }} /> Add follow-up
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Open', value: openCount, color: 'var(--text-1)' },
          { label: 'Overdue', value: overdueCount, color: overdueCount > 0 ? '#ff6b6b' : 'var(--text-1)' },
          { label: 'Done this month', value: completedThisMonth, color: '#00f058' },
          { label: 'Avg resolution', value: avgResolution !== null ? `${avgResolution}d` : '—', color: 'var(--text-2)' },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--surf)', border: '1px solid var(--border-1)', borderRadius: '6px', padding: '12px 14px' }}>
            <div className="form-label">{stat.label}</div>
            <div style={{ fontSize: 'var(--text-section)', fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* View + filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {(['active', 'completed', 'all'] as ViewMode[]).map(v => (
          <button
            key={v}
            onClick={() => setViewMode(v)}
            style={{
              background: viewMode === v ? 'var(--surf-3)' : 'var(--surf-2)',
              border: `1px solid ${viewMode === v ? 'var(--border-3)' : 'var(--border-1)'}`,
              borderRadius: '4px',
              color: viewMode === v ? 'var(--text-1)' : 'var(--text-3)',
              fontSize: 'var(--text-meta)',
              padding: '5px 12px',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              textTransform: 'capitalize',
            }}
          >
            {v}
          </button>
        ))}

        <select
          value={personFilter}
          onChange={e => setPersonFilter(e.target.value)}
          style={{
            background: 'var(--surf-2)',
            border: '1px solid var(--border-1)',
            borderRadius: '4px',
            color: 'var(--text-2)',
            fontSize: 'var(--text-meta)',
            padding: '5px 10px',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <option value="all">All people</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {viewMode === 'active' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-meta)', color: 'var(--text-2)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showOverdueOnly}
              onChange={e => setShowOverdueOnly(e.target.checked)}
            />
            Overdue only
          </label>
        )}
      </div>

      {/* Follow-up rows */}
      {loading ? (
        <p style={{ fontSize: 'var(--text-meta)', color: 'var(--text-3)' }}>Loading...</p>
      ) : visible.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-meta)' }}>
            {viewMode === 'active' ? 'No open follow-ups. Nice work.' : 'Nothing to show.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 100px 120px', gap: '12px', padding: '6px 12px' }}>
            <span className="col-header">Title</span>
            <span className="col-header">Person</span>
            <span className="col-header">Due / Age</span>
            <span className="col-header">Status</span>
            <span className="col-header">Source</span>
          </div>

          {visible.map(fu => (
            <div
              key={fu.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 120px 100px 120px',
                gap: '12px',
                alignItems: 'center',
                padding: '10px 12px',
                background: isOverdue(fu) ? '#1a0a0a' : 'var(--surf)',
                border: `1px solid ${isOverdue(fu) ? '#3a1515' : 'var(--border-1)'}`,
                borderRadius: '5px',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-meta)', color: 'var(--text-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fu.title}
                </div>
                {fu.description && (
                  <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                    {fu.description}
                  </div>
                )}
              </div>

              <div>
                {fu.personName ? (
                  <Link href={`/people/${fu.personId}`} style={{ fontSize: 'var(--text-meta)', color: 'var(--text-2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {fu.personName} <ExternalLink style={{ width: '9px', height: '9px' }} />
                  </Link>
                ) : (
                  <span style={{ fontSize: 'var(--text-meta)', color: 'var(--text-3)' }}>—</span>
                )}
              </div>

              <div style={{ fontSize: 'var(--text-meta)', color: 'var(--text-3)' }}>
                {fu.dueDate ? formatDate(fu.dueDate) : `${ageDays(fu.createdAt)}d old`}
              </div>

              <div><StatusBadge fu={fu} /></div>

              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fu.sourceName ?? (fu.sourceType ?? '—')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Person picker for new follow-up */}
      {showPersonPicker && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowPersonPicker(false)}
        >
          <div
            style={{ background: 'var(--surf-2)', border: '1px solid var(--border-2)', borderRadius: '8px', padding: '20px', width: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}
            onClick={e => e.stopPropagation()}
          >
            <span style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--text-1)' }}>Who is this follow-up for?</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>
              {people.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setAddingFor(p); setShowPersonPicker(false) }}
                  style={{ background: 'var(--surf-3)', border: '1px solid var(--border-2)', borderRadius: '4px', color: 'var(--text-1)', fontSize: 'var(--text-meta)', padding: '8px 12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)' }}
                >
                  {p.name} {p.role && <span style={{ color: 'var(--text-3)' }}>· {p.role}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {addingFor && (
        <FollowUpForm
          personId={addingFor.id}
          personName={addingFor.name}
          sourceType="manual"
          onSaved={() => { setAddingFor(null); load() }}
          onCancel={() => setAddingFor(null)}
        />
      )}
    </div>
  )
}
