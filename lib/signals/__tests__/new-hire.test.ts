import { describe, it, expect } from 'vitest'
import {
  isNewHire,
  NEW_HIRE_WINDOW_DAYS,
  computePeopleSignals,
  buildDismissedSet,
  daysBetween,
  type SignalData,
} from '../compute'

// ── isNewHire ────────────────────────────────────────────────────────────────

describe('isNewHire', () => {
  const today = new Date('2024-06-15')

  it('returns true when start_date is today', () => {
    expect(isNewHire('2024-06-15', today)).toBe(true)
  })

  it('returns true when start_date is 1 day ago', () => {
    expect(isNewHire('2024-06-14', today)).toBe(true)
  })

  it('returns true when start_date is 89 days ago (last day in window)', () => {
    const d = new Date(today)
    d.setDate(d.getDate() - (NEW_HIRE_WINDOW_DAYS - 1))
    expect(isNewHire(d.toISOString().split('T')[0], today)).toBe(true)
  })

  it('returns false when start_date is exactly NEW_HIRE_WINDOW_DAYS ago', () => {
    const d = new Date(today)
    d.setDate(d.getDate() - NEW_HIRE_WINDOW_DAYS)
    expect(isNewHire(d.toISOString().split('T')[0], today)).toBe(false)
  })

  it('returns false when start_date is 200 days ago', () => {
    expect(isNewHire('2023-12-01', today)).toBe(false)
  })

  it('returns false for null start_date', () => {
    expect(isNewHire(null, today)).toBe(false)
  })

  it('returns false for undefined start_date', () => {
    expect(isNewHire(undefined, today)).toBe(false)
  })

  it('returns false when start_date is in the future', () => {
    // Future start dates should not count as new hires — daysBetween will be negative
    expect(isNewHire('2024-07-01', today)).toBe(false)
  })
})

// ── NEW_HIRE_WINDOW_DAYS ─────────────────────────────────────────────────────

describe('NEW_HIRE_WINDOW_DAYS', () => {
  it('is 90', () => {
    expect(NEW_HIRE_WINDOW_DAYS).toBe(90)
  })
})

// ── computePeopleSignals — new hire threshold adjustments ────────────────────

function makeData(overrides: Partial<SignalData> = {}): SignalData {
  return {
    overdueTasks: [],
    activePeople: [],
    recentMeetings: [],
    upcomingTasks: [],
    evidenceRecent: [],
    meetingsWithNotes: [],
    openFollowUps: [],
    tasksByPerson: [],
    ...overrides,
  }
}

function dateStr(daysAgo: number, base = new Date('2024-06-15')): string {
  const d = new Date(base)
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

const TODAY = new Date('2024-06-15')
const DISMISSED = buildDismissedSet([])

// Helper: a person who started N days ago
function newHirePerson(startedDaysAgo: number) {
  return { id: 'p1', full_name: 'Alice', role: null, start_date: dateStr(startedDaysAgo) }
}
function veteranPerson() {
  return { id: 'p1', full_name: 'Alice', role: null, start_date: dateStr(200) }
}

// ── no_recent_1on1 thresholds ────────────────────────────────────────────────

describe('computePeopleSignals — no_recent_1on1 for new hire', () => {
  it('fires warning at 7 days (not 14) for new hire', () => {
    const person = newHirePerson(10)
    const data = makeData({
      activePeople: [person],
      recentMeetings: [
        { id: 'm1', meeting_type: '1:1', meeting_date: dateStr(7), person_id: 'p1', action_items: null, notes: null, title: '1:1' },
      ],
    })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const s = signals.find(x => x.type === 'no_recent_1on1')
    expect(s).toBeDefined()
    expect(s!.severity).toBe('warning')
    expect(s!.meta?.isNewHire).toBe(true)
  })

  it('fires critical at 14 days for new hire (not 21)', () => {
    const person = newHirePerson(10)
    const data = makeData({
      activePeople: [person],
      recentMeetings: [
        { id: 'm1', meeting_type: '1:1', meeting_date: dateStr(14), person_id: 'p1', action_items: null, notes: null, title: '1:1' },
      ],
    })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const s = signals.find(x => x.type === 'no_recent_1on1')
    expect(s).toBeDefined()
    expect(s!.severity).toBe('critical')
    expect(s!.meta?.isNewHire).toBe(true)
  })

  it('does NOT fire warning at 7 days for veteran (requires 14)', () => {
    const person = veteranPerson()
    const data = makeData({
      activePeople: [person],
      recentMeetings: [
        { id: 'm1', meeting_type: '1:1', meeting_date: dateStr(7), person_id: 'p1', action_items: null, notes: null, title: '1:1' },
      ],
    })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const s = signals.find(x => x.type === 'no_recent_1on1')
    expect(s).toBeUndefined()
  })

  it('does NOT fire at 13 days for veteran (threshold is 14)', () => {
    const person = veteranPerson()
    const data = makeData({
      activePeople: [person],
      recentMeetings: [
        { id: 'm1', meeting_type: '1:1', meeting_date: dateStr(13), person_id: 'p1', action_items: null, notes: null, title: '1:1' },
      ],
    })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const s = signals.find(x => x.type === 'no_recent_1on1')
    expect(s).toBeUndefined()
  })

  it('fires warning at 14 days for veteran', () => {
    const person = veteranPerson()
    const data = makeData({
      activePeople: [person],
      recentMeetings: [
        { id: 'm1', meeting_type: '1:1', meeting_date: dateStr(14), person_id: 'p1', action_items: null, notes: null, title: '1:1' },
      ],
    })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const s = signals.find(x => x.type === 'no_recent_1on1')
    expect(s).toBeDefined()
    expect(s!.severity).toBe('warning')
    expect(s!.meta?.isNewHire).toBe(false)
  })

  it('fires critical at 21 days for veteran (not 14)', () => {
    const person = veteranPerson()
    const data = makeData({
      activePeople: [person],
      recentMeetings: [
        { id: 'm1', meeting_type: '1:1', meeting_date: dateStr(21), person_id: 'p1', action_items: null, notes: null, title: '1:1' },
      ],
    })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const s = signals.find(x => x.type === 'no_recent_1on1')
    expect(s).toBeDefined()
    expect(s!.severity).toBe('critical')
  })

  it('fires critical when no 1:1 ever exists for new hire', () => {
    const person = newHirePerson(10)
    const data = makeData({ activePeople: [person] })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const s = signals.find(x => x.type === 'no_recent_1on1')
    expect(s).toBeDefined()
    expect(s!.severity).toBe('critical')
    expect(s!.meta?.isNewHire).toBe(true)
  })
})

// ── no_evidence thresholds ────────────────────────────────────────────────────

describe('computePeopleSignals — no_evidence for new hire', () => {
  it('fires for new hire with no evidence in 30 days (even if evidence exists >30 days ago)', () => {
    const person = newHirePerson(10)
    const data = makeData({
      activePeople: [person],
      // Evidence is 45 days old — within 90-day window but outside new hire 30-day window
      evidenceRecent: [
        { person_id: 'p1', occurred_at: dateStr(45), sentiment: 'positive' },
      ],
    })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const s = signals.find(x => x.type === 'no_evidence')
    expect(s).toBeDefined()
    expect(s!.meta?.isNewHire).toBe(true)
  })

  it('does NOT fire for new hire when evidence exists within 30 days', () => {
    const person = newHirePerson(10)
    const data = makeData({
      activePeople: [person],
      evidenceRecent: [
        { person_id: 'p1', occurred_at: dateStr(20), sentiment: 'positive' },
      ],
    })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const s = signals.find(x => x.type === 'no_evidence')
    expect(s).toBeUndefined()
  })

  it('does NOT fire for veteran with evidence in past 90 days', () => {
    const person = veteranPerson()
    const data = makeData({
      activePeople: [person],
      evidenceRecent: [
        { person_id: 'p1', occurred_at: dateStr(60), sentiment: 'neutral' },
      ],
    })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const s = signals.find(x => x.type === 'no_evidence')
    expect(s).toBeUndefined()
  })

  it('fires for veteran with no evidence in 90 days', () => {
    const person = veteranPerson()
    const data = makeData({ activePeople: [person] })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const s = signals.find(x => x.type === 'no_evidence')
    expect(s).toBeDefined()
    expect(s!.meta?.isNewHire).toBe(false)
  })

  it('message includes correct window for new hire (30)', () => {
    const person = newHirePerson(10)
    const data = makeData({ activePeople: [person] })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const s = signals.find(x => x.type === 'no_evidence')
    expect(s?.message).toContain('30 days')
  })

  it('message includes correct window for veteran (90)', () => {
    const person = veteranPerson()
    const data = makeData({ activePeople: [person] })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const s = signals.find(x => x.type === 'no_evidence')
    expect(s?.message).toContain('90 days')
  })
})

// ── missing_notes thresholds ─────────────────────────────────────────────────

describe('computePeopleSignals — missing_notes for new hire', () => {
  it('fires for new hire with last note 14 days ago', () => {
    const person = newHirePerson(10)
    const data = makeData({
      activePeople: [person],
      meetingsWithNotes: [
        { id: 'm1', person_id: 'p1', meeting_date: dateStr(14), notes: 'some notes' },
      ],
    })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const s = signals.find(x => x.type === 'missing_notes')
    expect(s).toBeDefined()
    expect(s!.meta?.isNewHire).toBe(true)
  })

  it('does NOT fire for new hire with note 13 days ago', () => {
    const person = newHirePerson(10)
    const data = makeData({
      activePeople: [person],
      meetingsWithNotes: [
        { id: 'm1', person_id: 'p1', meeting_date: dateStr(13), notes: 'recent note' },
      ],
    })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const s = signals.find(x => x.type === 'missing_notes')
    expect(s).toBeUndefined()
  })

  it('fires for veteran with no notes (last note window is 21d — no notes = fires)', () => {
    const person = veteranPerson()
    const data = makeData({ activePeople: [person] })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const s = signals.find(x => x.type === 'missing_notes')
    expect(s).toBeDefined()
    expect(s!.meta?.isNewHire).toBe(false)
  })

  it('does NOT fire for veteran with note 14 days ago (threshold is 21)', () => {
    const person = veteranPerson()
    const data = makeData({
      activePeople: [person],
      meetingsWithNotes: [
        { id: 'm1', person_id: 'p1', meeting_date: dateStr(14), notes: 'note' },
      ],
    })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const s = signals.find(x => x.type === 'missing_notes')
    expect(s).toBeUndefined()
  })
})

// ── new_hire_at_risk compound signal ─────────────────────────────────────────

describe('computePeopleSignals — new_hire_at_risk compound signal', () => {
  it('fires when new hire triggers 2+ signals', () => {
    // new hire with no 1:1 (>7d) AND no evidence (>30d) → 2 signals → compound fires
    const person = newHirePerson(10)
    const data = makeData({ activePeople: [person] })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const compound = signals.find(x => x.type === 'new_hire_at_risk')
    expect(compound).toBeDefined()
    expect(compound!.severity).toBe('critical')
    expect(compound!.meta?.isNewHire).toBe(true)
    const fired = compound!.meta?.firedSignalTypes as string[]
    expect(fired.length).toBeGreaterThanOrEqual(2)
  })

  it('does NOT fire for new hire with only 1 signal', () => {
    // new hire with a recent 1:1 (6 days ago) and recent evidence (5 days ago) and recent notes (5 days ago)
    // → only missing_notes might fire at 6 days since that's <14, so all clear except maybe nothing
    const person = newHirePerson(30)
    const data = makeData({
      activePeople: [person],
      recentMeetings: [
        // 1:1 only 6 days ago — within new hire 7-day threshold
        { id: 'm1', meeting_type: '1:1', meeting_date: dateStr(6), person_id: 'p1', action_items: null, notes: 'n', title: '1:1' },
      ],
      evidenceRecent: [
        { person_id: 'p1', occurred_at: dateStr(5), sentiment: 'positive' },
      ],
      meetingsWithNotes: [
        { id: 'm2', person_id: 'p1', meeting_date: dateStr(5), notes: 'some notes' },
      ],
    })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const compound = signals.find(x => x.type === 'new_hire_at_risk')
    expect(compound).toBeUndefined()
  })

  it('does NOT fire for veteran even with multiple signals', () => {
    // veteran with no 1:1, no evidence, no notes → multiple signals but NOT new hire
    const person = veteranPerson()
    const data = makeData({ activePeople: [person] })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const compound = signals.find(x => x.type === 'new_hire_at_risk')
    expect(compound).toBeUndefined()
  })

  it('does NOT fire when new_hire_at_risk is dismissed', () => {
    const person = newHirePerson(10)
    const data = makeData({ activePeople: [person] })
    const dismissed = buildDismissedSet([
      { itemType: 'new_hire_at_risk', referenceId: 'p1' },
    ])
    const signals = computePeopleSignals(data, dismissed, TODAY)
    const compound = signals.find(x => x.type === 'new_hire_at_risk')
    expect(compound).toBeUndefined()
  })

  it('fires for new hire on exactly day 89 (still within window)', () => {
    const person = newHirePerson(89)
    const data = makeData({ activePeople: [person] })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const compound = signals.find(x => x.type === 'new_hire_at_risk')
    expect(compound).toBeDefined()
  })

  it('does NOT fire for person on exactly day 90 (outside window)', () => {
    const person = newHirePerson(90)
    const data = makeData({ activePeople: [person] })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const compound = signals.find(x => x.type === 'new_hire_at_risk')
    expect(compound).toBeUndefined()
  })

  it('includes firedSignalTypes in meta', () => {
    const person = newHirePerson(10)
    const data = makeData({ activePeople: [person] })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const compound = signals.find(x => x.type === 'new_hire_at_risk')
    expect(Array.isArray(compound?.meta?.firedSignalTypes)).toBe(true)
  })

  it('fires with exactly 2 signals when only no_recent_1on1 + no_evidence fire', () => {
    const person = newHirePerson(10)
    // Has recent notes (5d ago) to avoid missing_notes firing
    // No 1:1 in 8 days (>7d threshold → fires), no evidence
    const data = makeData({
      activePeople: [person],
      recentMeetings: [
        { id: 'm1', meeting_type: '1:1', meeting_date: dateStr(8), person_id: 'p1', action_items: null, notes: null, title: '1:1' },
      ],
      meetingsWithNotes: [
        { id: 'm2', person_id: 'p1', meeting_date: dateStr(5), notes: 'notes' },
      ],
      // no evidence within 30 days
    })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const compound = signals.find(x => x.type === 'new_hire_at_risk')
    expect(compound).toBeDefined()
    const fired = compound!.meta!.firedSignalTypes as string[]
    expect(fired).toContain('no_recent_1on1')
    expect(fired).toContain('no_evidence')
  })
})

// ── isNewHire flag in meta ────────────────────────────────────────────────────

describe('computePeopleSignals — isNewHire meta flag', () => {
  it('sets isNewHire=true in meta for new hire signals', () => {
    const person = newHirePerson(10)
    const data = makeData({ activePeople: [person] })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const personSignals = signals.filter(x => x.personId === 'p1' && x.meta?.isNewHire !== undefined)
    expect(personSignals.length).toBeGreaterThan(0)
    for (const s of personSignals) {
      expect(s.meta?.isNewHire).toBe(true)
    }
  })

  it('sets isNewHire=false in meta for veteran signals', () => {
    const person = veteranPerson()
    const data = makeData({ activePeople: [person] })
    const signals = computePeopleSignals(data, DISMISSED, TODAY)
    const personSignals = signals.filter(x => x.personId === 'p1' && x.meta?.isNewHire !== undefined)
    for (const s of personSignals) {
      expect(s.meta?.isNewHire).toBe(false)
    }
  })
})
