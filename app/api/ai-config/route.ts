import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { AIProvider } from '@/lib/services/ai'

// Allow max 10 key-save operations per hour per user
const RATE_LIMIT_PER_HOUR = 10

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Rate limit: count saves in the last hour
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentSaves } = await supabase
    .from('ai_config_save_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', windowStart)

  if ((recentSaves ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: `Too many requests. You can update your AI key up to ${RATE_LIMIT_PER_HOUR} times per hour.` },
      { status: 429 }
    )
  }

  const body = await request.json() as { provider: AIProvider; apiKey: string; model: string }

  const passphrase = process.env.AI_ENCRYPTION_KEY
  if (!passphrase) {
    return NextResponse.json({ error: 'Encryption key not configured' }, { status: 500 })
  }

  const { data: encrypted, error: encErr } = await supabase.rpc('encrypt_api_key', {
    plain_key: body.apiKey,
    passphrase,
  })
  if (encErr || !encrypted) {
    return NextResponse.json({ error: 'Failed to encrypt API key' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('ai_config')
    .upsert({
      user_id: user.id,
      provider: body.provider,
      api_key_encrypted: encrypted,
      model: body.model,
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log this save for rate limiting
  await supabase.from('ai_config_save_log').insert({ user_id: user.id })

  return NextResponse.json(data)
}
