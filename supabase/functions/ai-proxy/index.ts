// Supabase Edge Function: ai-proxy
// Authenticates user, retrieves + decrypts their API key, proxies to AI provider.
// The client NEVER sees the decrypted API key.
//
// Encryption: pgcrypto pgp_sym_encrypt/pgp_sym_decrypt.
// Set SUPABASE_AI_ENCRYPTION_KEY in Edge Function secrets (supabase secrets set).

import { createClient } from "jsr:@supabase/supabase-js@2"

const RATE_LIMIT_PER_HOUR = 60

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface AIProxyRequest {
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
  temperature?: number
  // For fast lightweight calls (evidence categorisation, etc.) — uses cheaper model variant
  preferFast?: boolean
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders })
    }

    // ── Rate limiting — simple count check via DB ─────────────────────────────
    const { data: config, error: configError } = await supabase
      .from("ai_config")
      .select("id, provider, api_key_encrypted, model, total_requests, last_used_at")
      .eq("user_id", user.id)
      .maybeSingle()

    if (configError || !config) {
      return new Response(JSON.stringify({ error: "AI not configured. Add your API key in Settings." }), { status: 400, headers: corsHeaders })
    }

    // ── Decrypt API key via DB function ───────────────────────────────────────
    const encryptionKey = Deno.env.get("SUPABASE_AI_ENCRYPTION_KEY")
    if (!encryptionKey) {
      return new Response(JSON.stringify({ error: "Server configuration error." }), { status: 500, headers: corsHeaders })
    }

    // Use service role to decrypt (pgcrypto call via rpc)
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const { data: decryptResult, error: decryptError } = await serviceSupabase.rpc("decrypt_api_key", {
      encrypted_key: config.api_key_encrypted,
      passphrase: encryptionKey,
    })

    if (decryptError || !decryptResult) {
      return new Response(JSON.stringify({ error: "Failed to retrieve API key. Please re-save your key in Settings." }), { status: 500, headers: corsHeaders })
    }

    const apiKey: string = decryptResult

    // ── Parse request ─────────────────────────────────────────────────────────
    const body: AIProxyRequest = await req.json()
    const { systemPrompt, userPrompt, maxTokens = 2000, temperature = 0.3, preferFast = false } = body

    if (!systemPrompt || !userPrompt) {
      return new Response(JSON.stringify({ error: "systemPrompt and userPrompt are required." }), { status: 400, headers: corsHeaders })
    }

    // ── Call AI provider ──────────────────────────────────────────────────────
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)

    let aiResponse: { content: string; tokensUsed: { input: number; output: number }; model: string }

    try {
      if (config.provider === "anthropic") {
        const model = preferFast ? "claude-haiku-4-5-20251001" : config.model
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
          }),
          signal: controller.signal,
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          return new Response(JSON.stringify({ error: mapProviderError(res.status, "anthropic", errBody) }), { status: 200, headers: corsHeaders })
        }
        const data = await res.json()
        aiResponse = {
          content: data.content?.[0]?.text ?? "",
          tokensUsed: { input: data.usage?.input_tokens ?? 0, output: data.usage?.output_tokens ?? 0 },
          model,
        }
      } else if (config.provider === "openai") {
        const model = preferFast ? "gpt-4o-mini" : config.model
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            temperature,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
          signal: controller.signal,
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          return new Response(JSON.stringify({ error: mapProviderError(res.status, "openai", errBody) }), { status: 200, headers: corsHeaders })
        }
        const data = await res.json()
        aiResponse = {
          content: data.choices?.[0]?.message?.content ?? "",
          tokensUsed: { input: data.usage?.prompt_tokens ?? 0, output: data.usage?.completion_tokens ?? 0 },
          model,
        }
      } else if (config.provider === "google") {
        const model = preferFast ? "gemini-2.0-flash" : config.model
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: userPrompt }] }],
              systemInstruction: { parts: [{ text: systemPrompt }] },
              generationConfig: { maxOutputTokens: maxTokens, temperature },
            }),
            signal: controller.signal,
          }
        )
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          return new Response(JSON.stringify({ error: mapProviderError(res.status, "google", errBody) }), { status: 200, headers: corsHeaders })
        }
        const data = await res.json()
        aiResponse = {
          content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
          tokensUsed: {
            input: data.usageMetadata?.promptTokenCount ?? 0,
            output: data.usageMetadata?.candidatesTokenCount ?? 0,
          },
          model,
        }
      } else {
        return new Response(JSON.stringify({ error: "Unknown provider." }), { status: 400, headers: corsHeaders })
      }
    } catch (fetchErr) {
      if ((fetchErr as Error).name === "AbortError") {
        return new Response(JSON.stringify({ error: "The AI request timed out. Try again or try a smaller request." }), { status: 200, headers: corsHeaders })
      }
      return new Response(JSON.stringify({ error: "Could not connect to the AI provider. Please check your connection and try again." }), { status: 200, headers: corsHeaders })
    } finally {
      clearTimeout(timeout)
    }

    // ── Update usage stats ────────────────────────────────────────────────────
    await serviceSupabase
      .from("ai_config")
      .update({ total_requests: (config.total_requests ?? 0) + 1, last_used_at: new Date().toISOString() })
      .eq("user_id", user.id)

    return new Response(JSON.stringify(aiResponse), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    })
  } catch (err) {
    console.error("ai-proxy error:", err)
    return new Response(JSON.stringify({ error: "Unexpected server error." }), { status: 500, headers: corsHeaders })
  }
})

function mapProviderError(status: number, provider: string, body: Record<string, unknown>): string {
  const providerNames: Record<string, string> = { anthropic: "Anthropic", openai: "OpenAI", google: "Google" }
  const name = providerNames[provider] ?? provider
  if (status === 401 || status === 403) return `Your API key is no longer valid. Please update it in Settings.`
  if (status === 429) return `You've hit your provider's rate limit. Please wait a moment and try again.`
  if (status === 402) return `Your API provider returned a billing error. Please check your account at ${name}.`
  const msg = (body as { error?: { message?: string }; message?: string })?.error?.message ?? (body as { message?: string })?.message
  if (msg?.toLowerCase().includes("content")) return `The AI provider filtered this request. Try rephrasing or adjusting the content.`
  return `${name} returned an error. Please try again.`
}
