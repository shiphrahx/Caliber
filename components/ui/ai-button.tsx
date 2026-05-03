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

const baseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "4px 10px",
  borderRadius: "4px",
  fontSize: "var(--text-caption)",
  fontWeight: 600,
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
  border: "1px solid var(--border-2)",
  background: "var(--surf-2)",
  color: "var(--text-2)",
  transition: "all 0.15s",
}

const generatingStyle: React.CSSProperties = {
  ...baseStyle,
  opacity: 0.7,
  cursor: "not-allowed",
  color: "#00f058",
  borderColor: "#00f05840",
  background: "#0d200f",
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
      <Link
        href="/settings"
        style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", textDecoration: "none" }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#00f058")}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-3)")}
      >
        Set up AI →
      </Link>
    )
  }

  if (generating) {
    return (
      <span style={generatingStyle}>
        <Loader2 style={{ width: "11px", height: "11px", animation: "spin 1s linear infinite" }} />
        Generating…
      </span>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      style={{ ...baseStyle, opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
      onMouseEnter={e => {
        if (!disabled) {
          ;(e.currentTarget as HTMLElement).style.color = "#00f058"
          ;(e.currentTarget as HTMLElement).style.borderColor = "#00f05840"
        }
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.color = "var(--text-2)"
        ;(e.currentTarget as HTMLElement).style.borderColor = "var(--border-2)"
      }}
    >
      <Sparkles style={{ width: "11px", height: "11px" }} />
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
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 10px",
      borderRadius: "4px",
      background: "#0d200f",
      border: "1px solid #00f05840",
      fontSize: "var(--text-caption)",
      color: "#00f058",
    }}>
      <Sparkles style={{ width: "10px", height: "10px" }} />
      AI-generated — review before using
      <button
        onClick={onDismiss}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#00f05880", marginLeft: "2px", fontFamily: "var(--font-sans)", fontSize: "var(--text-overline)", padding: "0 2px" }}
      >
        ✕
      </button>
    </div>
  )
}
