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
      <div className="review-banner-done">
        <CheckCircle />
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
      <Link href="/review" className="review-banner review-banner--progress">
        <div className="review-banner__body">
          <div className="review-banner__title">
            Continue your weekly review
          </div>
          <div className="review-banner__sub">
            {signalCount > 0 ? `${signalCount} item${signalCount === 1 ? '' : 's'} remaining` : 'Pick up where you left off'}
          </div>
        </div>
        <ArrowRight className="review-banner__arrow" />
      </Link>
    )
  }

  // No review yet — prompt on Mon/Tue/Wed
  if (!review && isEarlyWeek) {
    return (
      <Link href="/review" className="review-banner review-banner--new">
        <div className="review-banner__body">
          <div className="review-banner__title">
            Start your weekly review
          </div>
          <div className="review-banner__sub">
            {signalCount > 0 ? `${signalCount} signal${signalCount === 1 ? '' : 's'} to check` : 'Review your week and close the loop'}
          </div>
        </div>
        <ArrowRight className="review-banner__arrow" />
      </Link>
    )
  }

  return null
}
