"use client"

import { useState, useEffect } from "react"
import { Eye, EyeOff, Sparkles, Check, X, Loader2, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  getAIConfig, saveAIConfig, deleteAIConfig, testAIConnection, getSessionCacheStats,
  PROVIDER_LABELS, PROVIDER_MODELS,
  type AIProvider, type AIConfig,
} from "@/lib/services/ai"
import { toast } from "sonner"

const PROVIDERS: AIProvider[] = ['anthropic', 'openai', 'google']

const PROVIDER_DESCRIPTIONS: Record<AIProvider, string> = {
  anthropic: 'Claude models — best for nuanced writing and reasoning',
  openai:    'GPT models — widely supported, strong general performance',
  google:    'Gemini models — fast and cost-effective',
}

export function AISettingsCard() {
  const [config, setConfig] = useState<AIConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)

  // Form state
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('anthropic')
  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [selectedModel, setSelectedModel] = useState(PROVIDER_MODELS.anthropic[0].id)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)
  const [testError, setTestError] = useState("")

  useEffect(() => {
    getAIConfig()
      .then(c => { setConfig(c); if (!c) setEditMode(true) })
      .catch(() => setEditMode(true))
      .finally(() => setLoading(false))
  }, [])

  // When provider changes, reset model to default
  useEffect(() => {
    const models = PROVIDER_MODELS[selectedProvider]
    const def = models.find(m => m.isDefault) ?? models[0]
    setSelectedModel(def.id)
  }, [selectedProvider])

  const handleSaveAndTest = async () => {
    if (!apiKey.trim()) { toast.error('Enter your API key'); return }
    setSaving(true)
    setTestResult(null)
    setTestError("")
    try {
      await saveAIConfig({ provider: selectedProvider, apiKey: apiKey.trim(), model: selectedModel })
      setTesting(true)
      const result = await testAIConnection()
      if (result.ok) {
        setTestResult('ok')
        toast.success('Connected! AI features are now enabled.')
        const updated = await getAIConfig()
        setConfig(updated)
        setEditMode(false)
        setApiKey("")
      } else {
        setTestResult('fail')
        setTestError(result.error ?? 'Connection test failed. Check your key and try again.')
        // Remove the saved config since key is invalid
        await deleteAIConfig()
        setConfig(null)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
      setTesting(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('This will disable all AI features. Continue?')) return
    try {
      await deleteAIConfig()
      setConfig(null)
      setEditMode(true)
      setApiKey("")
      setTestResult(null)
      toast.success('AI configuration removed.')
    } catch {
      toast.error('Failed to remove AI configuration.')
    }
  }

  const handleRetest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testAIConnection()
    setTesting(false)
    if (result.ok) {
      setTestResult('ok')
      toast.success('Connection is working.')
    } else {
      setTestResult('fail')
      setTestError(result.error ?? 'Connection test failed.')
      toast.error(result.error ?? 'Connection test failed.')
    }
  }

  if (loading) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Assistant
        </CardTitle>
        <CardDescription>
          {config
            ? 'AI features are enabled. Your key is encrypted and stored securely.'
            : 'Connect your AI provider to unlock smart features across Caliber. Your API key is encrypted at rest and only used to call your chosen provider — Caliber never stores or accesses it otherwise.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Configured state */}
        {config && !editMode && (
          <div className="grid gap-16">
            <div className="flex-align gap-16 flex-wrap">
              <div className="ai-config-badge">
                <span className="ai-config-badge__provider">
                  {PROVIDER_LABELS[config.provider]}
                </span>
                <span className="ai-config-badge__model">
                  {config.model}
                </span>
              </div>
              <span className="text-caption font-mono">
                key ending ···{config.keyHint}
              </span>
            </div>

            <div className="flex-align gap-8 text-caption text-3">
              <span>Requests: {config.totalRequests}</span>
              {config.lastUsedAt && (
                <span>· Last used: {new Date(config.lastUsedAt).toLocaleDateString()}</span>
              )}
            </div>

            {/* Session cache stats — only shown for Anthropic (prompt caching supported) */}
            {config.provider === 'anthropic' && (() => {
              const stats = getSessionCacheStats()
              return stats.calls > 0 ? (
                <div className="ai-cache-stats">
                  <span className="font-600 text-2">This session</span>
                  <span>Cache hits: {stats.cacheRead.toLocaleString()} tokens</span>
                  <span>Cache writes: {stats.cacheWrite.toLocaleString()} tokens</span>
                  <span>Calls: {stats.calls}</span>
                </div>
              ) : null
            })()}

            {testResult === 'ok' && (
              <div className="ai-status-ok">
                <Check /> Connection working
              </div>
            )}
            {testResult === 'fail' && (
              <div className="ai-status-fail">
                ✕ {testError}
              </div>
            )}

            <div className="flex-align gap-8">
              <Button variant="outline" size="sm" onClick={handleRetest} disabled={testing}>
                {testing ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Testing…</> : 'Test Connection'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setEditMode(true); setApiKey("") }}>
                Change Key
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                className="ai-remove-btn"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Remove Key
              </Button>
            </div>
          </div>
        )}

        {/* Setup / edit form */}
        {editMode && (
          <div className="grid gap-20">
            {/* Provider selection */}
            <div>
              <Label className="block mb-8">Provider</Label>
              <div className="ai-provider-grid">
                {PROVIDERS.map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedProvider(p)}
                    className="ai-provider-btn"
                    style={{
                      border: `1px solid ${selectedProvider === p ? '#00f05860' : 'var(--border-2)'}`,
                      background: selectedProvider === p ? "#0d200f" : "var(--surf-2)",
                    }}
                  >
                    <div
                      className="ai-provider-btn__name"
                      style={{ color: selectedProvider === p ? "#00f058" : "var(--text-2)" }}
                    >
                      {PROVIDER_LABELS[p]}
                    </div>
                    <div className="ai-provider-btn__desc">
                      {PROVIDER_DESCRIPTIONS[p]}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Model selection */}
            <div>
              <Label className="block mb-6">Model</Label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="ai-model-select"
              >
                {PROVIDER_MODELS[selectedProvider].map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* API key */}
            <div>
              <Label className="block mb-6">API Key</Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setTestResult(null) }}
                  placeholder={`Paste your ${PROVIDER_LABELS[selectedProvider]} API key`}
                  style={{ paddingRight: "36px" }}
                />
                <button
                  onClick={() => setShowKey(s => !s)}
                  className="ai-key-toggle"
                >
                  {showKey ? <EyeOff /> : <Eye />}
                </button>
              </div>
              <p className="ai-key-hint">
                When you use AI features, your data (meeting notes, evidence entries, etc.) is sent to {PROVIDER_LABELS[selectedProvider]} for processing. Caliber does not store or access your data beyond what's in your account.
              </p>
            </div>

            {testResult === 'fail' && (
              <div className="ai-error-box">
                <X />
                {testError}
              </div>
            )}

            <div className="flex-align gap-8">
              <Button onClick={handleSaveAndTest} disabled={!apiKey.trim() || saving || testing}>
                {saving || testing
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{testing ? 'Testing connection…' : 'Saving…'}</>
                  : <><Check className="h-4 w-4 mr-2" />Save &amp; Test</>}
              </Button>
              {config && (
                <Button variant="outline" onClick={() => { setEditMode(false); setApiKey(""); setTestResult(null) }}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
