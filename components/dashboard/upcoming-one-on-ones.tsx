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
    <div data-testid="prep-card" className="prep-card">
      {/* Card header */}
      <div className="prep-card-header">
        {/* Date chip */}
        <span
          className="date-chip"
          style={{
            background: isToday ? "rgba(0,255,229,0.1)" : "var(--surf-3)",
            color: isToday ? "#00ffe5" : "var(--text-3)",
          }}
        >
          <Calendar />
          {dateLabel}
        </span>

        {/* Person name + title */}
        <div className="prep-card-name-wrap">
          <div className="prep-card-name">
            {meeting.personName ?? meeting.title}
          </div>
          {meeting.personName && (
            <div className="prep-card-subtitle">
              {meeting.title}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="prep-card-actions">
          {/* Link to person page */}
          {meeting.personId && (
            <Link
              href={`/people/${meeting.personId}`}
              onClick={(e) => e.stopPropagation()}
              title="View person"
              className="prep-card-person-link"
            >
              <ExternalLink />
            </Link>
          )}

          {/* Generate / toggle button */}
          <button
            onClick={brief ? () => setExpanded((v) => !v) : handleGenerate}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-label font-medium cursor-pointer transition-all"
            style={{
              border: "1px solid",
              borderColor: brief ? "var(--border-2)" : "#7C3AED",
              background: brief ? "transparent" : "rgba(124,58,237,0.12)",
              color: brief ? "var(--text-2)" : "#a78bfa",
            }}
          >
            {loading ? (
              <>
                <Sparkles className="w-3 h-3 animate-pulse" />
                Preparing…
              </>
            ) : brief ? (
              <>
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? "Hide" : "View prep"}
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                Prep brief
              </>
            )}
          </button>
        </div>
      </div>

      {/* Brief content */}
      {brief && expanded && (
        <div className="prep-card-brief-area">
          <div data-testid="brief-content" className="prep-card-brief-content">
            {brief.content}
          </div>
          <div className="prep-card-brief-footer">
            <span>Generated at {new Date(brief.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
            <button onClick={handleGenerate} className="prep-card-regen-btn">
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
    <div data-testid="upcoming-one-on-ones" className="one-on-ones-widget">
      {/* Header */}
      <div className="one-on-ones-header">
        <h2 className="one-on-ones-title">
          <Sparkles />
          Upcoming 1:1s
        </h2>
        <p className="one-on-ones-sub">
          {meetings.length === 1
            ? "You have 1 upcoming 1:1. Generate a prep brief to get ready."
            : `You have ${meetings.length} upcoming 1:1s. Generate prep briefs to get ready.`}
        </p>
      </div>

      {/* Cards */}
      <div className="prep-cards">
        {meetings.map((meeting) => (
          <PrepCard key={meeting.id} meeting={meeting} />
        ))}
      </div>
    </div>
  )
}
