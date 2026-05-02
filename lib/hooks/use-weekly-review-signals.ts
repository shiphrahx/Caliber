'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  loadSignalData,
  computeTaskSignals,
  computePeopleSignals,
  computeFollowUpSignals,
  computeActionItemSignals,
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

  const [taskSignals, peopleSignals, actionSignals] = await Promise.all([
    Promise.resolve(computeTaskSignals(data, dismissedSet, today)),
    Promise.resolve(computePeopleSignals(data, dismissedSet, today)),
    computeActionItemSignals(data.recentMeetings, dismissedSet, today),
  ])

  const followUpSignals = computeFollowUpSignals(data.openFollowUps, dismissedSet, today)

  return sortSignals([...taskSignals, ...peopleSignals, ...actionSignals, ...followUpSignals])
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
