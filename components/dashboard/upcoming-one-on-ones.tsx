"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Sparkles, ChevronDown, ChevronUp, ExternalLink, Calendar } from "lucide-react"
import { getUpcoming1on1s, type Meeting } from "@/lib/services/meetings"
import { generatePrepBrief, type PrepBrief } from "@/lib/services/prep-brief"
import { handleAIError } from "@/lib/services/ai"

// ─── Per-meeting prep card ─────────────────────────────────────────────────

interface PrepCardProps {
  meeting: Meeting
}

function PrepCard({ meeting }: PrepCardProps) {
  const [brief, setBrief] = useState<PrepBrief | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const isToday = meeting.meetingDate === new Date().toISOString().split("T")[0]
  const dateLabel = isToday ? "Today" : "Tomorrow"

  const handleGenerate = useCallback(async () => {
    if (!meeting.personId) return

    if (loading) {
      abortController?.abort()
      setLoading(false)
      setAbortController(null)
      return
    }

    const controller = new AbortController()
    setAbortController(controller)
    setLoading(true)

    try {
      const result = await generatePrepBrief(meeting.personId, controller.signal)
      setBrief(result)
      setExpanded(true)
    } catch (err) {
      handleAIError(err)
    } finally {
      setLoading(false)
      setAbortController(null)
    }
  }, [meeting.personId, loading, abortController])

  return (
    <div
      data-testid="prep-card"
      style={{
        background: "var(--surf)",
        border: "1px solid var(--border-1)",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      {/* Card header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 14px",
      }}>
        {/* Date chip */}
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "2px 8px",
          borderRadius: "4px",
          background: isToday ? "rgba(0,255,229,0.1)" : "var(--surf-3)",
          color: isToday ? "#00ffe5" : "var(--text-3)",
          fontSize: "var(--text-overline)",
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          flexShrink: 0,
        }}>
          <Calendar style={{ width: "10px", height: "10px" }} />
          {dateLabel}
        </span>

        {/* Person name + title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "var(--text-body)",
            fontWeight: 600,
            color: "var(--text-1)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {meeting.personName ?? meeting.title}
          </div>
          {meeting.personName && (
            <div style={{
              fontSize: "var(--text-caption)",
              color: "var(--text-3)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {meeting.title}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          {/* Link to person page */}
          {meeting.personId && (
            <Link
              href={`/people/${meeting.personId}`}
              onClick={(e) => e.stopPropagation()}
              title="View person"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px",
                borderRadius: "4px",
                color: "var(--text-3)",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
            >
              <ExternalLink style={{ width: "12px", height: "12px" }} />
            </Link>
          )}

          {/* Generate / toggle button */}
          <button
            onClick={brief ? () => setExpanded((v) => !v) : handleGenerate}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              borderRadius: "5px",
              border: "1px solid",
              borderColor: brief ? "var(--border-2)" : "#7C3AED",
              background: brief ? "transparent" : "rgba(124,58,237,0.12)",
              color: brief ? "var(--text-2)" : "#a78bfa",
              fontSize: "var(--text-label)",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-1)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = brief ? "var(--text-2)" : "#a78bfa"
            }}
          >
            {loading ? (
              <>
                <Sparkles style={{ width: "12px", height: "12px", animation: "pulse 1s infinite" }} />
                Preparing…
              </>
            ) : brief ? (
              <>
                {expanded ? <ChevronUp style={{ width: "12px", height: "12px" }} /> : <ChevronDown style={{ width: "12px", height: "12px" }} />}
                {expanded ? "Hide" : "View prep"}
              </>
            ) : (
              <>
                <Sparkles style={{ width: "12px", height: "12px" }} />
                Prep brief
              </>
            )}
          </button>
        </div>
      </div>

      {/* Brief content */}
      {brief && expanded && (
        <div style={{
          borderTop: "1px solid var(--border-1)",
          padding: "14px 16px",
          background: "var(--surf-2)",
        }}>
          <div
            data-testid="brief-content"
            style={{
              fontSize: "var(--text-meta)",
              color: "var(--text-2)",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {brief.content}
          </div>
          <div style={{
            marginTop: "10px",
            fontSize: "var(--text-caption)",
            color: "var(--text-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span>Generated at {new Date(brief.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
            <button
              onClick={handleGenerate}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-3)",
                fontSize: "var(--text-caption)",
                cursor: "pointer",
                padding: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Widget ────────────────────────────────────────────────────────────────────

export function UpcomingOneOnOnes() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    getUpcoming1on1s(today)
      .then(setMeetings)
      .catch(() => {/* non-critical widget */})
      .finally(() => setLoading(false))
  }, [])

  // Don't render when no upcoming 1:1s or still loading
  if (loading || meetings.length === 0) return null

  return (
    <div
      data-testid="upcoming-one-on-ones"
      style={{
        background: "var(--surf)",
        border: "1px solid var(--border-1)",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "14px" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles style={{ width: "15px", height: "15px", color: "#a78bfa" }} />
          Upcoming 1:1s
        </h2>
        <p style={{ marginTop: "2px", fontSize: "var(--text-meta)", color: "var(--text-3)" }}>
          {meetings.length === 1
            ? "You have 1 upcoming 1:1. Generate a prep brief to get ready."
            : `You have ${meetings.length} upcoming 1:1s. Generate prep briefs to get ready.`}
        </p>
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {meetings.map((meeting) => (
          <PrepCard key={meeting.id} meeting={meeting} />
        ))}
      </div>
    </div>
  )
}
