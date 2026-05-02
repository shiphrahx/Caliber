'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  loadSignalData,
  computePeopleSignals,
  computeFollowUpSignals,
  buildDismissedSet,
  sortSignals,
} from '@/lib/signals/compute'
import { computeAttentionScore, type Signal } from '@/lib/signals/types'

export interface PersonAttention {
  personId: string
  personName: string
  personRole: string | null
  signals: Signal[]
  score: number
  openFollowUpCount: number
}

export interface RadarData {
  people: PersonAttention[]
  loading: boolean
  error: string | null
  refetch: () => void
}

async function computeRadarData(): Promise<PersonAttention[]> {
  const today = new Date()
  const dismissedSet = buildDismissedSet([])

  const data = await loadSignalData()

  const allPeopleSignals = computePeopleSignals(data, dismissedSet, today)
  const allFollowUpSignals = computeFollowUpSignals(data.openFollowUps, dismissedSet, today)
  const allSignals = [...allPeopleSignals, ...allFollowUpSignals]

  // Count open follow-ups per person
  const openFollowUpsByPerson: Record<string, number> = {}
  for (const fu of data.openFollowUps) {
    if (!openFollowUpsByPerson[fu.person_id]) openFollowUpsByPerson[fu.person_id] = 0
    openFollowUpsByPerson[fu.person_id]++
  }

  return data.activePeople.map(person => {
    const personSignals = sortSignals(allSignals.filter(s => s.personId === person.id))
    return {
      personId: person.id,
      personName: person.full_name,
      personRole: person.role ?? null,
      signals: personSignals,
      score: computeAttentionScore(personSignals),
      openFollowUpCount: openFollowUpsByPerson[person.id] ?? 0,
    }
  }).sort((a, b) => b.score - a.score)
}

export function usePersonSignals(personId: string): {
  signals: Signal[]
  score: number
  loading: boolean
} {
  const [signals, setSignals] = useState<Signal[]>([])
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await loadSignalData()
        const today = new Date()
        const dismissedSet = buildDismissedSet([])

        const allPeopleSignals = computePeopleSignals(data, dismissedSet, today)
        const allFollowUpSignals = computeFollowUpSignals(data.openFollowUps, dismissedSet, today)
        const personSignals = sortSignals(
          [...allPeopleSignals, ...allFollowUpSignals].filter(s => s.personId === personId)
        )
        setSignals(personSignals)
        setScore(computeAttentionScore(personSignals))
      } catch {
        // non-critical for detail page
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [personId])

  return { signals, score, loading }
}

export function useRadar(): RadarData {
  const [people, setPeople] = useState<PersonAttention[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await computeRadarData()
      setPeople(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load radar data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { people, loading, error, refetch: fetch }
}
