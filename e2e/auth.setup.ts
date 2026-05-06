import { test as setup, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import path from "path"

const authFile = path.join(__dirname, ".auth/user.json")

/**
 * Auth setup: signs in via Supabase email/password (test account),
 * then saves cookies/localStorage so all downstream tests reuse the session.
 *
 * Requires env vars:
 *   E2E_TEST_EMAIL    - email of a real Supabase user in your project
 *   E2E_TEST_PASSWORD - password for that user
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
setup("authenticate", async ({ page }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD

  if (!supabaseUrl || !supabaseAnonKey || !email || !password) {
    throw new Error(
      "Missing env vars for E2E auth setup. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, E2E_TEST_EMAIL, E2E_TEST_PASSWORD"
    )
  }

  // Sign in directly via Supabase SDK — bypasses Google OAuth
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw new Error(`Supabase sign-in failed: ${error?.message}`)

  const { access_token, refresh_token } = data.session

  // Navigate to app so we can inject tokens into localStorage
  await page.goto("/login")

  // Inject session into Supabase's localStorage key
  await page.evaluate(
    ({ url, accessToken, refreshToken }) => {
      const key = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        })
      )
    },
    { url: supabaseUrl, accessToken: access_token, refreshToken: refresh_token }
  )

  // Navigate to dashboard — middleware should accept session
  await page.goto("/dashboard")
  await expect(page).not.toHaveURL(/login/)

  // Save auth state
  await page.context().storageState({ path: authFile })
})
