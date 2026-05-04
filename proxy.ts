/**
 * Next.js Middleware for Supabase Auth
 * Refreshes auth tokens and protects routes
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  if (!supabaseAnonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: Parameters<typeof supabaseResponse.cookies.set>[2] }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = [
    '/dashboard', '/tasks', '/teams', '/people', '/projects',
    '/meetings', '/career-goals', '/settings',
    '/radar', '/follow-ups', '/evidence', '/framework', '/review', '/summary',
  ]
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname === path ||
    (path !== '/' && request.nextUrl.pathname.startsWith(path))
  )

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Only store the path (never a full URL) to prevent open-redirect attacks
    const from = request.nextUrl.pathname
    if (from.startsWith('/') && !from.startsWith('//')) {
      url.searchParams.set('redirectedFrom', from)
    }
    return NextResponse.redirect(url)
  }

  // Logged-in users: redirect landing → dashboard, login → dashboard
  if (user && (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
