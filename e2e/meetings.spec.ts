import { test, expect } from "@playwright/test"

test.describe("Meetings page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/meetings")
    await expect(page).not.toHaveURL(/login/)
    await page.waitForSelector(".page-topbar-title", { timeout: 10000 })
  })

  test("renders page title and log meeting button", async ({ page }) => {
    await expect(page.locator(".page-topbar-title")).toContainText("Meetings")
    await expect(page.locator("button", { hasText: /log meeting/i })).toBeVisible()
  })

  test("opens log meeting dialog", async ({ page }) => {
    await page.locator("button", { hasText: /log meeting/i }).click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()
  })

  test("search input visible", async ({ page }) => {
    await expect(page.locator('input[placeholder*="search" i]')).toBeVisible()
  })
})

test.describe("Other authenticated pages", () => {
  test("Teams page loads", async ({ page }) => {
    await page.goto("/teams")
    await expect(page).not.toHaveURL(/login/)
    await page.waitForSelector(".page-topbar-title", { timeout: 10000 })
    await expect(page.locator(".page-topbar-title")).toContainText("Teams")
    await expect(page.locator("button", { hasText: /add team/i })).toBeVisible()
  })

  test("Evidence page loads", async ({ page }) => {
    await page.goto("/evidence")
    await expect(page).not.toHaveURL(/login/)
    await page.waitForSelector(".page-topbar-title", { timeout: 10000 })
    await expect(page.locator(".page-topbar-title")).toBeVisible()
  })

  test("Follow-ups page loads", async ({ page }) => {
    await page.goto("/follow-ups")
    await expect(page).not.toHaveURL(/login/)
    await page.waitForSelector(".page-topbar-title", { timeout: 10000 })
    await expect(page.locator(".page-topbar-title")).toBeVisible()
  })

  test("People Radar page loads", async ({ page }) => {
    await page.goto("/radar")
    await expect(page).not.toHaveURL(/login/)
    await page.waitForSelector(".page-topbar-title", { timeout: 10000 })
    await expect(page.locator(".page-topbar-title")).toBeVisible()
  })

  test("Career Framework page loads", async ({ page }) => {
    await page.goto("/framework")
    await expect(page).not.toHaveURL(/login/)
    await page.waitForSelector(".page-topbar-title", { timeout: 10000 })
    await expect(page.locator(".page-topbar-title")).toBeVisible()
  })

  test("Settings page loads", async ({ page }) => {
    await page.goto("/settings")
    await expect(page).not.toHaveURL(/login/)
    await page.waitForSelector(".page-topbar-title", { timeout: 10000 })
    await expect(page.locator(".page-topbar-title")).toContainText(/settings/i)
  })

  test("Weekly Review page loads", async ({ page }) => {
    await page.goto("/review")
    await expect(page).not.toHaveURL(/login/)
    await page.waitForSelector(".page-topbar-title", { timeout: 10000 })
    await expect(page.locator(".page-topbar-title")).toBeVisible()
  })

  test("Weekly Summary page loads", async ({ page }) => {
    await page.goto("/summary")
    await expect(page).not.toHaveURL(/login/)
    await page.waitForSelector(".page-topbar-title", { timeout: 10000 })
    await expect(page.locator(".page-topbar-title")).toBeVisible()
  })
})
