"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export type MeetingsWeekData = {
  week: string        // e.g. "Feb 24"
  "1:1": number
  "Team Sync": number
  "Retro": number
  "Planning": number
  "Review": number
  "Standup": number
  "Other": number
  total: number
}

const MEETING_COLORS: Record<string, string> = {
  "1:1": "#84ffc4",
  "Team Sync": "#60a5fa",
  "Retro": "#34d399",
  "Planning": "#fbbf24",
  "Review": "#f87171",
  "Standup": "#c084fc",
  "Other": "#94a3b8",
}

const MEETING_TYPES = ["1:1", "Team Sync", "Retro", "Planning", "Review", "Standup", "Other"] as const

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((sum: number, entry: any) => sum + (entry.value ?? 0), 0)
  return (
    <div className="bg-[#1e1e1e] border border-[#383838] rounded-lg p-3 shadow-xl text-xs">
      <p className="text-gray-300 font-semibold mb-2">Week of {label}</p>
      {payload.map((entry: any) =>
        entry.value > 0 ? (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
              <span className="text-gray-400">{entry.dataKey}</span>
            </div>
            <span className="text-gray-100 font-medium">{entry.value}</span>
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

interface MeetingsBarChartProps {
  data: MeetingsWeekData[]
}

export function MeetingsBarChart({ data }: MeetingsBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={20}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fill: "#9ca3af", fontSize: 13 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#9ca3af", fontSize: 13 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        {MEETING_TYPES.map((type) => (
          <Bar key={type} dataKey={type} stackId="a" fill={MEETING_COLORS[type]} radius={type === "Other" ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
