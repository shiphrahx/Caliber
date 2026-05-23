"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { MeetingsBarChart, MeetingsWeekData } from "./meetings-bar-chart"

const MEETING_COLORS: Record<string, string> = {
  "1:1": "#84ffc4",
  "Team Sync": "#60a5fa",
  "Retro": "#fb923c",
  "Planning": "#fbbf24",
  "Review": "#f87171",
  "Standup": "#c084fc",
  "Other": "#94a3b8",
}

const MEETING_TYPES = ["1:1", "Team Sync", "Retro", "Planning", "Review", "Standup", "Other"] as const

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0]
}

function weekLabel(monday: Date): string {
  return monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function buildWeekBuckets(anchorMonday: Date): { monday: Date; label: string }[] {
  // 8 weeks ending at the anchor week
  return Array.from({ length: 8 }, (_, i) => {
    const monday = addDays(anchorMonday, -(7 - i) * 7)
    return { monday, label: weekLabel(monday) }
  })
}

async function fetchMeetingsData(anchorMonday: Date): Promise<MeetingsWeekData[]> {
  const supabase = createClient()
  const start = addDays(anchorMonday, -7 * 7)
  const end = addDays(anchorMonday, 6) // Sunday of anchor week

  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, meeting_type, meeting_date")
    .gte("meeting_date", toISO(start))
    .lte("meeting_date", toISO(end))
    .order("meeting_date", { ascending: true })

  const rows: any[] = meetings ?? []
  const buckets = buildWeekBuckets(anchorMonday)

  return buckets.map(({ monday, label }) => {
    const sunday = addDays(monday, 6)
    const mondayStr = toISO(monday)
    const sundayStr = toISO(sunday)

    const bucket = rows.filter((m) => m.meeting_date >= mondayStr && m.meeting_date <= sundayStr)

    const row: MeetingsWeekData = {
      week: label,
      "1:1": 0, "Team Sync": 0, "Retro": 0,
      "Planning": 0, "Review": 0, "Standup": 0, "Other": 0,
      total: bucket.length,
    }

    for (const m of bucket) {
      const t = m.meeting_type as string
      if (t in row) (row as any)[t]++
      else row["Other"]++
    }

    return row
  })
}

export function MeetingsWidget() {
  const today = new Date()
  const [anchorMonday, setAnchorMonday] = useState(() => getMondayOfWeek(today))
  const [data, setData] = useState<MeetingsWeekData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchMeetingsData(anchorMonday).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [anchorMonday])

  const currentMonday = getMondayOfWeek(today)
  const isAtOrPastCurrentWindow = toISO(anchorMonday) >= toISO(currentMonday)

  const rangeLabel = (() => {
    const start = addDays(anchorMonday, -7 * 7)
    const end = addDays(anchorMonday, 6)
    return `${weekLabel(start)} – ${weekLabel(end)}`
  })()

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div>
          <h2>Meetings</h2>
          <p className="mt-0.5">{rangeLabel}</p>
        </div>
        <div className="widget-nav-btns">
          <button
            onClick={() => setAnchorMonday((d) => addDays(d, -56))}
            className="widget-nav-btn"
            aria-label="Previous 8 weeks"
          >
            <ChevronLeft />
          </button>
          <button
            onClick={() => setAnchorMonday((d) => addDays(d, 56))}
            disabled={isAtOrPastCurrentWindow}
            className="widget-nav-btn"
            style={{
              cursor: isAtOrPastCurrentWindow ? "not-allowed" : "pointer",
              opacity: isAtOrPastCurrentWindow ? 0.3 : 1,
            }}
            aria-label="Next week"
          >
            <ChevronRight />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="widget-loading">
          <span className="widget-loading-text">Loading...</span>
        </div>
      ) : (
        <MeetingsBarChart data={data} />
      )}

      <div className="widget-legend">
        {MEETING_TYPES.map((t) => (
          <div key={t} className="widget-legend-item">
            <span className="widget-legend-dot" style={{ backgroundColor: MEETING_COLORS[t] }} />
            <span className="widget-legend-label">{t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
