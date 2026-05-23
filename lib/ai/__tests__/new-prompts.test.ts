/**
 * Tests for new AI prompt builders:
 * - MEETING_TLDR_SYSTEM / buildMeetingTldrPrompt
 * - BATCH_EVIDENCE_EXTRACTION_SYSTEM / buildBatchEvidencePrompt
 * - TEAM_HEALTH_NARRATIVE_SYSTEM / buildTeamHealthNarrativePrompt
 */

import { describe, it, expect } from 'vitest'
import {
  MEETING_TLDR_SYSTEM,
  buildMeetingTldrPrompt,
  BATCH_EVIDENCE_EXTRACTION_SYSTEM,
  buildBatchEvidencePrompt,
  TEAM_HEALTH_NARRATIVE_SYSTEM,
  buildTeamHealthNarrativePrompt,
} from '../prompts'
import type { TeamHealthInput } from '../prompts'

// ─── Meeting TL;DR ─────────────────────────────────────────────────────────────

describe('MEETING_TLDR_SYSTEM', () => {
  it('exists and is a non-empty string', () => {
    expect(typeof MEETING_TLDR_SYSTEM).toBe('string')
    expect(MEETING_TLDR_SYSTEM.length).toBeGreaterThan(10)
  })

  it('instructs plain text output', () => {
    expect(MEETING_TLDR_SYSTEM).toMatch(/plain text/i)
  })

  it('specifies 2-sentence output', () => {
    expect(MEETING_TLDR_SYSTEM).toMatch(/2 sentences/i)
  })
})

describe('buildMeetingTldrPrompt', () => {
  it('includes meeting title and type', () => {
    const prompt = buildMeetingTldrPrompt({
      title: '1:1 with Alice',
      meetingType: '1:1',
      notes: 'We discussed career goals and the upcoming promotion cycle.',
    })
    expect(prompt).toContain('1:1 with Alice')
    expect(prompt).toContain('1:1')
  })

  it('includes notes content', () => {
    const notes = 'Long discussion about Q2 OKRs and team structure.'
    const prompt = buildMeetingTldrPrompt({ title: 'Meeting', meetingType: 'Team Sync', notes })
    expect(prompt).toContain(notes)
  })

  it('includes action items when provided', () => {
    const prompt = buildMeetingTldrPrompt({
      title: 'Meeting',
      meetingType: '1:1',
      notes: 'Talked about performance.',
      actionItems: 'Schedule calibration session',
    })
    expect(prompt).toContain('Schedule calibration session')
  })

  it('omits action items section when null', () => {
    const prompt = buildMeetingTldrPrompt({
      title: 'Meeting',
      meetingType: '1:1',
      notes: 'Some notes here.',
      actionItems: null,
    })
    expect(prompt).not.toContain('Action items:')
  })

  it('truncates very long notes to stay within token budget', () => {
    const longNotes = 'a'.repeat(20000)
    const prompt = buildMeetingTldrPrompt({ title: 'Meeting', meetingType: 'Retro', notes: longNotes })
    // 3000 token budget = 12000 chars max for content
    expect(prompt.length).toBeLessThan(15000)
    expect(prompt).toContain('[truncated]')
  })
})

// ─── Batch Evidence Extraction ─────────────────────────────────────────────────

describe('BATCH_EVIDENCE_EXTRACTION_SYSTEM', () => {
  it('exists and is non-empty', () => {
    expect(typeof BATCH_EVIDENCE_EXTRACTION_SYSTEM).toBe('string')
    expect(BATCH_EVIDENCE_EXTRACTION_SYSTEM.length).toBeGreaterThan(10)
  })

  it('specifies JSON array output', () => {
    expect(BATCH_EVIDENCE_EXTRACTION_SYSTEM).toMatch(/JSON array/i)
  })

  it('lists required fields in output schema', () => {
    expect(BATCH_EVIDENCE_EXTRACTION_SYSTEM).toContain('title')
    expect(BATCH_EVIDENCE_EXTRACTION_SYSTEM).toContain('category')
    expect(BATCH_EVIDENCE_EXTRACTION_SYSTEM).toContain('sentiment')
    expect(BATCH_EVIDENCE_EXTRACTION_SYSTEM).toContain('personName')
    expect(BATCH_EVIDENCE_EXTRACTION_SYSTEM).toContain('occurredAt')
  })

  it('instructs to return empty array when no evidence found', () => {
    expect(BATCH_EVIDENCE_EXTRACTION_SYSTEM).toMatch(/empty array/i)
  })
})

describe('buildBatchEvidencePrompt', () => {
  const people = [
    { id: 'p1', name: 'Alice Chen' },
    { id: 'p2', name: 'Bob Smith' },
  ]

  it('includes today date', () => {
    const prompt = buildBatchEvidencePrompt({ text: 'Some text', people, today: '2026-05-23' })
    expect(prompt).toContain('2026-05-23')
  })

  it('includes all people names', () => {
    const prompt = buildBatchEvidencePrompt({ text: 'Some text', people, today: '2026-05-23' })
    expect(prompt).toContain('Alice Chen')
    expect(prompt).toContain('Bob Smith')
  })

  it('includes the pasted text', () => {
    const text = 'Alice delivered the project two weeks early.'
    const prompt = buildBatchEvidencePrompt({ text, people, today: '2026-05-23' })
    expect(prompt).toContain(text)
  })

  it('includes context person name when provided', () => {
    const prompt = buildBatchEvidencePrompt({
      text: 'Great work on the migration.',
      people,
      today: '2026-05-23',
      contextPersonName: 'Alice Chen',
    })
    expect(prompt).toContain('Alice Chen')
  })

  it('handles empty people list', () => {
    const prompt = buildBatchEvidencePrompt({ text: 'Some text', people: [], today: '2026-05-23' })
    expect(prompt).toContain('No people directory provided')
  })

  it('truncates very long input text', () => {
    const longText = 'x'.repeat(20000)
    const prompt = buildBatchEvidencePrompt({ text: longText, people: [], today: '2026-05-23' })
    expect(prompt.length).toBeLessThan(20000)
    expect(prompt).toContain('[truncated]')
  })
})

// ─── Team Health Narrative ────────────────────────────────────────────────────

describe('TEAM_HEALTH_NARRATIVE_SYSTEM', () => {
  it('exists and is non-empty', () => {
    expect(typeof TEAM_HEALTH_NARRATIVE_SYSTEM).toBe('string')
    expect(TEAM_HEALTH_NARRATIVE_SYSTEM.length).toBeGreaterThan(10)
  })

  it('prohibits individual names', () => {
    expect(TEAM_HEALTH_NARRATIVE_SYSTEM).toMatch(/no individual names/i)
  })

  it('specifies plain text output', () => {
    expect(TEAM_HEALTH_NARRATIVE_SYSTEM).toMatch(/plain text/i)
  })
})

describe('buildTeamHealthNarrativePrompt', () => {
  const base: TeamHealthInput = {
    score: 75,
    label: 'Needs attention',
    breakdown: { tasks: 2, people: 1, followUps: 0, goals: 1 },
    topSignals: [
      { type: 'sentiment_drift', severity: 'critical', message: 'Negative trend detected' },
      { type: 'overdue_follow_up', severity: 'warning', message: 'Follow-up overdue by 10 days' },
    ],
  }

  it('includes score and label', () => {
    const prompt = buildTeamHealthNarrativePrompt(base)
    expect(prompt).toContain('75')
    expect(prompt).toContain('Needs attention')
  })

  it('includes breakdown counts', () => {
    const prompt = buildTeamHealthNarrativePrompt(base)
    expect(prompt).toContain('Tasks: 2')
    expect(prompt).toContain('People: 1')
    expect(prompt).toContain('Follow-ups: 0')
    expect(prompt).toContain('Goals: 1')
  })

  it('includes top signal messages', () => {
    const prompt = buildTeamHealthNarrativePrompt(base)
    expect(prompt).toContain('Negative trend detected')
    expect(prompt).toContain('Follow-up overdue by 10 days')
  })

  it('handles empty signals list', () => {
    const prompt = buildTeamHealthNarrativePrompt({ ...base, topSignals: [] })
    expect(prompt).toContain('No active signals')
  })

  it('limits top signals to 5', () => {
    const manySignals = Array.from({ length: 10 }, (_, i) => ({
      type: 'overdue_task',
      severity: 'warning' as const,
      message: `Signal ${i}`,
    }))
    const prompt = buildTeamHealthNarrativePrompt({ ...base, topSignals: manySignals })
    // Only first 5 should appear
    expect(prompt).toContain('Signal 4')
    expect(prompt).not.toContain('Signal 5')
  })
})
