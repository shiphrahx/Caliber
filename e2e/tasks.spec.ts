import { test, expect } from "@playwright/test"

test.describe("Tasks page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tasks")
    await expect(page).not.toHaveURL(/login/)
    // Wait for client-side mount (DnD context)
    await page.waitForSelector(".page-topbar-title", { timeout: 10000 })
  })

  test("renders page title and new task button", async ({ page }) => {
    await expect(page.locator(".page-topbar-title")).toContainText("Tasks")
    await expect(page.locator("button.btn-primary", { hasText: "+ New task" })).toBeVisible()
  })

  test("opens task modal on New task click", async ({ page }) => {
    await page.locator("button.btn-primary", { hasText: "+ New task" }).click()
    // Modal should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible()
  })

  test("create a new task", async ({ page }) => {
    const taskTitle = `E2E Task ${Date.now()}`

    await page.locator("button.btn-primary", { hasText: "+ New task" }).click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Fill title
    await page.locator('[role="dialog"] input[type="text"]').first().fill(taskTitle)

    // Save
    await page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button', { hasText: /save|create/i }).first().click()

    // Task should appear on the board
    await expect(page.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 8000 })
  })

  test("kanban columns visible", async ({ page }) => {
    // Wait for board to render (columns appear after mount)
    await page.waitForTimeout(1000)
    const columns = ["Not started", "In progress", "Blocked", "Done"]
    for (const col of columns) {
      await expect(page.locator(`text=${col}`).first()).toBeVisible()
    }
  })

  test("backlog section visible", async ({ page }) => {
    await expect(page.locator("text=Backlog").first()).toBeVisible()
  })
})
