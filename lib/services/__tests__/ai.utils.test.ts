/**
 * AI Service Utility Evals
 * Tests token estimation, truncation, and context assembly helpers.
 * These are pure functions — no mocking needed.
 */

import { describe, it, expect } from 'vitest'
import {
  estimateTokens,
  truncateToTokenBudget,
  assembleMeetingContext,
  assembleEvidenceContext,
} from '../ai'

describe('estimateTokens', () => {
  it('estimates 1 token per 4 chars', () => {
    expect(estimateTokens('abcd')).toBe(1)
    expect(estimateTokens('abcdefgh')).toBe(2)
  })

  it('rounds up for partial tokens', () => {
    expect(estimateTokens('abc')).toBe(1)   // 3/4 → ceil → 1
    expect(estimateTokens('abcde')).toBe(2) // 5/4 → ceil → 2
  })

  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('handles large text', () => {
    const text = 'x'.repeat(4000)
    expect(estimateTokens(text)).toBe(1000)
  })
})

describe('truncateToTokenBudget', () => {
  it('returns text unchanged when within budget', () => {
    const text = 'Hello world'
    expect(truncateToTokenBudget(text, 100)).toBe(text)
  })

  it('truncates text that exceeds budget', () => {
    const text = 'x'.repeat(100)
    const result = truncateToTokenBudget(text, 10) // 10 tokens = 40 chars
    expect(result.length).toBeLessThan(text.length)
    expect(result).toContain('[truncated]')
  })

  it('appends [truncated] marker on truncation', () => {
    const text = 'a'.repeat(1000)
    const result = truncateToTokenBudget(text, 50)
    expect(result.endsWith('[truncated]')).toBe(true)
  })

  it('exactly at budget limit is not truncated', () => {
    const text = 'a'.repeat(400) // 400 chars = 100 tokens exactly
    const result = truncateToTokenBudget(text, 100)
    expect(result).toBe(text)
    expect(result).not.toContain('[truncated]')
  })

  it('one char over budget triggers truncation', () => {
    const text = 'a'.repeat(401)
    const result = truncateToTokenBudget(text, 100)
    expect(result).toContain('[truncated]')
  })
})

describe('assembleMeetingContext', () => {
  it('formats meeting entries correctly', () => {
    const meetings = [
      { title: 'Sprint Retro', meetingType: 'Retro', meetingDate: '2026-04-01', notes: 'Went well', actionItems: null },
    ]
    const result = assembleMeetingContext(meetings)
    expect(result).toContain('Retro')
    expect(result).toContain('Sprint Retro')
    expect(result).toContain('2026-04-01')
    expect(result).toContain('Went well')
  })

  it('omits notes section when notes is null', () => {
    const meetings = [
      { title: 'No notes meeting', meetingType: '1:1', meetingDate: '2026-01-01', notes: null, actionItems: null },
    ]
    const result = assembleMeetingContext(meetings)
    expect(result).toBe('1:1: No notes meeting (2026-01-01)')
  })

  it('truncates long notes to maxCharsPerMeeting', () => {
    const longNotes = 'n'.repeat(1000)
    const meetings = [
      { title: 'Long notes', meetingType: '1:1', meetingDate: '2026-01-01', notes: longNotes },
    ]
    const result = assembleMeetingContext(meetings, 100)
    // The notes portion should be capped at 100 chars
    const notesInResult = result.split(': ').slice(2).join(': ')
    expect(notesInResult.length).toBeLessThanOrEqual(100)
  })

  it('joins multiple meetings with newlines', () => {
    const meetings = [
      { title: 'M1', meetingType: '1:1', meetingDate: '2026-01-01', notes: null },
      { title: 'M2', meetingType: '1:1', meetingDate: '2026-01-08', notes: null },
    ]
    const result = assembleMeetingContext(meetings)
    const lines = result.split('\n')
    expect(lines).toHaveLength(2)
  })

  it('returns empty string for empty array', () => {
    expect(assembleMeetingContext([])).toBe('')
  })
})

describe('assembleEvidenceContext', () => {
  it('formats evidence entries with category, title, and date', () => {
    const evidence = [
      { category: 'achievement', title: 'Led migration', occurredAt: '2026-03-10', content: 'Completed early.' },
    ]
    const result = assembleEvidenceContext(evidence)
    expect(result).toContain('[achievement]')
    expect(result).toContain('Led migration')
    expect(result).toContain('2026-03-10')
    expect(result).toContain('Completed early.')
  })

  it('omits content when null', () => {
    const evidence = [
      { category: 'concern', title: 'Late PRs', occurredAt: '2026-01-01', content: null },
    ]
    const result = assembleEvidenceContext(evidence)
    expect(result).toBe('[concern] Late PRs (2026-01-01)')
  })

  it('truncates content to 300 chars', () => {
    const longContent = 'c'.repeat(500)
    const evidence = [
      { category: 'general', title: 'Long note', occurredAt: '2026-01-01', content: longContent },
    ]
    const result = assembleEvidenceContext(evidence)
    // Content portion capped at 300 chars
    const contentPart = result.split(': ')[2] ?? ''
    expect(contentPart.length).toBeLessThanOrEqual(300)
  })

  it('joins multiple entries with newlines', () => {
    const evidence = [
      { category: 'achievement', title: 'E1', occurredAt: '2026-01-01', content: null },
      { category: 'concern', title: 'E2', occurredAt: '2026-02-01', content: null },
    ]
    const result = assembleEvidenceContext(evidence)
    expect(result.split('\n')).toHaveLength(2)
  })

  it('returns empty string for empty array', () => {
    expect(assembleEvidenceContext([])).toBe('')
  })
})
