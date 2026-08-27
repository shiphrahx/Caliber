/**
 * Build the marketing pages for GitHub Pages.
 *
 * Pages has no server, so everything that needs one is removed before the
 * build rather than tried and failed: the route handlers, the auth callback,
 * the signed-in app and the middleware. What is left is the landing page and
 * the two legal pages, which are all any of this was ever going to serve.
 *
 * This deletes files. It runs on a fresh checkout in CI, so that is fine
 * there; run it anywhere else and it will refuse unless the tree is clean and
 * you have said you meant it.
 */
import { execFileSync } from "node:child_process"
import { rmSync, writeFileSync, existsSync } from "node:fs"

const SERVER_ONLY = [
  "app/api",
  "app/auth",
  "app/(dashboard)",
  "app/login",
  "proxy.ts",
]

const inCI = process.env["CI"] === "true"
const forced = process.argv.includes("--force")

if (!inCI && !forced) {
  const dirty = execFileSync("git", ["status", "--porcelain"]).toString().trim()
  if (dirty) {
    console.error(
      "This deletes the app routes and your tree has uncommitted changes.\n" +
      "Commit them first, or pass --force if you know this is a throwaway copy."
    )
    process.exit(1)
  }
}

for (const path of SERVER_ONLY) {
  if (!existsSync(path)) continue
  rmSync(path, { recursive: true, force: true })
  console.log("removed", path)
}

execFileSync("npx", ["next", "build"], {
  stdio: "inherit",
  env: { ...process.env, PAGES_EXPORT: "1" },
  shell: process.platform === "win32",
})

// Without this, Pages hides every directory beginning with an underscore,
// which is where Next puts all of its JavaScript and CSS.
writeFileSync("out/.nojekyll", "")
console.log("wrote out/.nojekyll")
