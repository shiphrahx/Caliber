'use client'

import { useState } from 'react'

interface ReviewSectionProps {
  title: string
  icon?: React.ReactNode
  signalCount: number
  criticalCount?: number
  warningCount?: number
  infoCount?: number
  badgeLabel?: string
  badgeVariant?: 'crit' | 'warn' | 'info' | 'ok'
  isReviewed: boolean
  onMarkReviewed: (reviewed: boolean) => void
  showCheckbox?: boolean
  nonInteractiveHeader?: boolean
  defaultExpanded?: boolean
  children: React.ReactNode
  emptyMessage?: string
}

const BADGE_STYLES: Record<string, { background: string; color: string }> = {
  crit: { background: '#1a0a0a', color: '#f87171' },
  warn: { background: '#1e0d00', color: '#f97316' },
  info: { background: '#0a1e28', color: '#60a5fa' },
  ok:   { background: '#0a1e0a', color: '#00f058' },
}

export function ReviewSection({
  title,
  icon,
  signalCount,
  criticalCount = 0,
  warningCount = 0,
  infoCount = 0,
  badgeLabel,
  badgeVariant,
  isReviewed,
  onMarkReviewed,
  showCheckbox = true,
  nonInteractiveHeader = false,
  defaultExpanded = true,
  children,
  emptyMessage,
}: ReviewSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className={`review-section ${isReviewed ? "review-section--reviewed" : "review-section--default"}`}>
      {/* Header */}
      <div
        className={`review-section-header ${nonInteractiveHeader ? "review-section-header--static" : "review-section-header--interactive"}`}
        onClick={() => { if (!nonInteractiveHeader) setExpanded(e => !e) }}
      >
        {/* Chevron SVG */}
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className="review-section-chevron"
          style={{
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            opacity: nonInteractiveHeader ? 0 : 1,
          }}
        >
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Section icon */}
        <span className="review-section-icon">{icon}</span>

        {/* Title */}
        <span className="review-section-title">{title}</span>

        {/* Badges */}
        {!isReviewed && (
          <span className="review-section-badges">
            {criticalCount > 0 && (
              <span className="review-badge review-badge--crit">{criticalCount} critical</span>
            )}
            {warningCount > 0 && (
              <span className="review-badge review-badge--warn">{warningCount} {warningCount === 1 ? 'warning' : 'warnings'}</span>
            )}
            {infoCount > 0 && !criticalCount && !warningCount && (
              <span className="review-badge review-badge--info">{infoCount} info</span>
            )}
            {badgeLabel && badgeVariant && (
              <span className="review-badge" style={BADGE_STYLES[badgeVariant]}>
                {badgeLabel}
              </span>
            )}
          </span>
        )}

        {isReviewed && (
          <span className="review-done-label">✓ Reviewed</span>
        )}

        {/* Checkbox */}
        {showCheckbox && (
          <div
            onClick={e => { e.stopPropagation(); onMarkReviewed(!isReviewed) }}
            className={`review-checkbox ${isReviewed ? "review-checkbox--checked" : "review-checkbox--unchecked"}`}
            title={isReviewed ? 'Unmark as reviewed' : 'Mark as reviewed'}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: isReviewed ? 1 : 0 }}>
              <path d="M2 5l2.5 2.5L8 3" stroke="#0a1a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Body */}
      {expanded && (
        <div className={`review-section-body ${signalCount === 0 && !children ? "review-section-body--empty" : ""}`}>
          {signalCount === 0 && !children ? (
            <div className="review-empty-state">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                <path d="M4.5 7l2 2 3-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {emptyMessage ?? 'All clear'}
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  )
}
