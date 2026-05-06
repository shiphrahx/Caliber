import { test, expect } from "@playwright/test"

test.describe("Dashboard", () => {
  test("loads and shows key widgets", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).not.toHaveURL(/login/)
    // Sidebar visible
    await expect(page.locator('a[href="/dashboard"]')).toBeVisible()
  })

  test("sidebar navigation links present", async ({ page }) => {
    await page.goto("/dashboard")
    const navLinks = [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/tasks", label: "Tasks" },
      { href: "/people", label: "People" },
      { href: "/teams", label: "Teams" },
      { href: "/meetings", label: "Meetings" },
      { href: "/evidence", label: "Evidence" },
      { href: "/radar", label: "People Radar" },
      { href: "/review", label: "Weekly Review" },
      { href: "/follow-ups", label: "Follow-ups" },
      { href: "/framework", label: "Career Framework" },
      { href: "/summary", label: "Weekly Summary" },
    ]
    for (const { href } of navLinks) {
      await expect(page.locator(`a[href="${href}"]`)).toBeVisible()
    }
  })

  test("navigate to Tasks via sidebar", async ({ page }) => {
    await page.goto("/dashboard")
    await page.locator('a[href="/tasks"]').click()
    await expect(page).toHaveURL(/\/tasks/)
  })

  test("navigate to People via sidebar", async ({ page }) => {
    await page.goto("/dashboard")
    await page.locator('a[href="/people"]').click()
    await expect(page).toHaveURL(/\/people/)
  })

  test("navigate to Teams via sidebar", async ({ page }) => {
    await page.goto("/dashboard")
    await page.locator('a[href="/teams"]').click()
    await expect(page).toHaveURL(/\/teams/)
  })

  test("navigate to Meetings via sidebar", async ({ page }) => {
    await page.goto("/dashboard")
    await page.locator('a[href="/meetings"]').click()
    await expect(page).toHaveURL(/\/meetings/)
  })
})
