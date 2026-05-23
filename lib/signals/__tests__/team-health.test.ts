import { describe, it, expect } from 'vitest'
import { computeTeamHealthScore } from '../types'
import type { Signal } from '../types'

const makeSignal = (type: Signal['type'], severity: Signal['severity']): Signal => ({
  type,
  severity,
  message: `${severity} ${type}`,
  entityId: 'e1',
  entityType: 'person',
})

describe('computeTeamHealthScore', () => {
  it('returns 100 with Healthy label when there are no signals', () => {
    const result = computeTeamHealthScore([])
    expect(result.score).toBe(100)
    expect(result.label).toBe('Healthy')
    expect(result.breakdown).toEqual({ tasks: 0, people: 0, followUps: 0, goals: 0 })
  })

  it('deducts 2 per info signal', () => {
    const signals: Signal[] = [
      makeSignal('overdue_task', 'info'),
      makeSignal('no_evidence', 'info'),
    ]
    const result = computeTeamHealthScore(signals)
    expect(result.score).toBe(96)
    expect(result.label).toBe('Healthy')
  })

  it('deducts 7 per warning signal', () => {
    const signals: Signal[] = [
      makeSignal('no_recent_1on1', 'warning'),
      makeSignal('overdue_follow_up', 'warning'),
    ]
    const result = computeTeamHealthScore(signals)
    expect(result.score).toBe(86)
    expect(result.label).toBe('Healthy')
  })

  it('deducts 15 per critical signal', () => {
    const signals: Signal[] = [makeSignal('sentiment_drift', 'critical')]
    const result = computeTeamHealthScore(signals)
    expect(result.score).toBe(85)
    expect(result.label).toBe('Healthy')
  })

  it('returns Needs attention when score is 60-79', () => {
    // 3 warning signals: 100 - 21 = 79
    const signals: Signal[] = [
      makeSignal('no_recent_1on1', 'warning'),
      makeSignal('overdue_follow_up', 'warning'),
      makeSignal('stale_goal', 'warning'),
    ]
    const result = computeTeamHealthScore(signals)
    expect(result.score).toBe(79)
    expect(result.label).toBe('Needs attention')
  })

  it('returns At risk when score < 60', () => {
    // 3 critical signals: 100 - 45 = 55
    const signals: Signal[] = [
      makeSignal('sentiment_drift', 'critical'),
      makeSignal('new_hire_at_risk', 'critical'),
      makeSignal('overdue_follow_up', 'critical'),
    ]
    const result = computeTeamHealthScore(signals)
    expect(result.score).toBe(55)
    expect(result.label).toBe('At risk')
  })

  it('floors score at 0 with many signals', () => {
    const signals: Signal[] = Array.from({ length: 10 }, () =>
      makeSignal('sentiment_drift', 'critical')
    )
    const result = computeTeamHealthScore(signals)
    expect(result.score).toBe(0)
    expect(result.label).toBe('At risk')
  })

  it('computes breakdown counting only non-info signals', () => {
    const signals: Signal[] = [
      makeSignal('overdue_task', 'critical'),      // tasks
      makeSignal('action_overload', 'warning'),     // tasks
      makeSignal('overdue_task', 'info'),           // tasks but info — NOT counted
      makeSignal('no_recent_1on1', 'warning'),      // people
      makeSignal('sentiment_drift', 'critical'),    // people
      makeSignal('overdue_follow_up', 'warning'),   // followUps
      makeSignal('stale_goal', 'warning'),          // goals
    ]
    const result = computeTeamHealthScore(signals)
    expect(result.breakdown.tasks).toBe(2)
    expect(result.breakdown.people).toBe(2)
    expect(result.breakdown.followUps).toBe(1)
    expect(result.breakdown.goals).toBe(1)
  })

  it('handles exactly 80 score as Healthy', () => {
    // 100 - 4 warning (28) + 1 info (2) = 70... let me calc: need exactly 80
    // 2 warnings + 2 info = 14+4 = 18 deduction → 82. 3 warnings = 21 → 79.
    // 2 warnings + 1 info = 14+2 = 16 → 84. Let's make 20 deduction = 80.
    // 1 critical (15) + 1 warning (7) = 22 → 78. 1 critical (15) + 1 info (2) = 17 → 83.
    // 2 critical (30) = 70. 1 critical + nope... let me use warning math:
    // 20/7 not integer. So 100 - (2*7 + 6*1) = 100 - 20 = 80.
    // Use: info is 2, so 3*info = 6, 2*warning = 14, total = 20 → score = 80.
    const signals: Signal[] = [
      makeSignal('no_recent_1on1', 'warning'),
      makeSignal('overdue_follow_up', 'warning'),
      makeSignal('no_evidence', 'info'),
      makeSignal('overdue_task', 'info'),
      makeSignal('stale_goal', 'info'),
    ]
    const result = computeTeamHealthScore(signals)
    expect(result.score).toBe(80)
    expect(result.label).toBe('Healthy')
  })

  it('handles exactly 60 score as Needs attention', () => {
    // 40 deduction → 60. 2 critical (30) + 2 warning (14) - no = 44.
    // 2 critical (30) + 1 warning (7) + 3/2 info... just use 4 critical = 60, 100-40=60
    // Use mix: 2 critical (30) + 1 warning (7) + 1.5 - can't.
    // 4 warnings (28) + 6 info (12) = 40 → 60
    const signals: Signal[] = [
      makeSignal('no_recent_1on1', 'warning'),
      makeSignal('overdue_follow_up', 'warning'),
      makeSignal('stale_goal', 'warning'),
      makeSignal('sentiment_drift', 'warning'),
      makeSignal('overdue_task', 'info'),
      makeSignal('upcoming_deadline', 'info'),
      makeSignal('no_evidence', 'info'),
      makeSignal('missing_notes', 'info'),
      makeSignal('unresolved_action', 'info'),
      makeSignal('ageing_follow_up', 'info'),
    ]
    const result = computeTeamHealthScore(signals)
    expect(result.score).toBe(60)
    expect(result.label).toBe('Needs attention')
  })
})
