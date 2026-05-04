/**
 * Next.js Middleware for Supabase Auth
 * Refreshes auth tokens and protects routes
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options: _options }) => request.cookies.set(name, value))
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
    '/', '/dashboard', '/tasks', '/teams', '/people', '/projects',
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

  // If user is logged in and tries to access login, redirect to dashboard
  if (request.nextUrl.pathname === '/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
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
