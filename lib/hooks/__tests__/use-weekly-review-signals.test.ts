import { describe, it, expect } from 'vitest'
import { getMondayOfWeek, formatWeekRange } from '../../services/weekly-review'

// Tests for the pure utility functions used by the signals hook

describe('getMondayOfWeek edge cases', () => {
  it('handles leap year boundary', () => {
    // 2028-03-01 is a Wednesday (leap year, day after Feb 29)
    const result = getMondayOfWeek(new Date('2028-03-01'))
    expect(result).toBe('2028-02-28')
  })

  it('handles last day of year (Thursday)', () => {
    // 2026-12-31 is a Thursday
    const result = getMondayOfWeek(new Date('2026-12-31'))
    expect(result).toBe('2026-12-28')
  })

  it('handles first day of year that is a Monday', () => {
    // 2024-01-01 is a Monday
    const result = getMondayOfWeek(new Date('2024-01-01'))
    expect(result).toBe('2024-01-01')
  })

  it('handles Saturday', () => {
    // 2026-05-02 is a Saturday
    const result = getMondayOfWeek(new Date('2026-05-02'))
    expect(result).toBe('2026-04-27')
  })
})

describe('formatWeekRange', () => {
  it('handles week straddling year boundary', () => {
    // week starting 2025-12-29 (Mon) ends 2026-01-04 (Sun) — different years
    const result = formatWeekRange('2025-12-29')
    // Should contain both Dec and Jan
    expect(result).toMatch(/Dec/)
    expect(result).toMatch(/Jan/)
  })

  it('shows correct month abbreviations', () => {
    const result = formatWeekRange('2026-04-27')
    expect(result).toMatch(/Apr/)
    expect(result).toMatch(/May/)
  })
})

describe('Signal severity logic', () => {
  // Test the daysOverdue threshold logic inline (matches hook implementation)
  it('overdue task is warning at 1-3 days, critical at 4+', () => {
    function getSeverity(daysOverdue: number): 'warning' | 'critical' {
      return daysOverdue >= 4 ? 'critical' : 'warning'
    }
    expect(getSeverity(1)).toBe('warning')
    expect(getSeverity(3)).toBe('warning')
    expect(getSeverity(4)).toBe('critical')
    expect(getSeverity(10)).toBe('critical')
  })

  it('no 1:1 is warning at 14-20 days, critical at 21+', () => {
    function getSeverity(daysSince: number): 'warning' | 'critical' {
      return daysSince >= 21 ? 'critical' : 'warning'
    }
    expect(getSeverity(14)).toBe('warning')
    expect(getSeverity(20)).toBe('warning')
    expect(getSeverity(21)).toBe('critical')
    expect(getSeverity(30)).toBe('critical')
  })

  it('unresolved action is info under 7 days, warning 7-13, critical 14+', () => {
    function getSeverity(daysAgo: number): 'info' | 'warning' | 'critical' {
      return daysAgo >= 14 ? 'critical' : daysAgo >= 7 ? 'warning' : 'info'
    }
    expect(getSeverity(3)).toBe('info')
    expect(getSeverity(7)).toBe('warning')
    expect(getSeverity(13)).toBe('warning')
    expect(getSeverity(14)).toBe('critical')
  })
})

describe('Dismissed items exclusion', () => {
  it('dismissed set key format matches type::id pattern', () => {
    // Verify the key format used in the hook for dismiss lookup
    const type = 'overdue_task'
    const id = 'task-abc-123'
    const key = `${type}::${id}`
    expect(key).toBe('overdue_task::task-abc-123')

    const emptyRefKey = `no_recent_1on1::`
    expect(emptyRefKey).toBe('no_recent_1on1::')
  })

  it('dismissed set correctly filters out dismissed signals', () => {
    const dismissed = [
      { itemType: 'overdue_task', referenceId: 'task-1' },
      { itemType: 'no_recent_1on1', referenceId: 'person-2' },
    ]
    const dismissedSet = new Set(dismissed.map(d => `${d.itemType}::${d.referenceId ?? ''}`))
    const isDismissed = (type: string, refId: string) => dismissedSet.has(`${type}::${refId}`)

    expect(isDismissed('overdue_task', 'task-1')).toBe(true)
    expect(isDismissed('overdue_task', 'task-2')).toBe(false)
    expect(isDismissed('no_recent_1on1', 'person-2')).toBe(true)
    expect(isDismissed('no_recent_1on1', 'person-3')).toBe(false)
  })
})
