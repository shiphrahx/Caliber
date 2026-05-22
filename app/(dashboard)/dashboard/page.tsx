import { createClient } from "@/lib/supabase/server"
import { MeetingsWidget } from "@/components/dashboard/meetings-widget"
import { TasksWidget } from "@/components/dashboard/tasks-widget"
import { TaskPriorityChart } from "@/components/dashboard/task-priority-chart"
import { DashboardCalendar, CalendarTask } from "@/components/dashboard/dashboard-calendar"
import { WeeklyReviewBanner } from "@/components/dashboard/weekly-review-banner"
import { UpcomingOneOnOnes } from "@/components/dashboard/upcoming-one-on-ones"

async function getCalendarTasks(): Promise<CalendarTask[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("tasks")
    .select("id, title, due_date, status, priority")
    .not("due_date", "is", null)
    .order("due_date", { ascending: true })

  const priorityMap: Record<string, CalendarTask["priority"]> = {
    low: "Low", medium: "Medium", high: "High", very_high: "Very High",
  }
  const statusMap: Record<string, CalendarTask["status"]> = {
    not_started: "Not started", in_progress: "In progress",
    blocked: "Blocked", completed: "Done",
  }

  type TaskRow = { id: string; title: string; due_date: string; priority: string; status: string }
  return (data ?? []).map((t: TaskRow) => ({
    id: t.id,
    title: t.title,
    dueDate: t.due_date,
    priority: priorityMap[t.priority] ?? "Medium",
    status: statusMap[t.status] ?? "Not started",
  }))
}

export default async function DashboardPage() {
  const calendarTasks = await getCalendarTasks()

  const today = new Date()
  const label = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <div>
        <h1>Dashboard</h1>
        <p style={{ marginTop: "4px" }}>{label}</p>
      </div>

      {/* Weekly Review prompt */}
      <WeeklyReviewBanner />

      {/* Upcoming 1:1s with AI prep briefs */}
      <UpcomingOneOnOnes />

      {/* ── Widgets row ── */}
      <div className="grid grid-cols-3 gap-4">
        <MeetingsWidget />
        <TasksWidget />

        {/* Priority breakdown placeholder */}
        <div className="bg-[#1c1c1c] border border-[#383838] rounded-xl p-5">
          <div className="mb-4">
            <h2>Priority Breakdown</h2>
            <p style={{ marginTop: "2px" }}>Tasks by priority</p>
          </div>
          <TaskPriorityChart />
        </div>
      </div>

      {/* ── Calendar ── */}
      <div>
        <DashboardCalendar tasks={calendarTasks} />
      </div>
    </div>
  )
}
