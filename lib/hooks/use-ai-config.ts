"use client"

import { useState, useEffect } from 'react'
import { getAIConfig, type AIConfig, PROVIDER_LABELS } from '@/lib/services/ai'

export interface AIAvailability {
  configured: boolean
  config: AIConfig | null
  loading: boolean
  providerLabel: string
  modelLabel: string
  tooltip: string
}

export function useAIConfig(): AIAvailability {
  const [config, setConfig] = useState<AIConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAIConfig()
      .then(setConfig)
      .catch(() => setConfig(null))
      .finally(() => setLoading(false))
  }, [])

  const providerLabel = config ? PROVIDER_LABELS[config.provider] : ''
  const tooltip = config ? `AI-powered (using ${providerLabel} ${config.model})` : ''

  return {
    configured: !!config,
    config,
    loading,
    providerLabel,
    modelLabel: config?.model ?? '',
    tooltip,
  }
}
