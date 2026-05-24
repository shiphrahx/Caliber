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
  if (fu.status === 'completed') return <span className="fu-badge fu-badge--done">Done</span>
  if (fu.status === 'cancelled') return <span className="fu-badge fu-badge--cancelled">Cancelled</span>
  if (isOverdue(fu)) return <span className="fu-badge fu-badge--overdue">Overdue</span>
  return <span className="fu-badge fu-badge--open">Open</span>
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
    <>
      <div className="page-topbar">
        <span className="page-topbar-title">Follow-ups</span>
        <button className="btn-primary" onClick={() => setShowPersonPicker(true)}>
          <Plus style={{ width: '13px', height: '13px' }} /> Add follow-up
        </button>
      </div>
      <div className="page-content">

        {/* Stats bar */}
        <div className="fu-stats-grid">
          {[
            { label: 'Open', value: openCount, color: 'var(--text-1)' },
            { label: 'Overdue', value: overdueCount, color: overdueCount > 0 ? '#ff6b6b' : 'var(--text-1)' },
            { label: 'Done this month', value: completedThisMonth, color: '#00f058' },
            { label: 'Avg resolution', value: avgResolution !== null ? `${avgResolution}d` : '—', color: 'var(--text-2)' },
          ].map(stat => (
            <div key={stat.label} className="fu-stat-card">
              <div className="form-label">{stat.label}</div>
              <div className="fu-stat-value" style={{ color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* View + filters */}
        <div className="fu-filters-row">
          {(['active', 'completed', 'all'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className="fu-view-btn"
              style={{
                background: viewMode === v ? 'var(--surf-3)' : 'var(--surf-2)',
                border: `1px solid ${viewMode === v ? 'var(--border-3)' : 'var(--border-1)'}`,
                color: viewMode === v ? 'var(--text-1)' : 'var(--text-3)',
              }}
            >
              {v}
            </button>
          ))}

          <select
            value={personFilter}
            onChange={e => setPersonFilter(e.target.value)}
            className="fu-filter-select"
          >
            <option value="all">All people</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {viewMode === 'active' && (
            <label className="fu-overdue-label">
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
          <p className="fu-loading">Loading...</p>
        ) : visible.length === 0 ? (
          <div className="fu-empty">
            <p className="fu-empty-text">
              {viewMode === 'active' ? 'No open follow-ups. Nice work.' : 'Nothing to show.'}
            </p>
          </div>
        ) : (
          <div className="fu-list">
            {/* Column headers */}
            <div className="fu-col-headers">
              <span className="col-header">Title</span>
              <span className="col-header">Person</span>
              <span className="col-header">Due / Age</span>
              <span className="col-header">Status</span>
              <span className="col-header">Source</span>
            </div>

            {visible.map(fu => (
              <div
                key={fu.id}
                className="fu-row"
                style={{
                  background: isOverdue(fu) ? '#1a0a0a' : 'var(--surf)',
                  border: `1px solid ${isOverdue(fu) ? '#3a1515' : 'var(--border-1)'}`,
                }}
              >
                <div className="fu-row-title">
                  <div className="fu-title-text">{fu.title}</div>
                  {fu.description && (
                    <div className="fu-desc-text">{fu.description}</div>
                  )}
                </div>

                <div>
                  {fu.personName ? (
                    <Link href={`/people/${fu.personId}`} className="fu-person-link">
                      {fu.personName} <ExternalLink />
                    </Link>
                  ) : (
                    <span className="fu-person-none">—</span>
                  )}
                </div>

                <div className="fu-date-cell">
                  {fu.dueDate ? formatDate(fu.dueDate) : `${ageDays(fu.createdAt)}d old`}
                </div>

                <div><StatusBadge fu={fu} /></div>

                <div className="fu-source-cell">
                  {fu.sourceName ?? (fu.sourceType ?? '—')}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Person picker for new follow-up */}
        {showPersonPicker && (
          <div className="fu-picker-overlay" onClick={() => setShowPersonPicker(false)}>
            <div className="fu-picker-card" onClick={e => e.stopPropagation()}>
              <div>
                <span className="fu-picker-title">Who is this follow-up for?</span>
                <p className="fu-picker-sub">Select a person to continue</p>
              </div>
              <div className="fu-picker-list">
                {loading ? (
                  <p className="fu-picker-loading">Loading...</p>
                ) : people.length === 0 ? (
                  <p className="fu-picker-empty">No active people found.</p>
                ) : people.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setAddingFor(p); setShowPersonPicker(false) }}
                    className="fu-picker-btn"
                  >
                    {p.name} {p.role && <span className="fu-picker-btn-role">· {p.role}</span>}
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
    </>
  )
}
