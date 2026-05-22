import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { AIProvider } from '@/lib/services/ai'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

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
  return NextResponse.json(data)
}
