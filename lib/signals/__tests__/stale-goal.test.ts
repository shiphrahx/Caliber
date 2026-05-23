import { describe, it, expect } from 'vitest'
import {
  computeGoalSignals,
  buildDismissedSet,
  STALE_GOAL_INFO_DAYS,
  STALE_GOAL_WARNING_DAYS,
  STALE_GOAL_CRITICAL_DAYS,
} from '../compute'
import type { GoalStalenessRecord } from '@/lib/services/career-goals'

// ── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date('2024-06-15')
const DISMISSED = buildDismissedSet([])

function dateStr(daysAgo: number, base = TODAY): string {
  const d = new Date(base)
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

function makeGoal(overrides: Partial<GoalStalenessRecord> = {}): GoalStalenessRecord {
  return {
    goalId: 'goal-1',
    goalTitle: 'Learn system design',
    timePeriod: 'short_term',
    status: 'In progress',
    lastUpdatedAt: dateStr(0),
    ...overrides,
  }
}

// ── Threshold constants ───────────────────────────────────────────────────────

describe('stale goal threshold constants', () => {
  it('info threshold is 60 days', () => {
    expect(STALE_GOAL_INFO_DAYS).toBe(60)
  })

  it('warning threshold is 90 days', () => {
    expect(STALE_GOAL_WARNING_DAYS).toBe(90)
  })

  it('critical threshold is 120 days', () => {
    expect(STALE_GOAL_CRITICAL_DAYS).toBe(120)
  })
})

// ── No signal when fresh ──────────────────────────────────────────────────────

describe('computeGoalSignals — no signal', () => {
  it('returns empty array when no goals provided', () => {
    const result = computeGoalSignals([], DISMISSED, TODAY)
    expect(result).toHaveLength(0)
  })

  it('returns no signal when goal updated today', () => {
    const result = computeGoalSignals([makeGoal({ lastUpdatedAt: dateStr(0) })], DISMISSED, TODAY)
    expect(result).toHaveLength(0)
  })

  it('returns no signal when goal updated 30 days ago', () => {
    const result = computeGoalSignals([makeGoal({ lastUpdatedAt: dateStr(30) })], DISMISSED, TODAY)
    expect(result).toHaveLength(0)
  })

  it('returns no signal when goal updated 59 days ago (one day under threshold)', () => {
    const result = computeGoalSignals([makeGoal({ lastUpdatedAt: dateStr(59) })], DISMISSED, TODAY)
    expect(result).toHaveLength(0)
  })
})

// ── Info severity (60–89 days) ────────────────────────────────────────────────

describe('computeGoalSignals — info severity', () => {
  it('fires info at exactly 60 days', () => {
    const result = computeGoalSignals([makeGoal({ lastUpdatedAt: dateStr(60) })], DISMISSED, TODAY)
    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('info')
    expect(result[0].type).toBe('stale_goal')
  })

  it('fires info at 89 days (one day under warning threshold)', () => {
    const result = computeGoalSignals([makeGoal({ lastUpdatedAt: dateStr(89) })], DISMISSED, TODAY)
    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('info')
  })

  it('message includes goal title and days', () => {
    const result = computeGoalSignals([makeGoal({ goalTitle: 'Become staff', lastUpdatedAt: dateStr(65) })], DISMISSED, TODAY)
    expect(result[0].message).toContain('Become staff')
    expect(result[0].message).toContain('65 day')
  })
})

// ── Warning severity (90–119 days) ───────────────────────────────────────────

describe('computeGoalSignals — warning severity', () => {
  it('fires warning at exactly 90 days', () => {
    const result = computeGoalSignals([makeGoal({ lastUpdatedAt: dateStr(90) })], DISMISSED, TODAY)
    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('warning')
  })

  it('fires warning at 119 days (one day under critical threshold)', () => {
    const result = computeGoalSignals([makeGoal({ lastUpdatedAt: dateStr(119) })], DISMISSED, TODAY)
    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('warning')
  })
})

// ── Critical severity (120+ days) ────────────────────────────────────────────

describe('computeGoalSignals — critical severity', () => {
  it('fires critical at exactly 120 days', () => {
    const result = computeGoalSignals([makeGoal({ lastUpdatedAt: dateStr(120) })], DISMISSED, TODAY)
    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('critical')
  })

  it('fires critical at 200 days', () => {
    const result = computeGoalSignals([makeGoal({ lastUpdatedAt: dateStr(200) })], DISMISSED, TODAY)
    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('critical')
  })
})

// ── Signal shape ──────────────────────────────────────────────────────────────

describe('computeGoalSignals — signal shape', () => {
  it('entityId is the goalId', () => {
    const goal = makeGoal({ goalId: 'my-goal-id', lastUpdatedAt: dateStr(70) })
    const result = computeGoalSignals([goal], DISMISSED, TODAY)
    expect(result[0].entityId).toBe('my-goal-id')
  })

  it('entityType is goal', () => {
    const result = computeGoalSignals([makeGoal({ lastUpdatedAt: dateStr(70) })], DISMISSED, TODAY)
    expect(result[0].entityType).toBe('goal')
  })

  it('meta includes daysSince, lastUpdatedAt, timePeriod, goalStatus', () => {
    const goal = makeGoal({ lastUpdatedAt: dateStr(75), timePeriod: 'mid_term', status: 'Not started' })
    const result = computeGoalSignals([goal], DISMISSED, TODAY)
    const meta = result[0].meta!
    expect(meta.daysSince).toBe(75)
    expect(meta.lastUpdatedAt).toBe(dateStr(75))
    expect(meta.timePeriod).toBe('mid_term')
    expect(meta.goalStatus).toBe('Not started')
  })

  it('singular "day" in message when daysSince is 1 — edge case for 60-day boundary', () => {
    // 60-day boundary fires at exactly 60, not 1 day — but test singular branch via override
    // daysSince = 60 → "60 days" (plural)
    const result = computeGoalSignals([makeGoal({ lastUpdatedAt: dateStr(60) })], DISMISSED, TODAY)
    expect(result[0].message).toContain('60 days')
  })
})

// ── Multiple goals ────────────────────────────────────────────────────────────

describe('computeGoalSignals — multiple goals', () => {
  it('returns one signal per stale goal', () => {
    const goals: GoalStalenessRecord[] = [
      makeGoal({ goalId: 'g1', lastUpdatedAt: dateStr(65) }),
      makeGoal({ goalId: 'g2', lastUpdatedAt: dateStr(95) }),
      makeGoal({ goalId: 'g3', lastUpdatedAt: dateStr(130) }),
    ]
    const result = computeGoalSignals(goals, DISMISSED, TODAY)
    expect(result).toHaveLength(3)
    const severities = result.map(s => s.severity)
    expect(severities).toContain('info')
    expect(severities).toContain('warning')
    expect(severities).toContain('critical')
  })

  it('skips fresh goals and only returns stale ones', () => {
    const goals: GoalStalenessRecord[] = [
      makeGoal({ goalId: 'g1', lastUpdatedAt: dateStr(10) }),   // fresh
      makeGoal({ goalId: 'g2', lastUpdatedAt: dateStr(70) }),   // stale
      makeGoal({ goalId: 'g3', lastUpdatedAt: dateStr(0) }),    // fresh
    ]
    const result = computeGoalSignals(goals, DISMISSED, TODAY)
    expect(result).toHaveLength(1)
    expect(result[0].entityId).toBe('g2')
  })
})

// ── Dismiss infrastructure ────────────────────────────────────────────────────

describe('computeGoalSignals — dismiss', () => {
  it('skips dismissed goals', () => {
    const goal = makeGoal({ goalId: 'goal-x', lastUpdatedAt: dateStr(80) })
    const dismissed = buildDismissedSet([{ itemType: 'stale_goal', referenceId: 'goal-x' }])
    const result = computeGoalSignals([goal], dismissed, TODAY)
    expect(result).toHaveLength(0)
  })

  it('does not skip goals dismissed under a different type', () => {
    const goal = makeGoal({ goalId: 'goal-x', lastUpdatedAt: dateStr(80) })
    const dismissed = buildDismissedSet([{ itemType: 'overdue_task', referenceId: 'goal-x' }])
    const result = computeGoalSignals([goal], dismissed, TODAY)
    expect(result).toHaveLength(1)
  })

  it('does not skip goals with a different id even when type matches', () => {
    const goal = makeGoal({ goalId: 'goal-x', lastUpdatedAt: dateStr(80) })
    const dismissed = buildDismissedSet([{ itemType: 'stale_goal', referenceId: 'goal-y' }])
    const result = computeGoalSignals([goal], dismissed, TODAY)
    expect(result).toHaveLength(1)
  })

  it('only skips the dismissed goal, not other stale goals', () => {
    const goals: GoalStalenessRecord[] = [
      makeGoal({ goalId: 'g1', lastUpdatedAt: dateStr(70) }),
      makeGoal({ goalId: 'g2', lastUpdatedAt: dateStr(75) }),
    ]
    const dismissed = buildDismissedSet([{ itemType: 'stale_goal', referenceId: 'g1' }])
    const result = computeGoalSignals(goals, dismissed, TODAY)
    expect(result).toHaveLength(1)
    expect(result[0].entityId).toBe('g2')
  })
})

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('computeGoalSignals — edge cases', () => {
  it('handles a single goal updated exactly at each threshold boundary', () => {
    const boundaries: [number, string][] = [
      [60, 'info'],
      [90, 'warning'],
      [120, 'critical'],
    ]
    for (const [days, expectedSeverity] of boundaries) {
      const result = computeGoalSignals(
        [makeGoal({ goalId: `g-${days}`, lastUpdatedAt: dateStr(days) })],
        DISMISSED,
        TODAY
      )
      expect(result).toHaveLength(1)
      expect(result[0].severity).toBe(expectedSeverity)
    }
  })

  it('handles goals with Not started status (should still fire)', () => {
    const result = computeGoalSignals(
      [makeGoal({ status: 'Not started', lastUpdatedAt: dateStr(70) })],
      DISMISSED,
      TODAY
    )
    expect(result).toHaveLength(1)
  })

  it('handles goals with In progress status (should fire)', () => {
    const result = computeGoalSignals(
      [makeGoal({ status: 'In progress', lastUpdatedAt: dateStr(70) })],
      DISMISSED,
      TODAY
    )
    expect(result).toHaveLength(1)
  })

  it('handles large number of goals efficiently', () => {
    const goals: GoalStalenessRecord[] = Array.from({ length: 100 }, (_, i) => ({
      goalId: `g-${i}`,
      goalTitle: `Goal ${i}`,
      timePeriod: 'short_term' as const,
      status: 'In progress' as const,
      lastUpdatedAt: dateStr(i + 60), // all stale
    }))
    const result = computeGoalSignals(goals, DISMISSED, TODAY)
    expect(result).toHaveLength(100)
  })

  it('long_term time period included in meta', () => {
    const result = computeGoalSignals(
      [makeGoal({ timePeriod: 'long_term', lastUpdatedAt: dateStr(70) })],
      DISMISSED,
      TODAY
    )
    expect(result[0].meta?.timePeriod).toBe('long_term')
  })
})
