'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { getMondayOfWeek, getWeeklyReview, type WeeklyReview } from '@/lib/services/weekly-review'
import { fetchSignalCounts } from '@/lib/hooks/use-weekly-review-signals'

export function WeeklyReviewBanner() {
  const [review, setReview] = useState<WeeklyReview | null | undefined>(undefined)
  const [signalCount, setSignalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const weekStart = getMondayOfWeek()
        const r = await getWeeklyReview(weekStart)
        setReview(r)
        if (!r || r.status === 'in_progress') {
          const counts = await fetchSignalCounts()
          setSignalCount(counts.total)
        }
      } catch {
        // non-critical
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading || review === undefined) return null

  // Completed — show subtle badge
  if (review?.status === 'completed') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        background: '#0d1f14',
        border: '1px solid #1a3a25',
        borderRadius: '8px',
        fontSize: 'var(--text-meta)',
        color: '#00c44a',
      }}>
        <CheckCircle style={{ width: '13px', height: '13px' }} />
        Week reviewed ✓
      </div>
    )
  }

  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon
  const isEarlyWeek = dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 2

  // In-progress review
  if (review?.status === 'in_progress') {
    return (
      <Link href="/review" style={{ textDecoration: 'none' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          background: '#1a1a2e',
          border: '1px solid #2a2a4a',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--text-1)', marginBottom: '2px' }}>
              Continue your weekly review
            </div>
            <div style={{ fontSize: 'var(--text-meta)', color: 'var(--text-2)' }}>
              {signalCount > 0 ? `${signalCount} item${signalCount === 1 ? '' : 's'} remaining` : 'Pick up where you left off'}
            </div>
          </div>
          <ArrowRight style={{ width: '14px', height: '14px', color: 'var(--text-3)' }} />
        </div>
      </Link>
    )
  }

  // No review yet — prompt on Mon/Tue/Wed
  if (!review && isEarlyWeek) {
    return (
      <Link href="/review" style={{ textDecoration: 'none' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #0f1f15 0%, #1a1a2e 100%)',
          border: '1px solid #2a3a30',
          borderRadius: '8px',
          cursor: 'pointer',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--text-1)', marginBottom: '2px' }}>
              Start your weekly review
            </div>
            <div style={{ fontSize: 'var(--text-meta)', color: 'var(--text-2)' }}>
              {signalCount > 0 ? `${signalCount} signal${signalCount === 1 ? '' : 's'} to check` : 'Review your week and close the loop'}
            </div>
          </div>
          <ArrowRight style={{ width: '14px', height: '14px', color: 'var(--text-3)' }} />
        </div>
      </Link>
    )
  }

  return null
}
