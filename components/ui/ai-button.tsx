"use client"

import { Sparkles, Loader2 } from "lucide-react"
import Link from "next/link"

// Consistent AI action button. Shows sparkle when configured, "Set up AI →" link when not.
// Only renders the "Set up AI" link once per page — callers should check configured themselves
// before rendering multiple AI buttons to avoid link spam.

interface AIButtonProps {
  configured: boolean
  loading?: boolean
  generating?: boolean
  onClick?: () => void
  label: string
  tooltip?: string
  disabled?: boolean
  className?: string
  showSetupLink?: boolean  // show "Set up AI →" when not configured (default true)
}

export function AIButton({
  configured,
  loading = false,
  generating = false,
  onClick,
  label,
  tooltip,
  disabled = false,
  showSetupLink = true,
}: AIButtonProps) {
  if (loading) return null

  if (!configured) {
    if (!showSetupLink) return null
    return (
      <Link href="/settings" className="ai-setup-link">
        Set up AI →
      </Link>
    )
  }

  if (generating) {
    return (
      <span className="ai-btn ai-btn--generating">
        <Loader2 className="ai-btn__icon ai-btn__icon--spin" />
        Generating…
      </span>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`ai-btn${disabled ? " ai-btn--disabled" : ""}`}
    >
      <Sparkles className="ai-btn__icon" />
      {label}
    </button>
  )
}

// Small inline badge shown on AI-generated content. Dismissible.
interface AIGeneratedBadgeProps {
  onDismiss: () => void
}

export function AIGeneratedBadge({ onDismiss }: AIGeneratedBadgeProps) {
  return (
    <div className="ai-generated-badge">
      <Sparkles className="ai-generated-badge__icon" />
      AI-generated — review before using
      <button onClick={onDismiss} className="ai-generated-badge__dismiss">
        ✕
      </button>
    </div>
  )
}
