import { test, expect } from "@playwright/test"

test.describe("People page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/people")
    await expect(page).not.toHaveURL(/login/)
    await page.waitForSelector(".page-topbar-title", { timeout: 10000 })
  })

  test("renders page title and add button", async ({ page }) => {
    await expect(page.locator(".page-topbar-title")).toContainText("People")
    await expect(page.locator("button", { hasText: /add person/i })).toBeVisible()
  })

  test("opens add person dialog", async ({ page }) => {
    await page.locator("button", { hasText: /add person/i }).click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('[role="dialog"]')).toContainText(/name/i)
  })

  test("create a new person", async ({ page }) => {
    const name = `E2E Person ${Date.now()}`

    await page.locator("button", { hasText: /add person/i }).click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Fill name
    await page.locator('[role="dialog"] input[placeholder*="name" i], [role="dialog"] input').first().fill(name)

    // Submit
    await page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button', { hasText: /save|add|create/i }).first().click()

    // Person should appear in table
    await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 8000 })
  })

  test("table has column headers", async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(1500)
    await expect(page.locator("text=Name").first()).toBeVisible()
  })

  test("person row click opens edit dialog", async ({ page }) => {
    await page.waitForTimeout(1500)
    const rows = page.locator("tbody tr")
    const count = await rows.count()
    if (count === 0) {
      test.skip()
      return
    }
    await rows.first().click()
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })
  })
})
