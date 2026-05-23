/**
 * buildTeamCompetencySummaryPrompt — unit tests
 * Pure functions; no mocks needed.
 */

import { describe, it, expect } from 'vitest'
import {
  buildTeamCompetencySummaryPrompt,
  buildTeamCompetencySummaryPromptFromSnapshot,
  TEAM_COMPETENCY_SUMMARY_SYSTEM,
  type TeamCompetencySummaryArea,
} from '../prompts'

const makeArea = (overrides: Partial<TeamCompetencySummaryArea> = {}): TeamCompetencySummaryArea => ({
  areaName: 'System Design',
  totalAssessed: 4,
  belowExpected: 2,
  atExpected: 1,
  aboveExpected: 1,
  avgGap: -0.5,
  pctBelowExpected: 50,
  ...overrides,
})

describe('TEAM_COMPETENCY_SUMMARY_SYSTEM', () => {
  it('exists and is a non-empty string', () => {
    expect(typeof TEAM_COMPETENCY_SUMMARY_SYSTEM).toBe('string')
    expect(TEAM_COMPETENCY_SUMMARY_SYSTEM.length).toBeGreaterThan(50)
  })

  it('instructs the model not to name individuals', () => {
    expect(TEAM_COMPETENCY_SUMMARY_SYSTEM.toLowerCase()).toContain('aggregate')
    expect(TEAM_COMPETENCY_SUMMARY_SYSTEM.toLowerCase()).toMatch(/never name individuals|aggregate only/)
  })

  it('mentions skip-level audience', () => {
    expect(TEAM_COMPETENCY_SUMMARY_SYSTEM.toLowerCase()).toContain('skip-level')
  })
})

describe('buildTeamCompetencySummaryPrompt', () => {
  it('includes team name in output', () => {
    const prompt = buildTeamCompetencySummaryPrompt({
      teamName: 'Platform Engineering',
      totalPeople: 5,
      assessedPeople: 4,
      areas: [makeArea()],
    })
    expect(prompt).toContain('Platform Engineering')
  })

  it('includes people counts', () => {
    const prompt = buildTeamCompetencySummaryPrompt({
      teamName: 'My Team',
      totalPeople: 6,
      assessedPeople: 3,
      areas: [makeArea()],
    })
    expect(prompt).toContain('6')
    expect(prompt).toContain('3')
  })

  it('includes area name in output', () => {
    const prompt = buildTeamCompetencySummaryPrompt({
      teamName: 'My Team',
      totalPeople: 3,
      assessedPeople: 3,
      areas: [makeArea({ areaName: 'Communication' })],
    })
    expect(prompt).toContain('Communication')
  })

  it('shows pct below expected rounded to integer', () => {
    const prompt = buildTeamCompetencySummaryPrompt({
      teamName: 'My Team',
      totalPeople: 4,
      assessedPeople: 4,
      areas: [makeArea({ pctBelowExpected: 66.666 })],
    })
    expect(prompt).toContain('67%')
  })

  it('shows negative avg gap with sign', () => {
    const prompt = buildTeamCompetencySummaryPrompt({
      teamName: 'My Team',
      totalPeople: 2,
      assessedPeople: 2,
      areas: [makeArea({ avgGap: -1.5 })],
    })
    expect(prompt).toContain('-1.5')
  })

  it('shows positive avg gap with + prefix', () => {
    const prompt = buildTeamCompetencySummaryPrompt({
      teamName: 'My Team',
      totalPeople: 2,
      assessedPeople: 2,
      areas: [makeArea({ avgGap: 1.0 })],
    })
    // avgGap.toFixed(1) = "1.0", and since "1.0" > "0" the + prefix is shown
    expect(prompt).toContain('+1.0')
  })

  it('handles empty areas with a no-data message', () => {
    const prompt = buildTeamCompetencySummaryPrompt({
      teamName: 'Empty Team',
      totalPeople: 5,
      assessedPeople: 0,
      areas: [],
    })
    expect(prompt).toContain('Empty Team')
    expect(prompt.toLowerCase()).toContain('no competency assessments')
  })

  it('limits output to at most 15 areas', () => {
    const manyAreas = Array.from({ length: 20 }, (_, i) =>
      makeArea({ areaName: `Area ${i + 1}` })
    )
    const prompt = buildTeamCompetencySummaryPrompt({
      teamName: 'Big Team',
      totalPeople: 20,
      assessedPeople: 20,
      areas: manyAreas,
    })
    // Areas 16-20 should not appear
    expect(prompt).not.toContain('Area 16')
    expect(prompt).not.toContain('Area 20')
    // Area 15 should appear
    expect(prompt).toContain('Area 15')
  })

  it('lists multiple areas each on their own line', () => {
    const areas = [
      makeArea({ areaName: 'System Design', pctBelowExpected: 75 }),
      makeArea({ areaName: 'Communication', pctBelowExpected: 40 }),
    ]
    const prompt = buildTeamCompetencySummaryPrompt({
      teamName: 'My Team',
      totalPeople: 4,
      assessedPeople: 4,
      areas,
    })
    expect(prompt).toContain('System Design')
    expect(prompt).toContain('Communication')
  })
})

describe('buildTeamCompetencySummaryPromptFromSnapshot', () => {
  it('delegates correctly to buildTeamCompetencySummaryPrompt', () => {
    const snapshot = {
      totalPeople: 5,
      assessedPeople: 3,
      areas: [makeArea({ areaName: 'Delivery' })],
    }
    const prompt = buildTeamCompetencySummaryPromptFromSnapshot({
      teamName: 'Core Team',
      snapshot,
    })
    expect(prompt).toContain('Core Team')
    expect(prompt).toContain('Delivery')
    expect(prompt).toContain('5')
    expect(prompt).toContain('3')
  })

  it('passes empty areas through to produce no-data message', () => {
    const prompt = buildTeamCompetencySummaryPromptFromSnapshot({
      teamName: 'Ghost Team',
      snapshot: { totalPeople: 2, assessedPeople: 0, areas: [] },
    })
    expect(prompt.toLowerCase()).toContain('no competency assessments')
  })
})
