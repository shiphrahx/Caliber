import { test, expect } from "@playwright/test"

test.describe("Landing page", () => {
  test("renders hero and key sections", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/Caliber/)
    await expect(page.locator("h1")).toContainText("engineering managers")
    await expect(page.locator("nav")).toBeVisible()
    await expect(page.locator("#features")).toBeVisible()
    await expect(page.locator("#ai")).toBeVisible()
  })

  test("Log in nav link goes to /login", async ({ page }) => {
    await page.goto("/")
    await page.locator("nav .btn-ghost").click()
    await expect(page).toHaveURL(/\/login/)
  })

  test("Sign up nav link goes to /login", async ({ page }) => {
    await page.goto("/")
    await page.locator("nav .btn-primary").click()
    await expect(page).toHaveURL(/\/login/)
  })

  test("hero CTA goes to /login", async ({ page }) => {
    await page.goto("/")
    await page.locator(".btn-hero-primary").first().click()
    await expect(page).toHaveURL(/\/login/)
  })

  test("hero screenshot loads", async ({ page }) => {
    await page.goto("/")
    const img = page.locator(".hero-screenshot img")
    await expect(img).toBeVisible()
    const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth)
    expect(naturalWidth).toBeGreaterThan(0)
  })

  test("feature images load", async ({ page }) => {
    await page.goto("/")
    const featureImgs = page.locator(".feature-visual img")
    const count = await featureImgs.count()
    expect(count).toBe(5)
    for (let i = 0; i < count; i++) {
      const nw = await featureImgs.nth(i).evaluate((el: HTMLImageElement) => el.naturalWidth)
      expect(nw).toBeGreaterThan(0)
    }
  })
})

test.describe("Login page", () => {
  test("renders Google sign-in button", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("text=Continue with Google")).toBeVisible()
    await expect(page.locator("text=Welcome to Caliber")).toBeVisible()
  })

  test("logo visible", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator('img[alt="Caliber"]')).toBeVisible()
  })
})

test.describe("Auth middleware (unauthenticated)", () => {
  const protectedRoutes = [
    "/dashboard",
    "/tasks",
    "/people",
    "/teams",
    "/meetings",
    "/settings",
    "/radar",
    "/evidence",
    "/follow-ups",
    "/review",
  ]

  for (const route of protectedRoutes) {
    test(`redirects ${route} to /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/)
    })
  }
})
