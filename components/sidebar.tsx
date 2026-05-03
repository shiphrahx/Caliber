"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  UserCircle,
  Calendar,
  BookOpen,
  ClipboardCheck,
  ScanSearch,
  ListChecks,
  FileText,
  ChevronLeft,
  ChevronRight,
  Award,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { fetchSignalCounts } from "@/lib/hooks/use-weekly-review-signals"
import { getMondayOfWeek, getWeeklyReview } from "@/lib/services/weekly-review"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Weekly Review", href: "/review", icon: ClipboardCheck },
  { name: "Weekly Summary", href: "/summary", icon: FileText },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Follow-ups", href: "/follow-ups", icon: ListChecks },
  { name: "Teams", href: "/teams", icon: Users },
  { name: "People", href: "/people", icon: UserCircle },
  { name: "People Radar", href: "/radar", icon: ScanSearch },
  // { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Meetings", href: "/meetings", icon: Calendar },
  { name: "Evidence", href: "/evidence", icon: BookOpen },
  { name: "Career Framework", href: "/framework", icon: Award },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

type ReviewIndicator = 'critical' | 'warning' | 'complete' | null

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [userName, setUserName] = useState("User")
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [userInitials, setUserInitials] = useState("U")
  const [reviewIndicator, setReviewIndicator] = useState<ReviewIndicator>(null)
  const [overdueFollowUps, setOverdueFollowUps] = useState(0)
  const [radarCritical, setRadarCritical] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "User"
      const avatar = user.user_metadata?.avatar_url || null
      setUserName(name)
      setUserAvatar(avatar)
      setUserInitials(name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2))
    })
  }, [])

  useEffect(() => {
    async function loadIndicators() {
      try {
        const supabase = createClient()
        const weekStart = getMondayOfWeek()
        const [review, counts, followUpRes] = await Promise.all([
          getWeeklyReview(weekStart),
          fetchSignalCounts(),
          supabase
            .from('follow_ups')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'open')
            .lt('due_date', new Date().toISOString().slice(0, 10)),
        ])

        if (review?.status === "completed") setReviewIndicator("complete")
        else if (counts.critical > 0) setReviewIndicator("critical")
        else if (counts.warning > 0) setReviewIndicator("warning")
        else setReviewIndicator(null)

        setOverdueFollowUps(followUpRes.count ?? 0)

        // radar critical: reuse the signal counts from fetchSignalCounts
        setRadarCritical(counts.critical)
      } catch {
        // non-critical — sidebar indicators are best-effort
      }
    }
    loadIndicators()
  }, [])

  return (
    <div
      className="flex h-full flex-col flex-shrink-0 transition-all duration-300"
      style={{
        width: isOpen ? "200px" : "44px",
        background: "var(--surf)",
        borderRight: "1px solid var(--border-1)",
      }}
    >
      {/* Logo + collapse toggle */}
      <div style={{ display: "flex", alignItems: "center", height: "48px", padding: "0 10px", gap: "6px" }}>
        {isOpen && (
          <Link href="/" style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <Image
              src="/logo_transparent.png"
              alt="Cadence"
              width={110}
              height={28}
              className="object-contain"
              style={{ height: "28px", width: "auto" }}
            />
          </Link>
        )}
        <button
          onClick={onToggle}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-3)",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            marginLeft: isOpen ? "auto" : "0",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen
            ? <ChevronLeft style={{ width: "12px", height: "12px" }} />
            : <ChevronRight style={{ width: "12px", height: "12px" }} />
          }
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "4px 10px", display: "flex", flexDirection: "column" }}>
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const isReview = item.href === "/review"
          const isFollowUps = item.href === "/follow-ups"
          const isRadar = item.href === "/radar"

          const dotColor = isReview
            ? reviewIndicator === "complete" ? "#00f058"
            : reviewIndicator === "critical" ? "#ff6b6b"
            : reviewIndicator === "warning" ? "#ffa94d"
            : null
            : null

          const badge = isFollowUps && overdueFollowUps > 0
            ? overdueFollowUps
            : isRadar && radarCritical > 0
            ? radarCritical
            : null

          return (
            <Link
              key={item.name}
              href={item.href}
              title={!isOpen ? item.name : undefined}
              className={`nav-item${isActive ? " active" : ""}${!isOpen ? " nav-item-collapsed" : ""}`}
            >
              <item.icon
                style={{
                  width: "12px",
                  height: "12px",
                  flexShrink: 0,
                  opacity: isActive ? 1 : 0.5,
                }}
              />
              {isOpen && <span style={{ flex: 1 }}>{item.name}</span>}
              {dotColor && (
                <span style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: dotColor,
                  flexShrink: 0,
                }} />
              )}
              {badge !== null && (
                <span style={{
                  background: "#ff6b6b",
                  color: "#fff",
                  borderRadius: "10px",
                  padding: "0 5px",
                  fontSize: "var(--text-overline)",
                  fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                  lineHeight: "16px",
                  flexShrink: 0,
                  minWidth: "16px",
                  textAlign: "center",
                }}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User / Settings */}
      <div style={{ padding: "8px 10px" }}>
        <Link
          href="/settings"
          title={!isOpen ? "Settings" : undefined}
          className={`nav-item${pathname === "/settings" ? " active" : ""}${!isOpen ? " nav-item-collapsed" : ""}`}
          style={{ marginBottom: 0 }}
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              referrerPolicy="no-referrer"
              style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "var(--surf-3)",
              color: "var(--text-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "var(--text-overline)",
              fontWeight: 500,
              flexShrink: 0,
            }}>
              {userInitials}
            </div>
          )}
          {isOpen && (
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{ fontSize: "var(--text-meta)", color: "var(--text-1)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
              <div style={{ fontSize: "var(--text-overline)", color: "var(--text-3)" }}>Settings</div>
            </div>
          )}
        </Link>
      </div>
    </div>
  )
}
