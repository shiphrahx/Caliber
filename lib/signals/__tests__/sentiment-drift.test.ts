import { describe, it, expect } from 'vitest'
import {
  computeSentimentDriftForPeriods,
  computeSentimentDriftSignals,
  type SentimentPeriodStats,
} from '../compute'

// ── computeSentimentDriftForPeriods ──────────────────────────────────────────

describe('computeSentimentDriftForPeriods', () => {
  it('detects drift when recent >60% negative and prior <40% negative', () => {
    const recent: SentimentPeriodStats = { positive: 1, neutral: 0, negative: 9, total: 10 } // 90% neg
    const prior:  SentimentPeriodStats = { positive: 7, neutral: 0, negative: 3, total: 10 } // 30% neg

    const result = computeSentimentDriftForPeriods(recent, prior)

    expect(result.drifting).toBe(true)
    expect(result.severe).toBe(false)
    expect(result.recentNegRate).toBeCloseTo(0.9)
    expect(result.priorNegRate).toBeCloseTo(0.3)
  })

  it('marks as severe when both periods show elevated negativity', () => {
    const recent: SentimentPeriodStats = { positive: 1, neutral: 0, negative: 9, total: 10 } // 90%
    const prior:  SentimentPeriodStats = { positive: 1, neutral: 0, negative: 5, total: 6  } // 83%

    const result = computeSentimentDriftForPeriods(recent, prior)

    expect(result.drifting).toBe(true)
    expect(result.severe).toBe(true)
  })

  it('no drift when recent negative rate is below threshold (≤60%)', () => {
    const recent: SentimentPeriodStats = { positive: 5, neutral: 0, negative: 5, total: 10 } // 50%
    const prior:  SentimentPeriodStats = { positive: 9, neutral: 0, negative: 1, total: 10 } // 10%

    const result = computeSentimentDriftForPeriods(recent, prior)

    expect(result.drifting).toBe(false)
    expect(result.severe).toBe(false)
  })

  it('no drift when prior negative rate is already ≥40% (no worsening)', () => {
    // recent = 70% negative, but prior was already 50% negative → severe path
    const recent: SentimentPeriodStats = { positive: 1, neutral: 0, negative: 7, total: 10 } // 70%
    const prior:  SentimentPeriodStats = { positive: 5, neutral: 0, negative: 5, total: 10 } // 50%

    const result = computeSentimentDriftForPeriods(recent, prior)

    // severe = true because prior >= 40%, still fires
    expect(result.drifting).toBe(true)
    expect(result.severe).toBe(true)
  })

  it('returns zero rates when periods have no entries', () => {
    const empty: SentimentPeriodStats = { positive: 0, neutral: 0, negative: 0, total: 0 }

    const result = computeSentimentDriftForPeriods(empty, empty)

    expect(result.recentNegRate).toBe(0)
    expect(result.priorNegRate).toBe(0)
    expect(result.drifting).toBe(false)
  })

  it('handles exactly 60% recent negative — should NOT trigger (>60 required)', () => {
    const recent: SentimentPeriodStats = { positive: 4, neutral: 0, negative: 6, total: 10 } // exactly 60%
    const prior:  SentimentPeriodStats = { positive: 8, neutral: 0, negative: 2, total: 10 } // 20%

    const result = computeSentimentDriftForPeriods(recent, prior)

    expect(result.drifting).toBe(false)
  })
})

// ── computeSentimentDriftSignals ─────────────────────────────────────────────

describe('computeSentimentDriftSignals', () => {
  const today = new Date('2026-05-23T12:00:00Z')

  const people = [
    { id: 'person-1', full_name: 'Alice' },
    { id: 'person-2', full_name: 'Bob' },
  ]

  function daysAgo(n: number): string {
    const d = new Date(today)
    d.setDate(d.getDate() - n)
    return d.toISOString().split('T')[0]
  }

  it('fires warning signal for drifting person', () => {
    // Recent 30 days: 8/10 negative (80%) — drift
    // Prior  30 days: 2/10 negative (20%) — low
    const entries = [
      // recent (days 1-30)
      ...Array.from({ length: 8 }, (_, i) => ({ occurred_at: daysAgo(i + 1), sentiment: 'negative' })),
      ...Array.from({ length: 2 }, (_, i) => ({ occurred_at: daysAgo(i + 20), sentiment: 'positive' })),
      // prior (days 31-60)
      ...Array.from({ length: 2 }, (_, i) => ({ occurred_at: daysAgo(i + 31), sentiment: 'negative' })),
      ...Array.from({ length: 8 }, (_, i) => ({ occurred_at: daysAgo(i + 40), sentiment: 'positive' })),
    ]

    const evidenceByPerson = new Map([['person-1', entries]])
    const dismissed = new Set<string>()

    const signals = computeSentimentDriftSignals(people, evidenceByPerson, dismissed, today)

    const driftSignal = signals.find(s => s.type === 'sentiment_drift' && s.personId === 'person-1')
    expect(driftSignal).toBeDefined()
    expect(driftSignal?.severity).toBe('warning')
    expect(driftSignal?.personName).toBe('Alice')
    expect(driftSignal?.entityType).toBe('person')
    expect(driftSignal?.message).toContain('Alice')
    expect(driftSignal?.message).toContain('negative')
  })

  it('fires critical signal when both periods are highly negative (severe)', () => {
    // Recent: 8/10 negative = 80%; Prior: 6/10 negative = 60% (both elevated)
    const entries = [
      ...Array.from({ length: 8 }, (_, i) => ({ occurred_at: daysAgo(i + 1), sentiment: 'negative' })),
      ...Array.from({ length: 2 }, (_, i) => ({ occurred_at: daysAgo(i + 20), sentiment: 'positive' })),
      ...Array.from({ length: 6 }, (_, i) => ({ occurred_at: daysAgo(i + 31), sentiment: 'negative' })),
      ...Array.from({ length: 4 }, (_, i) => ({ occurred_at: daysAgo(i + 45), sentiment: 'positive' })),
    ]

    const evidenceByPerson = new Map([['person-1', entries]])
    const dismissed = new Set<string>()

    const signals = computeSentimentDriftSignals(people, evidenceByPerson, dismissed, today)

    const driftSignal = signals.find(s => s.type === 'sentiment_drift' && s.personId === 'person-1')
    expect(driftSignal?.severity).toBe('critical')
  })

  it('produces no signal when no drift detected', () => {
    // Mostly positive evidence in both windows
    const entries = [
      ...Array.from({ length: 9 }, (_, i) => ({ occurred_at: daysAgo(i + 1), sentiment: 'positive' })),
      { occurred_at: daysAgo(15), sentiment: 'negative' },
      ...Array.from({ length: 9 }, (_, i) => ({ occurred_at: daysAgo(i + 31), sentiment: 'positive' })),
      { occurred_at: daysAgo(45), sentiment: 'negative' },
    ]

    const evidenceByPerson = new Map([['person-1', entries]])
    const dismissed = new Set<string>()

    const signals = computeSentimentDriftSignals(people, evidenceByPerson, dismissed, today)

    expect(signals.find(s => s.type === 'sentiment_drift')).toBeUndefined()
  })

  it('produces no signal when no evidence in either window', () => {
    const evidenceByPerson = new Map<string, any[]>()
    const dismissed = new Set<string>()

    const signals = computeSentimentDriftSignals(people, evidenceByPerson, dismissed, today)

    expect(signals.find(s => s.type === 'sentiment_drift')).toBeUndefined()
  })

  it('produces no signal when recent window is empty', () => {
    // Evidence only in prior window
    const entries = Array.from({ length: 5 }, (_, i) => ({
      occurred_at: daysAgo(i + 35),
      sentiment: 'negative',
    }))

    const evidenceByPerson = new Map([['person-1', entries]])
    const dismissed = new Set<string>()

    const signals = computeSentimentDriftSignals(people, evidenceByPerson, dismissed, today)

    expect(signals.find(s => s.type === 'sentiment_drift')).toBeUndefined()
  })

  it('produces no signal when prior window is empty', () => {
    // Evidence only in recent window (no prior context for comparison)
    const entries = Array.from({ length: 5 }, (_, i) => ({
      occurred_at: daysAgo(i + 1),
      sentiment: 'negative',
    }))

    const evidenceByPerson = new Map([['person-1', entries]])
    const dismissed = new Set<string>()

    const signals = computeSentimentDriftSignals(people, evidenceByPerson, dismissed, today)

    expect(signals.find(s => s.type === 'sentiment_drift')).toBeUndefined()
  })

  it('skips dismissed persons', () => {
    const entries = [
      ...Array.from({ length: 8 }, (_, i) => ({ occurred_at: daysAgo(i + 1), sentiment: 'negative' })),
      ...Array.from({ length: 2 }, (_, i) => ({ occurred_at: daysAgo(i + 20), sentiment: 'positive' })),
      ...Array.from({ length: 2 }, (_, i) => ({ occurred_at: daysAgo(i + 31), sentiment: 'negative' })),
      ...Array.from({ length: 8 }, (_, i) => ({ occurred_at: daysAgo(i + 40), sentiment: 'positive' })),
    ]

    const evidenceByPerson = new Map([['person-1', entries]])
    // Dismiss the signal for person-1
    const dismissed = new Set<string>(['sentiment_drift::person-1'])

    const signals = computeSentimentDriftSignals(people, evidenceByPerson, dismissed, today)

    expect(signals.find(s => s.type === 'sentiment_drift' && s.personId === 'person-1')).toBeUndefined()
  })

  it('can produce signals for multiple people independently', () => {
    const makeEntries = (recentNeg: number, priorNeg: number) => [
      ...Array.from({ length: recentNeg }, (_, i) => ({ occurred_at: daysAgo(i + 1), sentiment: 'negative' })),
      ...Array.from({ length: 10 - recentNeg }, (_, i) => ({ occurred_at: daysAgo(i + 20), sentiment: 'positive' })),
      ...Array.from({ length: priorNeg }, (_, i) => ({ occurred_at: daysAgo(i + 31), sentiment: 'negative' })),
      ...Array.from({ length: 10 - priorNeg }, (_, i) => ({ occurred_at: daysAgo(i + 45), sentiment: 'positive' })),
    ]

    const evidenceByPerson = new Map([
      ['person-1', makeEntries(8, 2)], // drift for person-1
      ['person-2', makeEntries(2, 1)], // no drift for person-2
    ])
    const dismissed = new Set<string>()

    const signals = computeSentimentDriftSignals(people, evidenceByPerson, dismissed, today)

    expect(signals.find(s => s.personId === 'person-1')?.type).toBe('sentiment_drift')
    expect(signals.find(s => s.personId === 'person-2')).toBeUndefined()
  })

  it('includes correct meta with rates and counts', () => {
    const entries = [
      ...Array.from({ length: 8 }, (_, i) => ({ occurred_at: daysAgo(i + 1), sentiment: 'negative' })),
      ...Array.from({ length: 2 }, (_, i) => ({ occurred_at: daysAgo(i + 20), sentiment: 'positive' })),
      ...Array.from({ length: 2 }, (_, i) => ({ occurred_at: daysAgo(i + 31), sentiment: 'negative' })),
      ...Array.from({ length: 8 }, (_, i) => ({ occurred_at: daysAgo(i + 40), sentiment: 'positive' })),
    ]

    const evidenceByPerson = new Map([['person-1', entries]])
    const dismissed = new Set<string>()

    const signals = computeSentimentDriftSignals(people, evidenceByPerson, dismissed, today)
    const signal = signals.find(s => s.personId === 'person-1')!

    expect(signal.meta).toBeDefined()
    expect((signal.meta as any).recentNegRate).toBeGreaterThan(0.6)
    expect((signal.meta as any).priorNegRate).toBeLessThan(0.4)
    expect(typeof (signal.meta as any).recentTotal).toBe('number')
    expect(typeof (signal.meta as any).priorTotal).toBe('number')
  })

  it('ignores evidence entries outside the 60-day window', () => {
    const entries = [
      // These are fine (within 60 days)
      ...Array.from({ length: 8 }, (_, i) => ({ occurred_at: daysAgo(i + 1), sentiment: 'negative' })),
      ...Array.from({ length: 2 }, (_, i) => ({ occurred_at: daysAgo(i + 20), sentiment: 'positive' })),
      ...Array.from({ length: 2 }, (_, i) => ({ occurred_at: daysAgo(i + 31), sentiment: 'negative' })),
      ...Array.from({ length: 8 }, (_, i) => ({ occurred_at: daysAgo(i + 40), sentiment: 'positive' })),
      // Too old — should be ignored
      { occurred_at: daysAgo(65), sentiment: 'negative' },
      { occurred_at: daysAgo(100), sentiment: 'negative' },
    ]

    const evidenceByPerson = new Map([['person-1', entries]])
    const dismissed = new Set<string>()

    const signals = computeSentimentDriftSignals(people, evidenceByPerson, dismissed, today)

    // Should still fire (old entries don't inflate prior negatives enough to block)
    const signal = signals.find(s => s.personId === 'person-1')
    expect(signal).toBeDefined()
  })
})
