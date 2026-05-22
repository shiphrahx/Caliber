/**
 * Middleware Rate Limiter Evals
 * Tests the in-process sliding window rate limiter logic extracted from proxy.ts.
 * Verifies window reset, per-key isolation, and limit boundary behaviour.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ─── Inline the rate limiter so we can test it without Next.js context ────────

const API_RATE_LIMIT = 120
const API_RATE_WINDOW_MS = 60_000

function createRateLimiter(limit = API_RATE_LIMIT, windowMs = API_RATE_WINDOW_MS) {
  const store = new Map<string, { count: number; windowStart: number }>()

  return function isRateLimited(key: string): boolean {
    const now = Date.now()
    const entry = store.get(key)

    if (!entry || now - entry.windowStart > windowMs) {
      store.set(key, { count: 1, windowStart: now })
      return false
    }

    entry.count++
    if (entry.count > limit) return true
    return false
  }
}

describe('rate limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests under the limit', () => {
    const isRateLimited = createRateLimiter(5, 60_000)
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited('user-1')).toBe(false)
    }
  })

  it('blocks the request that exceeds the limit', () => {
    const isRateLimited = createRateLimiter(5, 60_000)
    for (let i = 0; i < 5; i++) isRateLimited('user-1')
    // 6th request should be blocked
    expect(isRateLimited('user-1')).toBe(true)
  })

  it('continues blocking after limit is hit', () => {
    const isRateLimited = createRateLimiter(3, 60_000)
    for (let i = 0; i < 3; i++) isRateLimited('user-1')
    expect(isRateLimited('user-1')).toBe(true)
    expect(isRateLimited('user-1')).toBe(true)
    expect(isRateLimited('user-1')).toBe(true)
  })

  it('resets window after windowMs elapses', () => {
    const isRateLimited = createRateLimiter(3, 60_000)
    for (let i = 0; i < 3; i++) isRateLimited('user-1')
    expect(isRateLimited('user-1')).toBe(true)

    // Advance past the window
    vi.advanceTimersByTime(60_001)

    // Should allow again
    expect(isRateLimited('user-1')).toBe(false)
  })

  it('does not reset window before windowMs elapses', () => {
    const isRateLimited = createRateLimiter(3, 60_000)
    for (let i = 0; i < 3; i++) isRateLimited('user-1')

    vi.advanceTimersByTime(59_999) // just under window

    expect(isRateLimited('user-1')).toBe(true)
  })

  it('isolates limits per key', () => {
    const isRateLimited = createRateLimiter(3, 60_000)
    for (let i = 0; i < 3; i++) isRateLimited('user-1')
    expect(isRateLimited('user-1')).toBe(true)

    // Different key should be unaffected
    expect(isRateLimited('user-2')).toBe(false)
    expect(isRateLimited('user-2')).toBe(false)
  })

  it('first request in a new window is never blocked', () => {
    const isRateLimited = createRateLimiter(1, 60_000)
    isRateLimited('user-1') // count = 1, at limit

    vi.advanceTimersByTime(60_001)

    // New window — should reset
    expect(isRateLimited('user-1')).toBe(false)
  })

  it('exactly at limit is allowed; one over is blocked', () => {
    const isRateLimited = createRateLimiter(10, 60_000)

    // Requests 1–10: all allowed
    for (let i = 0; i < 10; i++) {
      expect(isRateLimited('user-1')).toBe(false)
    }

    // Request 11: blocked
    expect(isRateLimited('user-1')).toBe(true)
  })

  it('handles multiple concurrent keys correctly', () => {
    const isRateLimited = createRateLimiter(2, 60_000)

    isRateLimited('ip-A')
    isRateLimited('ip-B')
    isRateLimited('ip-A') // at limit for A
    isRateLimited('ip-B') // at limit for B

    expect(isRateLimited('ip-A')).toBe(true)
    expect(isRateLimited('ip-B')).toBe(true)
    expect(isRateLimited('ip-C')).toBe(false) // fresh key
  })
})
