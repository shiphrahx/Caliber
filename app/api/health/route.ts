import { NextResponse } from 'next/server'

/**
 * Health check endpoint.
 * Used by monitoring, uptime checks, and rate-limit E2E tests.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', ts: Date.now() })
}
