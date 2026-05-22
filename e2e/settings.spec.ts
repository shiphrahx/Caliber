import { test, expect } from "@playwright/test"

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings")
    await expect(page).not.toHaveURL(/login/)
    await page.waitForSelector(".page-topbar-title", { timeout: 10000 })
  })

  test("renders settings sections", async ({ page }) => {
    await expect(page.locator(".page-topbar-title")).toContainText(/settings/i)
  })

  test("profile section visible", async ({ page }) => {
    await expect(page.locator("text=Profile").first()).toBeVisible()
  })

  test("AI settings section visible", async ({ page }) => {
    await expect(page.locator("text=AI").first()).toBeVisible()
  })

  test("meeting templates section visible", async ({ page }) => {
    await expect(page.locator("text=Template").first()).toBeVisible()
  })
})

test.describe("Settings — AI config", () => {
  test("AI settings card renders connect option when no key saved", async ({ page }) => {
    await page.goto("/settings")
    await expect(page).not.toHaveURL(/login/)
    await page.waitForSelector(".page-topbar-title", { timeout: 10000 })
    // Should show provider selection or connect prompt
    const aiSection = page.locator("text=AI Assistant")
    await expect(aiSection).toBeVisible()
  })
})
