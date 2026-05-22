/**
 * API Rate Limiting E2E Evals
 * Verifies the middleware returns 429 when the rate limit is exceeded.
 * Uses direct fetch calls (bypassing browser auth) to hammer the API.
 *
 * NOTE: These tests run against the dev server with a real session.
 * They deliberately exhaust the rate limit — run in isolation if needed.
 */

import { test, expect } from "@playwright/test"

test.describe("API rate limiting", () => {
  test("returns 429 after exceeding rate limit on api route", async ({ page, request }) => {
    // Get cookies from the authenticated page context
    await page.goto("/dashboard")
    await expect(page).not.toHaveURL(/login/)

    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    // Hammer a lightweight API endpoint 125 times (limit is 120/min)
    // Use the ai-config GET endpoint as a probe — it's idempotent and safe
    let rateLimitHit = false
    for (let i = 0; i < 125; i++) {
      const res = await request.get('/api/health', {
        headers: { Cookie: cookieHeader },
        failOnStatusCode: false,
      })
      if (res.status() === 429) {
        rateLimitHit = true
        break
      }
    }

    expect(rateLimitHit).toBe(true)
  })

  test("rate limit response has correct headers", async ({ page, request }) => {
    await page.goto("/dashboard")
    await expect(page).not.toHaveURL(/login/)

    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    let lastResponse = null
    for (let i = 0; i < 125; i++) {
      lastResponse = await request.get('/api/health', {
        headers: { Cookie: cookieHeader },
        failOnStatusCode: false,
      })
      if (lastResponse.status() === 429) break
    }

    if (lastResponse?.status() === 429) {
      expect(lastResponse.headers()['retry-after']).toBe('60')
      const body = await lastResponse.json()
      expect(body.error).toMatch(/too many requests/i)
    }
  })
})
