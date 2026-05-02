'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'
import { completeFollowUp, cancelFollowUp, type FollowUp } from '@/lib/services/follow-ups'

interface FollowUpListProps {
  followUps: FollowUp[]
  onChanged: () => void
  showPerson?: boolean
}

function ageDays(dateStr: string): number {
  const created = new Date(dateStr)
  const today = new Date()
  return Math.floor((today.getTime() - created.getTime()) / (24 * 60 * 60 * 1000))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function isOverdue(fu: FollowUp): boolean {
  if (!fu.dueDate || fu.status !== 'open') return false
  return fu.dueDate < new Date().toISOString().split('T')[0]
}

function StatusBadge({ status, overdue }: { status: FollowUp['status']; overdue: boolean }) {
  if (status === 'completed') {
    return (
      <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: '#00f058', background: '#0d1f14', border: '1px solid #1a3a25', borderRadius: '4px', padding: '2px 6px' }}>
        Done
      </span>
    )
  }
  if (status === 'cancelled') {
    return (
      <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)', background: 'var(--surf-3)', border: '1px solid var(--border-2)', borderRadius: '4px', padding: '2px 6px' }}>
        Cancelled
      </span>
    )
  }
  if (overdue) {
    return (
      <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: '#ff6b6b', background: '#2a0a0a', border: '1px solid #5a2020', borderRadius: '4px', padding: '2px 6px' }}>
        Overdue
      </span>
    )
  }
  return (
    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-2)', background: 'var(--surf-3)', border: '1px solid var(--border-2)', borderRadius: '4px', padding: '2px 6px' }}>
      Open
    </span>
  )
}

export function FollowUpList({ followUps, onChanged, showPerson = false }: FollowUpListProps) {
  const [showCompleted, setShowCompleted] = useState(false)

  const open = followUps.filter(f => f.status === 'open')
  const closed = followUps.filter(f => f.status !== 'open')

  const handleComplete = async (id: string) => {
    await completeFollowUp(id)
    onChanged()
  }

  const handleCancel = async (id: string) => {
    await cancelFollowUp(id)
    onChanged()
  }

  if (followUps.length === 0) {
    return (
      <p style={{ fontSize: 'var(--text-meta)', color: 'var(--text-3)', margin: 0 }}>
        No follow-ups
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {open.map(fu => {
        const overdue = isOverdue(fu)
        const age = ageDays(fu.createdAt)
        return (
          <div
            key={fu.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              background: overdue ? '#1a0a0a' : 'var(--surf-2)',
              border: `1px solid ${overdue ? '#3a1515' : 'var(--border-1)'}`,
              borderRadius: '5px',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-meta)', color: 'var(--text-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fu.title}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                {showPerson && fu.personName && (
                  <Link href={`/people/${fu.personId}`} style={{ fontSize: 'var(--text-caption)', color: 'var(--text-2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {fu.personName} <ExternalLink style={{ width: '9px', height: '9px' }} />
                  </Link>
                )}
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)' }}>
                  {fu.dueDate ? `Due ${formatDate(fu.dueDate)}` : `${age}d old`}
                </span>
                {fu.sourceName && (
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)' }}>
                    · from "{fu.sourceName}"
                  </span>
                )}
                <StatusBadge status={fu.status} overdue={overdue} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              <button
                onClick={() => handleComplete(fu.id)}
                title="Mark complete"
                style={{
                  background: 'none',
                  border: '1px solid var(--border-2)',
                  borderRadius: '4px',
                  color: '#00f058',
                  cursor: 'pointer',
                  padding: '3px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: 'var(--text-caption)',
                }}
              >
                <Check style={{ width: '10px', height: '10px' }} /> Done
              </button>
              <button
                onClick={() => handleCancel(fu.id)}
                title="Cancel"
                style={{
                  background: 'none',
                  border: '1px solid var(--border-2)',
                  borderRadius: '4px',
                  color: 'var(--text-3)',
                  cursor: 'pointer',
                  padding: '3px 4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X style={{ width: '10px', height: '10px' }} />
              </button>
            </div>
          </div>
        )
      })}

      {closed.length > 0 && (
        <div style={{ marginTop: '4px' }}>
          <button
            onClick={() => setShowCompleted(s => !s)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-3)',
              fontSize: 'var(--text-caption)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 0',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {showCompleted ? <ChevronDown style={{ width: '11px', height: '11px' }} /> : <ChevronRight style={{ width: '11px', height: '11px' }} />}
            {closed.length} closed
          </button>
          {showCompleted && closed.map(fu => (
            <div
              key={fu.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 12px',
                opacity: 0.6,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-meta)', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fu.title}
                </div>
                {fu.completedAt && (
                  <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-3)' }}>
                    Completed {new Date(fu.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                )}
              </div>
              <StatusBadge status={fu.status} overdue={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
