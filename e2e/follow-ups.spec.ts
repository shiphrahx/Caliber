import { test, expect } from "@playwright/test"

test.describe("Follow-ups page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/follow-ups")
    await expect(page).not.toHaveURL(/login/)
    await page.waitForSelector(".page-topbar-title", { timeout: 10000 })
  })

  test("renders page title", async ({ page }) => {
    await expect(page.locator(".page-topbar-title")).toBeVisible()
  })

  test("has add/new follow-up button", async ({ page }) => {
    await expect(
      page.locator("button", { hasText: /add|new|log/i }).first()
    ).toBeVisible()
  })

  test("opens new follow-up dialog on button click", async ({ page }) => {
    await page.locator("button", { hasText: /add|new|log/i }).first().click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })
  })

  test("follow-up list or empty state renders", async ({ page }) => {
    await page.waitForTimeout(1500)
    // Either a list of follow-ups or an empty state message
    const hasItems = await page.locator("tbody tr").count()
    const hasEmptyState = await page.locator("text=/no follow-ups|nothing here|empty/i").count()
    expect(hasItems + hasEmptyState).toBeGreaterThan(0)
  })
})

test.describe("Evidence page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/evidence")
    await expect(page).not.toHaveURL(/login/)
    await page.waitForSelector(".page-topbar-title", { timeout: 10000 })
  })

  test("renders page title", async ({ page }) => {
    await expect(page.locator(".page-topbar-title")).toBeVisible()
  })

  test("has add evidence button", async ({ page }) => {
    await expect(
      page.locator("button", { hasText: /add|log|new/i }).first()
    ).toBeVisible()
  })

  test("person filter or search visible", async ({ page }) => {
    await page.waitForTimeout(1000)
    // Either a search box, dropdown filter, or person selector should be present
    const searchOrFilter = page.locator('input[placeholder*="search" i], select, [role="combobox"]')
    await expect(searchOrFilter.first()).toBeVisible({ timeout: 5000 })
  })
})
