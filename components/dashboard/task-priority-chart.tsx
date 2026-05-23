"use client"

import { useState, useEffect } from "react"
import { BarChart2, PieChart as PieIcon } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const PRIORITIES = ["Low", "Medium", "High", "Very High"] as const
type Priority = typeof PRIORITIES[number]

const PRIORITY_COLORS: Record<Priority, string> = {
  "Low": "#4ade80",
  "Medium": "#facc15",
  "High": "#fb923c",
  "Very High": "#f87171",
}

const DB_PRIORITY_MAP: Record<string, Priority> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  very_high: "Very High",
}

const WEEK_OPTIONS = [2, 4, 8, 12] as const
type WeekOption = typeof WEEK_OPTIONS[number]

type WeekRow = { week: string; Low: number; Medium: number; High: number; "Very High": number }

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

async function fetchData(weeks: WeekOption): Promise<WeekRow[]> {
  const supabase = createClient()
  const today = new Date()
  const anchorMonday = getMondayOfWeek(today)
  const start = addDays(anchorMonday, -(weeks - 1) * 7)
  const end = addDays(anchorMonday, 6)

  const { data } = await supabase
    .from("tasks")
    .select("priority, created_at")
    .gte("created_at", toISO(start))
    .lte("created_at", toISO(end))

  const rows = (data ?? []) as { created_at: string; priority: string }[]

  return Array.from({ length: weeks }, (_, i) => {
    const monday = addDays(start, i * 7)
    const sunday = addDays(monday, 6)
    const mondayStr = toISO(monday)
    const sundayStr = toISO(sunday)

    const bucket = rows.filter((t) => {
      const d = t.created_at.slice(0, 10)
      return d >= mondayStr && d <= sundayStr
    })

    const row: WeekRow = { week: weekLabel(monday), Low: 0, Medium: 0, High: 0, "Very High": 0 }
    for (const t of bucket) {
      const p = DB_PRIORITY_MAP[t.priority] ?? "Low"
      row[p]++
    }
    return row
  })
}

// ── Tooltips ─────────────────────────────────────────────────────────────────

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s: number, e: any) => s + (e.value ?? 0), 0)
  return (
    <div className="bg-[#1e1e1e] border border-[#383838] rounded-lg p-3 shadow-xl text-xs">
      <p className="text-gray-300 font-semibold mb-2">Week of {label}</p>
      {payload.map((e: any) =>
        e.value > 0 ? (
          <div key={e.dataKey} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: e.fill }} />
              <span className="text-gray-400">{e.dataKey}</span>
            </div>
            <span className="text-gray-100 font-medium">{e.value}</span>
          </div>
        ) : null
      )}
      <div className="border-t border-[#383838] mt-2 pt-2 flex justify-between">
        <span className="text-gray-400">Total</span>
        <span className="text-gray-100 font-semibold">{total}</span>
      </div>
    </div>
  )
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const e = payload[0]
  return (
    <div className="bg-[#1e1e1e] border border-[#383838] rounded-lg px-3 py-2 shadow-xl text-xs">
      <div className="flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: e.payload.fill }} />
        <span className="text-gray-300 font-medium">{e.name}</span>
        <span className="text-gray-100 font-semibold ml-2">{e.value}</span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function TaskPriorityChart() {
  const [chartType, setChartType] = useState<"bar" | "pie">("bar")
  const [weeks, setWeeks] = useState<WeekOption>(8)
  const [data, setData] = useState<WeekRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchData(weeks).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [weeks])

  // Aggregate totals for pie chart
  const pieTotals = PRIORITIES.map((p) => ({
    name: p,
    value: data.reduce((s, row) => s + row[p], 0),
    fill: PRIORITY_COLORS[p],
  })).filter((d) => d.value > 0)

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        {/* Week selector */}
        <div className="flex items-center gap-1 bg-[#252525] rounded-md p-0.5">
          {WEEK_OPTIONS.map((w) => (
            <button
              key={w}
              onClick={() => setWeeks(w)}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
                weeks === w
                  ? "bg-[#383838] text-gray-100"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              {w}w
            </button>
          ))}
        </div>

        {/* Chart type toggle */}
        <div className="flex items-center gap-1 bg-[#252525] rounded-md p-0.5">
          <button
            onClick={() => setChartType("bar")}
            className={cn(
              "p-1 rounded transition-colors",
              chartType === "bar" ? "bg-[#383838] text-gray-100" : "text-gray-500 hover:text-gray-300"
            )}
            title="Bar chart"
          >
            <BarChart2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setChartType("pie")}
            className={cn(
              "p-1 rounded transition-colors",
              chartType === "pie" ? "bg-[#383838] text-gray-100" : "text-gray-500 hover:text-gray-300"
            )}
            title="Pie chart"
          >
            <PieIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-[220px] flex items-center justify-center">
          <span className="text-gray-600 text-xs">Loading...</span>
        </div>
      ) : chartType === "bar" ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={weeks <= 4 ? 28 : 16}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
            <XAxis dataKey="week" tick={{ fill: "#9ca3af", fontSize: 13 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 13 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            {PRIORITIES.map((p, i) => (
              <Bar
                key={p}
                dataKey={p}
                stackId="a"
                fill={PRIORITY_COLORS[p]}
                radius={i === PRIORITIES.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[200px]">
          {pieTotals.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <span className="text-gray-600 text-xs">No tasks in this period</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieTotals}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieTotals.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ color: "#9ca3af", fontSize: 13 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  )
}
