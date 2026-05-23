/**
 * Unit tests for follow-up draft prompt builder.
 * Pure function tests — no mocks needed.
 */

import { describe, it, expect } from 'vitest'
import {
  buildFollowUpDraftPrompt,
  FOLLOW_UP_DRAFT_SYSTEM,
  type FollowUpDraftArgs,
  type FollowUpDraftTone,
} from '@/lib/ai/prompts'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_ARGS: FollowUpDraftArgs = {
  personName:   'Alice Chen',
  meetingTitle: '1:1 with Alice',
  meetingDate:  '2026-05-23',
  notes:        "Discussed Q2 roadmap and Alice's promotion timeline.",
  actionItems:  '- Alice to draft spec by Friday\n- Review PR #42',
  followUps:    [{ title: 'Check on promo timeline' }, { title: 'Share salary band info' }],
  tone:         'casual',
}

// ─── FOLLOW_UP_DRAFT_SYSTEM ───────────────────────────────────────────────────

describe('FOLLOW_UP_DRAFT_SYSTEM', () => {
  it('is a non-empty string', () => {
    expect(typeof FOLLOW_UP_DRAFT_SYSTEM).toBe('string')
    expect(FOLLOW_UP_DRAFT_SYSTEM.length).toBeGreaterThan(50)
  })

  it('mentions all three tone variants', () => {
    expect(FOLLOW_UP_DRAFT_SYSTEM).toContain('formal')
    expect(FOLLOW_UP_DRAFT_SYSTEM).toContain('casual')
    expect(FOLLOW_UP_DRAFT_SYSTEM).toContain('slack')
  })

  it('instructs to keep under 200 words', () => {
    expect(FOLLOW_UP_DRAFT_SYSTEM).toContain('200 words')
  })

  it('instructs not to fabricate', () => {
    expect(FOLLOW_UP_DRAFT_SYSTEM.toLowerCase()).toContain('fabricate')
  })
})

// ─── buildFollowUpDraftPrompt ─────────────────────────────────────────────────

describe('buildFollowUpDraftPrompt', () => {
  it('includes person name', () => {
    const result = buildFollowUpDraftPrompt(BASE_ARGS)
    expect(result).toContain('Alice Chen')
  })

  it('includes meeting title and date', () => {
    const result = buildFollowUpDraftPrompt(BASE_ARGS)
    expect(result).toContain('1:1 with Alice')
    expect(result).toContain('2026-05-23')
  })

  it('includes meeting notes', () => {
    const result = buildFollowUpDraftPrompt(BASE_ARGS)
    expect(result).toContain('Q2 roadmap')
    expect(result).toContain('promotion timeline')
  })

  it('includes action items', () => {
    const result = buildFollowUpDraftPrompt(BASE_ARGS)
    expect(result).toContain('draft spec by Friday')
    expect(result).toContain('Review PR #42')
  })

  it('includes follow-up commitments', () => {
    const result = buildFollowUpDraftPrompt(BASE_ARGS)
    expect(result).toContain('Check on promo timeline')
    expect(result).toContain('Share salary band info')
  })

  it('includes selected tone', () => {
    const tones: FollowUpDraftTone[] = ['formal', 'casual', 'slack']
    for (const tone of tones) {
      const result = buildFollowUpDraftPrompt({ ...BASE_ARGS, tone })
      expect(result).toContain(tone)
    }
  })

  // ─── Graceful degradation ────────────────────────────────────────────────────

  it('handles null notes', () => {
    const result = buildFollowUpDraftPrompt({ ...BASE_ARGS, notes: null })
    expect(result).toContain('No notes recorded')
    // Should still include other data
    expect(result).toContain('Alice Chen')
  })

  it('handles undefined notes', () => {
    const result = buildFollowUpDraftPrompt({ ...BASE_ARGS, notes: undefined })
    expect(result).toContain('No notes recorded')
  })

  it('handles empty string notes', () => {
    const result = buildFollowUpDraftPrompt({ ...BASE_ARGS, notes: '' })
    expect(result).toContain('No notes recorded')
  })

  it('handles null actionItems', () => {
    const result = buildFollowUpDraftPrompt({ ...BASE_ARGS, actionItems: null })
    expect(result).toContain('None recorded')
  })

  it('handles undefined actionItems', () => {
    const result = buildFollowUpDraftPrompt({ ...BASE_ARGS, actionItems: undefined })
    expect(result).toContain('None recorded')
  })

  it('handles empty actionItems string', () => {
    const result = buildFollowUpDraftPrompt({ ...BASE_ARGS, actionItems: '' })
    expect(result).toContain('None recorded')
  })

  it('handles empty followUps array', () => {
    const result = buildFollowUpDraftPrompt({ ...BASE_ARGS, followUps: [] })
    expect(result).toContain('None recorded')
  })

  it('handles all fields absent — still returns valid prompt', () => {
    const result = buildFollowUpDraftPrompt({
      personName:   'Bob Smith',
      meetingTitle: 'Check-in',
      meetingDate:  '2026-05-23',
      notes:        null,
      actionItems:  null,
      followUps:    [],
      tone:         'formal',
    })
    expect(result).toContain('Bob Smith')
    expect(result).toContain('Check-in')
    expect(result).toContain('formal')
    expect(result).toContain('No notes recorded')
    expect(result).toContain('None recorded')
  })

  // ─── Token budget ─────────────────────────────────────────────────────────────

  it('stays within overall token budget even with very long inputs', () => {
    // Notes are pre-sliced to 1500 chars and action items to 800 chars before
    // the token budget check, so the prompt is always compact
    const longNotes = 'x'.repeat(20000)
    const longActions = 'y'.repeat(5000)
    const result = buildFollowUpDraftPrompt({ ...BASE_ARGS, notes: longNotes, actionItems: longActions })
    // 4000 token budget × 4 chars/token = 16000 chars max
    expect(result.length).toBeLessThanOrEqual(16100)
  })

  it('does not truncate short prompts', () => {
    const result = buildFollowUpDraftPrompt(BASE_ARGS)
    expect(result).not.toContain('[truncated]')
  })

  // ─── Section headers ─────────────────────────────────────────────────────────

  it('contains expected section headers', () => {
    const result = buildFollowUpDraftPrompt(BASE_ARGS)
    expect(result).toContain('=== Meeting Notes ===')
    expect(result).toContain('=== Action Items ===')
    expect(result).toContain('=== Manager Commitments (Follow-ups) ===')
  })

  // ─── Notes truncation at 1500 chars ──────────────────────────────────────────

  it('truncates notes to 1500 chars in the prompt', () => {
    const exactNotes = 'a'.repeat(2000)
    const result = buildFollowUpDraftPrompt({ ...BASE_ARGS, notes: exactNotes })
    // Notes block should not contain more than 1500 of the 'a' chars in sequence
    const notesSection = result.split('=== Action Items ===')[0]
    const aRun = notesSection.match(/a+/)?.[0] ?? ''
    expect(aRun.length).toBeLessThanOrEqual(1500)
  })
})
