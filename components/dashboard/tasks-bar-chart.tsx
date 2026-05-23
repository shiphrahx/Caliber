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

export type TasksWeekData = {
  week: string
  "Not started": number
  "In progress": number
  "Blocked": number
  "Done": number
  total: number
}

const STATUS_COLORS: Record<string, string> = {
  "Not started": "#4b5563",
  "In progress": "#60a5fa",
  "Blocked": "#f87171",
  "Done": "#34d399",
}

const TASK_STATUSES = ["Not started", "In progress", "Blocked", "Done"] as const

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((sum: number, entry: any) => sum + (entry.value ?? 0), 0)
  return (
    <div className="bg-[#1e1e1e] border border-[#383838] rounded-lg p-3 shadow-xl text-[13px]">
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
        <span className="text-gray-400">Total due</span>
        <span className="text-gray-100 font-semibold">{total}</span>
      </div>
    </div>
  )
}

interface TasksBarChartProps {
  data: TasksWeekData[]
}

export function TasksBarChart({ data }: TasksBarChartProps) {
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
        {TASK_STATUSES.map((status) => (
          <Bar
            key={status}
            dataKey={status}
            stackId="a"
            fill={STATUS_COLORS[status]}
            radius={status === "Done" ? [3, 3, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
