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
    <div className="sentiment-tooltip">
      <div className="sentiment-tooltip-week">w/c {label}</div>
      <div style={{ color: COLORS.positive }}>↑ {bucket.positive} positive</div>
      <div style={{ color: COLORS.neutral }}>– {bucket.neutral} neutral</div>
      <div style={{ color: COLORS.negative }}>↓ {bucket.negative} negative</div>
      <div className="sentiment-tooltip-total">{bucket.total} total</div>
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
      className="sentiment-stacked-bar"
      style={{ width: `${BAR_WIDTH}px`, height: `${BAR_HEIGHT}px` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && !empty && <Tooltip bucket={bucket} />}
      {empty ? (
        <div className="sentiment-bar-empty" />
      ) : (
        <div
          className="sentiment-bar-stack"
          style={{ height: `${totalRendered}px` }}
        >
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
      <div className="sentiment-chart-loading">
        <span className="text-caption text-3">Loading sentiment data…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="sentiment-chart-error">
        <span className="sentiment-chart-error-text">Could not load sentiment data</span>
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
    <div className="sentiment-chart">
      {/* Header */}
      <div className="sentiment-chart-header">
        <span className="sentiment-chart-title">
          Sentiment Trend
          <span className="sentiment-chart-period">last {days} days</span>
        </span>
        <div className="sentiment-chart-meta">
          {trendConfig && (
            <div className="sentiment-trend-indicator">
              <trendConfig.Icon className="sentiment-trend-icon" style={{ color: trendConfig.color }} />
              <span className="sentiment-trend-label" style={{ color: trendConfig.color }}>
                {trendConfig.label}
              </span>
            </div>
          )}
          {/* Legend */}
          <div className="sentiment-legend">
            {(["positive", "neutral", "negative"] as const).map(s => (
              <div key={s} className="sentiment-legend-item">
                <div className="sentiment-legend-dot" style={{ background: COLORS[s] }} />
                <span className="sentiment-legend-text">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {totalEntries === 0 ? (
        <div className="sentiment-chart-empty" style={{ height: `${BAR_HEIGHT}px` }}>
          <span className="text-caption text-3">No evidence with sentiment tags in this period</span>
        </div>
      ) : (
        <div className="sentiment-chart-body">
          <div className="sentiment-bars" style={{ gap: `${BAR_GAP}px` }}>
            {buckets.map(b => (
              <StackedBar key={b.weekStart} bucket={b} maxTotal={maxTotal} />
            ))}
          </div>
          {/* X-axis labels — show every other week to avoid crowding */}
          <div className="sentiment-x-labels" style={{ gap: `${BAR_GAP}px` }}>
            {buckets.map((b, i) => {
              const show = i === 0 || i === buckets.length - 1 || (buckets.length <= 8) || i % 2 === 0
              const label = show
                ? new Date(b.weekStart + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                : ""
              return (
                <div
                  key={b.weekStart}
                  className="sentiment-x-label"
                  style={{ width: `${BAR_WIDTH}px` }}
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
