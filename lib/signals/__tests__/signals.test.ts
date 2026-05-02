import { describe, it, expect } from 'vitest'
import {
  computeAttentionScore,
  scoreToColor,
  scoreToBg,
  SIGNAL_WEIGHTS,
  CRITICAL_BONUS,
  type Signal,
  type SignalType,
} from '../types'

function makeSignal(type: SignalType, severity: Signal['severity'] = 'warning'): Signal {
  return {
    type,
    severity,
    message: `test signal: ${type}`,
    entityId: 'e-1',
    entityType: 'person',
  }
}

describe('computeAttentionScore', () => {
  it('returns 0 for empty signals', () => {
    expect(computeAttentionScore([])).toBe(0)
  })

  it('sums base weights for info/warning signals', () => {
    const signals: Signal[] = [
      makeSignal('no_recent_1on1', 'warning'),  // weight 3
      makeSignal('no_evidence', 'warning'),      // weight 2
    ]
    expect(computeAttentionScore(signals)).toBe(5)
  })

  it('adds CRITICAL_BONUS for critical signals', () => {
    const signals: Signal[] = [
      makeSignal('overdue_task', 'critical'),    // 3 + 2 = 5
    ]
    expect(computeAttentionScore(signals)).toBe(3 + CRITICAL_BONUS)
  })

  it('does not add bonus for warning severity', () => {
    const signals: Signal[] = [
      makeSignal('overdue_task', 'warning'),     // 3 only
    ]
    expect(computeAttentionScore(signals)).toBe(3)
  })

  it('upcoming_deadline has zero base weight', () => {
    const signals: Signal[] = [
      makeSignal('upcoming_deadline', 'info'),
    ]
    expect(computeAttentionScore(signals)).toBe(0)
  })

  it('surfaced_follow_up is highest weight signal', () => {
    const surfaced = makeSignal('surfaced_follow_up', 'critical')
    const scoreSurfaced = SIGNAL_WEIGHTS['surfaced_follow_up'] + CRITICAL_BONUS
    const scoreOverdue = SIGNAL_WEIGHTS['overdue_follow_up'] + CRITICAL_BONUS
    expect(scoreSurfaced).toBeGreaterThan(scoreOverdue)
    expect(computeAttentionScore([surfaced])).toBe(scoreSurfaced)
  })

  it('accumulates across multiple signals', () => {
    const signals: Signal[] = [
      makeSignal('overdue_follow_up', 'critical'),  // 4 + 2 = 6
      makeSignal('no_recent_1on1', 'warning'),       // 3
      makeSignal('missing_notes', 'info'),            // 2
    ]
    expect(computeAttentionScore(signals)).toBe(11)
  })
})

describe('scoreToColor', () => {
  it('returns green for score 0', () => {
    expect(scoreToColor(0)).toBe('#00f058')
  })

  it('returns yellow for low scores (1-5)', () => {
    expect(scoreToColor(1)).toBe('#ffd43b')
    expect(scoreToColor(5)).toBe('#ffd43b')
  })

  it('returns orange for medium scores (6-10)', () => {
    expect(scoreToColor(6)).toBe('#ffa94d')
    expect(scoreToColor(10)).toBe('#ffa94d')
  })

  it('returns red for high scores (11+)', () => {
    expect(scoreToColor(11)).toBe('#ff6b6b')
    expect(scoreToColor(100)).toBe('#ff6b6b')
  })
})

describe('scoreToBg', () => {
  it('returns dark green bg for score 0', () => {
    expect(scoreToBg(0)).toBe('#0d1f14')
  })

  it('returns dark yellow bg for low scores', () => {
    expect(scoreToBg(3)).toBe('#2a2508')
  })

  it('returns dark orange bg for medium scores', () => {
    expect(scoreToBg(8)).toBe('#2a1a08')
  })

  it('returns dark red bg for high scores', () => {
    expect(scoreToBg(15)).toBe('#2a0a0a')
  })
})

describe('SIGNAL_WEIGHTS completeness', () => {
  const expectedTypes: SignalType[] = [
    'overdue_task', 'no_recent_1on1', 'unresolved_action', 'no_evidence',
    'upcoming_deadline', 'missing_notes', 'overdue_follow_up',
    'ageing_follow_up', 'surfaced_follow_up', 'action_overload',
  ]

  it('has a weight entry for every signal type', () => {
    for (const type of expectedTypes) {
      expect(SIGNAL_WEIGHTS).toHaveProperty(type)
      expect(typeof SIGNAL_WEIGHTS[type]).toBe('number')
    }
  })

  it('overdue signals weight more than info signals', () => {
    expect(SIGNAL_WEIGHTS['overdue_follow_up']).toBeGreaterThan(SIGNAL_WEIGHTS['upcoming_deadline'])
    expect(SIGNAL_WEIGHTS['surfaced_follow_up']).toBeGreaterThan(SIGNAL_WEIGHTS['no_evidence'])
  })
})
