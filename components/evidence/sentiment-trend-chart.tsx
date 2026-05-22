"use client"

import { useState, useEffect } from "react"
import { TrendingDown, TrendingUp, Minus } from "lucide-react"
import { getEvidenceSentimentTimeline, type WeeklySentimentBucket } from "@/lib/services/evidence"

interface SentimentTrendChartProps {
  personId: string
  days?: number
}

const BAR_HEIGHT = 80
const BAR_WIDTH = 24
const BAR_GAP = 6

const COLORS = {
  positive: "#4ade80",
  neutral:  "#9ca3af",
  negative: "#f87171",
}

function Tooltip({ bucket }: { bucket: WeeklySentimentBucket }) {
  const date = new Date(bucket.weekStart + "T00:00:00")
  const label = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  return (
    <div style={{
      position: "absolute",
      bottom: "calc(100% + 6px)",
      left: "50%",
      transform: "translateX(-50%)",
      background: "var(--surf-3)",
      border: "1px solid var(--border-2)",
      borderRadius: "4px",
      padding: "6px 8px",
      fontSize: "11px",
      color: "var(--text-1)",
      whiteSpace: "nowrap",
      zIndex: 10,
      pointerEvents: "none",
      lineHeight: 1.5,
    }}>
      <div style={{ fontWeight: 600, marginBottom: "2px" }}>w/c {label}</div>
      <div style={{ color: COLORS.positive }}>↑ {bucket.positive} positive</div>
      <div style={{ color: COLORS.neutral }}>– {bucket.neutral} neutral</div>
      <div style={{ color: COLORS.negative }}>↓ {bucket.negative} negative</div>
      <div style={{ color: "var(--text-3)", marginTop: "2px" }}>{bucket.total} total</div>
    </div>
  )
}

function StackedBar({ bucket, maxTotal }: { bucket: WeeklySentimentBucket; maxTotal: number }) {
  const [hovered, setHovered] = useState(false)
  const scale = maxTotal > 0 ? BAR_HEIGHT / maxTotal : 0

  const negH  = Math.max(1, Math.round(bucket.negative  * scale))
  const neutH = Math.max(bucket.neutral  > 0 ? 1 : 0, Math.round(bucket.neutral  * scale))
  const posH  = Math.max(bucket.positive > 0 ? 1 : 0, Math.round(bucket.positive * scale))

  const totalRendered = negH + neutH + posH
  const empty = bucket.total === 0

  return (
    <div
      style={{
        position: "relative",
        width: `${BAR_WIDTH}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        height: `${BAR_HEIGHT}px`,
        cursor: "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && !empty && <Tooltip bucket={bucket} />}
      {empty ? (
        <div style={{
          height: "2px",
          background: "var(--border-2)",
          borderRadius: "1px",
          opacity: 0.4,
        }} />
      ) : (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "1px",
          borderRadius: "3px",
          overflow: "hidden",
          height: `${totalRendered}px`,
        }}>
          {bucket.positive > 0 && (
            <div style={{ height: `${posH}px`, background: COLORS.positive }} />
          )}
          {bucket.neutral > 0 && (
            <div style={{ height: `${neutH}px`, background: COLORS.neutral }} />
          )}
          {bucket.negative > 0 && (
            <div style={{ height: `${negH}px`, background: COLORS.negative }} />
          )}
        </div>
      )}
    </div>
  )
}

function computeTrend(buckets: WeeklySentimentBucket[]): "improving" | "declining" | "stable" | null {
  if (buckets.length < 2) return null
  const half = Math.floor(buckets.length / 2)
  const recent = buckets.slice(-half)
  const prior  = buckets.slice(0, half)

  const negRate = (bs: WeeklySentimentBucket[]) => {
    const total = bs.reduce((s, b) => s + b.total, 0)
    const neg   = bs.reduce((s, b) => s + b.negative, 0)
    return total > 0 ? neg / total : 0
  }

  const recentRate = negRate(recent)
  const priorRate  = negRate(prior)
  const delta = recentRate - priorRate

  if (delta >  0.15) return "declining"
  if (delta < -0.15) return "improving"
  return "stable"
}

export function SentimentTrendChart({ personId, days = 60 }: SentimentTrendChartProps) {
  const [buckets, setBuckets] = useState<WeeklySentimentBucket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!personId) return
    setLoading(true)
    setError(null)
    getEvidenceSentimentTimeline(personId, days)
      .then(setBuckets)
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false))
  }, [personId, days])

  const trend = computeTrend(buckets)
  const totalEntries = buckets.reduce((s, b) => s + b.total, 0)
  const maxTotal = Math.max(...buckets.map(b => b.total), 1)

  if (loading) {
    return (
      <div style={{ height: "120px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "var(--text-caption)", color: "var(--text-3)" }}>Loading sentiment data…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ height: "80px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "var(--text-caption)", color: "#f87171" }}>Could not load sentiment data</span>
      </div>
    )
  }

  const trendConfig = trend === "declining"
    ? { Icon: TrendingDown, color: "#f87171",  label: "Trending negative" }
    : trend === "improving"
    ? { Icon: TrendingUp,   color: "#4ade80",  label: "Improving" }
    : trend === "stable"
    ? { Icon: Minus,        color: "#9ca3af",  label: "Stable" }
    : null

  return (
    <div style={{ background: "var(--surf-2)", border: "1px solid var(--border-1)", borderRadius: "6px", padding: "14px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <span style={{ fontSize: "var(--text-label)", fontWeight: 600, color: "var(--text-2)" }}>
          Sentiment Trend
          <span style={{ fontWeight: 400, color: "var(--text-3)", marginLeft: "6px" }}>last {days} days</span>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {trendConfig && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <trendConfig.Icon style={{ width: "12px", height: "12px", color: trendConfig.color }} />
              <span style={{ fontSize: "var(--text-caption)", color: trendConfig.color, fontWeight: 600 }}>
                {trendConfig.label}
              </span>
            </div>
          )}
          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {(["positive", "neutral", "negative"] as const).map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: COLORS[s] }} />
                <span style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "capitalize" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {totalEntries === 0 ? (
        <div style={{ height: `${BAR_HEIGHT}px`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "var(--text-caption)", color: "var(--text-3)" }}>
            No evidence with sentiment tags in this period
          </span>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{
            display: "flex",
            alignItems: "flex-end",
            gap: `${BAR_GAP}px`,
            minWidth: "fit-content",
            paddingBottom: "4px",
          }}>
            {buckets.map(b => (
              <StackedBar key={b.weekStart} bucket={b} maxTotal={maxTotal} />
            ))}
          </div>
          {/* X-axis labels — show every other week to avoid crowding */}
          <div style={{
            display: "flex",
            gap: `${BAR_GAP}px`,
            marginTop: "4px",
          }}>
            {buckets.map((b, i) => {
              const show = i === 0 || i === buckets.length - 1 || (buckets.length <= 8) || i % 2 === 0
              const label = show
                ? new Date(b.weekStart + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                : ""
              return (
                <div
                  key={b.weekStart}
                  style={{
                    width: `${BAR_WIDTH}px`,
                    fontSize: "10px",
                    color: "var(--text-3)",
                    textAlign: "center",
                    flexShrink: 0,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
