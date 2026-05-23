'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  loadSignalData,
  computeTaskSignals,
  computePeopleSignals,
  computeFollowUpSignals,
  computeActionItemSignals,
  computeSentimentDriftSignals,
  computeGoalSignals,
  sortSignals,
  buildDismissedSet,
} from '@/lib/signals/compute'
import type { Signal } from '@/lib/signals/types'
import type { DismissedItem } from '@/lib/services/weekly-review'

// Re-export shared types so existing consumers keep working without import changes
export type { SignalSeverity, SignalType, Signal as ReviewSignal } from '@/lib/signals/types'

export interface SignalsData {
  signals: Signal[]
  loading: boolean
  error: string | null
  refetch: () => void
}

async function computeAllSignals(dismissedItems: DismissedItem[]): Promise<Signal[]> {
  const today = new Date()
  const dismissedSet = buildDismissedSet(
    dismissedItems.map(d => ({ itemType: d.itemType, referenceId: d.referenceId }))
  )

  const data = await loadSignalData()

  // Build evidenceByPerson map for sentiment drift computation (uses 60-day window)
  const evidenceByPerson = new Map<string, Array<{ occurred_at: string; sentiment: string | null }>>()
  for (const e of data.evidenceRecent as Array<{ person_id: string; occurred_at: string; sentiment: string | null }>) {
    if (!evidenceByPerson.has(e.person_id)) evidenceByPerson.set(e.person_id, [])
    evidenceByPerson.get(e.person_id)!.push({ occurred_at: e.occurred_at, sentiment: e.sentiment })
  }

  const [taskSignals, peopleSignals, actionSignals] = await Promise.all([
    Promise.resolve(computeTaskSignals(data, dismissedSet, today)),
    Promise.resolve(computePeopleSignals(data, dismissedSet, today)),
    computeActionItemSignals(data.recentMeetings, dismissedSet, today),
  ])

  const followUpSignals = computeFollowUpSignals(data.openFollowUps, dismissedSet, today)
  const sentimentDriftSignals = computeSentimentDriftSignals(
    data.activePeople,
    evidenceByPerson,
    dismissedSet,
    today
  )
  const goalSignals = computeGoalSignals(data.careerGoals, dismissedSet, today)

  return sortSignals([...taskSignals, ...peopleSignals, ...actionSignals, ...followUpSignals, ...sentimentDriftSignals, ...goalSignals])
}

export function useWeeklyReviewSignals(dismissedItems: DismissedItem[]): SignalsData {
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const dismissedKey = useMemo(
    () => dismissedItems.map(d => d.id).join(','),
    [dismissedItems]
  )

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await computeAllSignals(dismissedItems)
      setSignals(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load signals')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissedKey])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { signals, loading, error, refetch: fetch }
}

/** Non-hook version for sidebar indicator */
export async function fetchSignalCounts(): Promise<{
  critical: number
  warning: number
  info: number
  total: number
}> {
  try {
    const result = await computeAllSignals([])
    return {
      critical: result.filter(s => s.severity === 'critical').length,
      warning: result.filter(s => s.severity === 'warning').length,
      info: result.filter(s => s.severity === 'info').length,
      total: result.length,
    }
  } catch {
    return { critical: 0, warning: 0, info: 0, total: 0 }
  }
}
