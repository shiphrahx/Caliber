'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle } from 'lucide-react'

interface ReviewSectionProps {
  title: string
  signalCount: number
  criticalCount?: number
  warningCount?: number
  isReviewed: boolean
  onMarkReviewed: (reviewed: boolean) => void
  children: React.ReactNode
  emptyMessage?: string
}

export function ReviewSection({
  title,
  signalCount,
  criticalCount = 0,
  warningCount = 0,
  isReviewed,
  onMarkReviewed,
  children,
  emptyMessage,
}: ReviewSectionProps) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div
      style={{
        background: 'var(--surf)',
        border: `1px solid ${isReviewed ? '#1a3a25' : 'var(--border-1)'}`,
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          background: isReviewed ? '#0f1f15' : 'var(--surf-2)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <span style={{ color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>
          {expanded
            ? <ChevronDown style={{ width: '14px', height: '14px' }} />
            : <ChevronRight style={{ width: '14px', height: '14px' }} />
          }
        </span>

        <span style={{ flex: 1, fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--text-1)' }}>
          {title}
        </span>

        {/* Signal badges */}
        {!isReviewed && signalCount > 0 && (
          <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {criticalCount > 0 && (
              <span style={{
                fontSize: 'var(--text-caption)',
                fontWeight: 600,
                background: '#3a1515',
                color: '#ff6b6b',
                border: '1px solid #5a2020',
                borderRadius: '4px',
                padding: '2px 6px',
              }}>
                {criticalCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span style={{
                fontSize: 'var(--text-caption)',
                fontWeight: 600,
                background: '#2a2010',
                color: '#ffa94d',
                border: '1px solid #4a3820',
                borderRadius: '4px',
                padding: '2px 6px',
              }}>
                {warningCount} warning
              </span>
            )}
          </span>
        )}

        {isReviewed && (
          <span style={{ fontSize: 'var(--text-meta)', color: '#00f058', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle style={{ width: '13px', height: '13px' }} />
            Reviewed
          </span>
        )}

        {/* Mark reviewed toggle */}
        <div
          onClick={e => { e.stopPropagation(); onMarkReviewed(!isReviewed) }}
          style={{
            width: '18px',
            height: '18px',
            borderRadius: '4px',
            border: `2px solid ${isReviewed ? '#00f058' : 'var(--border-2)'}`,
            background: isReviewed ? '#00f058' : 'transparent',
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isReviewed ? 'Unmark as reviewed' : 'Mark as reviewed'}
        >
          {isReviewed && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l3 3 5-6" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>

      {/* Section body */}
      {expanded && (
        <div style={{ padding: signalCount === 0 ? '16px' : '0' }}>
          {signalCount === 0 ? (
            <p style={{ fontSize: 'var(--text-meta)', color: '#00f058', margin: 0 }}>
              {emptyMessage ?? '✓ All clear'}
            </p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  )
}
