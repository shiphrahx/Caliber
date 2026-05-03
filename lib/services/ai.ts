import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ─── Provider / model config ──────────────────────────────────────────────────

export type AIProvider = 'anthropic' | 'openai' | 'google'

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  anthropic: 'Anthropic',
  openai:    'OpenAI',
  google:    'Google',
}

export const PROVIDER_MODELS: Record<AIProvider, Array<{ id: string; label: string; isDefault?: boolean }>> = {
  anthropic: [
    { id: 'claude-sonnet-4-6',           label: 'Claude Sonnet 4.6 (best quality)', isDefault: true },
    { id: 'claude-haiku-4-5-20251001',   label: 'Claude Haiku 4.5 (faster, cheaper)' },
  ],
  openai: [
    { id: 'gpt-4o',      label: 'GPT-4o (best quality)', isDefault: true },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini (faster, cheaper)' },
  ],
  google: [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (default)', isDefault: true },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (latest)' },
  ],
}

// ─── AI Config ────────────────────────────────────────────────────────────────

export interface AIConfig {
  id: string
  provider: AIProvider
  model: string
  totalRequests: number
  lastUsedAt: string | null
  keyHint: string  // last 4 chars of masked key stored separately
  createdAt: string
}

type AIConfigRow = {
  id: string
  user_id: string
  provider: AIProvider
  api_key_encrypted: string
  model: string
  total_requests: number
  last_used_at: string | null
  created_at: string
  updated_at: string
}

function rowToConfig(row: AIConfigRow): AIConfig {
  // Key hint: last 4 chars of encrypted blob (not the real key — purely cosmetic)
  const hint = row.api_key_encrypted.slice(-4)
  return {
    id: row.id,
    provider: row.provider,
    model: row.model,
    totalRequests: row.total_requests,
    lastUsedAt: row.last_used_at,
    keyHint: hint,
    createdAt: row.created_at,
  }
}

export async function getAIConfig(): Promise<AIConfig | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ai_config')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data ? rowToConfig(data as AIConfigRow) : null
}

export async function saveAIConfig(input: {
  provider: AIProvider
  apiKey: string
  model: string
}): Promise<AIConfig> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Encrypt key via DB function
  const { data: encrypted, error: encErr } = await supabase.rpc('encrypt_api_key', {
    plain_key: input.apiKey,
    passphrase: process.env.NEXT_PUBLIC_AI_ENCRYPTION_KEY ?? 'cadence-default-key',
  })
  if (encErr || !encrypted) throw new Error('Failed to encrypt API key')

  const { data, error } = await supabase
    .from('ai_config')
    .upsert({
      user_id: user.id,
      provider: input.provider,
      api_key_encrypted: encrypted,
      model: input.model,
    }, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return rowToConfig(data as AIConfigRow)
}

export async function deleteAIConfig(): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('ai_config').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw error
}

// ─── Core AI call ─────────────────────────────────────────────────────────────

export interface AIRequest {
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
  temperature?: number
  preferFast?: boolean
}

export interface AIResponse {
  content: string
  tokensUsed: { input: number; output: number }
  model: string
  error?: string
}

export async function callAI(request: AIRequest, signal?: AbortSignal): Promise<AIResponse> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL not set')

  const res = await fetch(`${supabaseUrl}/functions/v1/ai-proxy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  })

  if (!res.ok) {
    throw new Error(`Edge Function error: ${res.status}`)
  }

  const data: AIResponse = await res.json()
  if (data.error) {
    throw new AIError(data.error)
  }
  return data
}

export class AIError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIError'
  }
}

// Show a user-friendly toast for AI errors. Returns true if error was shown.
export function handleAIError(err: unknown): boolean {
  if (err instanceof AIError) {
    toast.error(err.message, { duration: 6000 })
    return true
  }
  if (err instanceof Error && err.name === 'AbortError') {
    return true // cancelled by user — no toast
  }
  const msg = err instanceof Error ? err.message : String(err)
  toast.error(msg || 'AI request failed. Please try again.', { duration: 6000 })
  return true
}

// ─── Test connection ──────────────────────────────────────────────────────────

export async function testAIConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await callAI({
      systemPrompt: 'You are a helpful assistant.',
      userPrompt: 'Reply with exactly the word: ok',
      maxTokens: 10,
      temperature: 0,
    })
    return { ok: res.content.toLowerCase().includes('ok') }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ─── Token estimation (rough char-based) ─────────────────────────────────────

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function truncateToTokenBudget(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '\n[truncated]'
}

// ─── Context assembly helpers ─────────────────────────────────────────────────

export function assembleMeetingContext(meetings: Array<{
  title: string
  meetingType: string
  meetingDate: string
  notes?: string | null
  actionItems?: string | null
}>, maxCharsPerMeeting = 500): string {
  return meetings.map(m => {
    const notes = (m.notes ?? '').slice(0, maxCharsPerMeeting)
    return `${m.meetingType}: ${m.title} (${m.meetingDate})${notes ? ': ' + notes : ''}`
  }).join('\n')
}

export function assembleEvidenceContext(evidence: Array<{
  category: string
  title: string
  occurredAt: string
  content?: string | null
}>): string {
  return evidence.map(e =>
    `[${e.category}] ${e.title} (${e.occurredAt})${e.content ? ': ' + e.content.slice(0, 300) : ''}`
  ).join('\n')
}
