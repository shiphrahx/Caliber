/**
 * Auth Callback Route Handler
 * Handles OAuth redirects and creates user profile on first login
 */

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import { NextResponse } from 'next/server'

type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    if (data.user) {
      const { data: profile, error: selectErr } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      // PGRST116 = "no rows" — expected on first login
      if (selectErr && selectErr.code !== 'PGRST116') {
        console.error('Profile lookup failed:', selectErr)
        return NextResponse.redirect(`${origin}/login?error=profile_lookup_failed`)
      }

      if (!profile) {
        const metadata = data.user.user_metadata ?? {}
        const insert: UserProfileInsert = {
          id: data.user.id,
          name: (metadata['full_name'] as string | undefined)
            ?? (metadata['name'] as string | undefined)
            ?? 'User',
          email: data.user.email ?? null,
        }

        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert(insert)

        if (profileError) {
          console.error('Error creating user profile:', profileError)
          return NextResponse.redirect(`${origin}/login?error=profile_creation_failed`)
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/`)
}
