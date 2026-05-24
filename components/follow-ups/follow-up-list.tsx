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
    return <span className="status-chip status-chip--done">Done</span>
  }
  if (status === 'cancelled') {
    return <span className="status-chip status-chip--cancelled">Cancelled</span>
  }
  if (overdue) {
    return <span className="status-chip status-chip--overdue">Overdue</span>
  }
  return <span className="status-chip status-chip--open">Open</span>
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
      <p className="text-meta text-3 m-0">No follow-ups</p>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {open.map(fu => {
        const overdue = isOverdue(fu)
        const age = ageDays(fu.createdAt)
        return (
          <div
            key={fu.id}
            className={`follow-up-row ${overdue ? "follow-up-row--overdue" : "follow-up-row--open"}`}
          >
            <div className="follow-up-body">
              <div className="follow-up-title">{fu.title}</div>
              <div className="follow-up-meta">
                {showPerson && fu.personName && (
                  <Link href={`/people/${fu.personId}`} className="follow-up-meta-link">
                    {fu.personName} <ExternalLink />
                  </Link>
                )}
                <span className="follow-up-meta-text">
                  {fu.dueDate ? `Due ${formatDate(fu.dueDate)}` : `${age}d old`}
                </span>
                {fu.sourceName && (
                  <span className="follow-up-meta-text">· from &ldquo;{fu.sourceName}&rdquo;</span>
                )}
                <StatusBadge status={fu.status} overdue={overdue} />
              </div>
            </div>

            <div className="follow-up-actions">
              <button onClick={() => handleComplete(fu.id)} title="Mark complete" className="follow-up-done-btn">
                <Check /> Done
              </button>
              <button onClick={() => handleCancel(fu.id)} title="Cancel" className="follow-up-cancel-btn">
                <X />
              </button>
            </div>
          </div>
        )
      })}

      {closed.length > 0 && (
        <div className="mt-1">
          <button onClick={() => setShowCompleted(s => !s)} className="follow-up-toggle-btn">
            {showCompleted ? <ChevronDown /> : <ChevronRight />}
            {closed.length} closed
          </button>
          {showCompleted && closed.map(fu => (
            <div key={fu.id} className="follow-up-closed-row">
              <div className="flex-1 min-w-0">
                <div className="follow-up-closed-title">{fu.title}</div>
                {fu.completedAt && (
                  <div className="follow-up-completed-at">
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
