"use client"

import React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
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
  Settings,
  LogOut,
  BarChart2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { fetchSignalCounts } from "@/lib/hooks/use-weekly-review-signals"
import { getMondayOfWeek, getWeeklyReview } from "@/lib/services/weekly-review"

type NavItem =
  | { name: string; href: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }
  | { label: string }

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Weekly Review", href: "/review", icon: ClipboardCheck },
  { name: "People Radar", href: "/radar", icon: ScanSearch },
  { label: "Manage" },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Teams", href: "/teams", icon: Users },
  { name: "People", href: "/people", icon: UserCircle },
  { name: "Meetings", href: "/meetings", icon: Calendar },
  { name: "Evidence", href: "/evidence", icon: BookOpen },
  { name: "Follow-ups", href: "/follow-ups", icon: ListChecks },
  { name: "Career Framework", href: "/framework", icon: Award },
  { name: "Team Health", href: "/team-health", icon: BarChart2 },
  { label: "Output" },
  { name: "Weekly Summary", href: "/summary", icon: FileText },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

type ReviewIndicator = 'critical' | 'warning' | 'complete' | null

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState("User")
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [userInitials, setUserInitials] = useState("U")
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [reviewIndicator, setReviewIndicator] = useState<ReviewIndicator>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }
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
    let cancelled = false

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

        if (cancelled) return

        if (review?.status === "completed") setReviewIndicator("complete")
        else if (counts.critical > 0) setReviewIndicator("critical")
        else if (counts.warning > 0) setReviewIndicator("warning")
        else setReviewIndicator(null)

        setOverdueFollowUps(followUpRes.count ?? 0)
        setRadarCritical(counts.critical)
      } catch (error) {
        // non-critical — sidebar indicators are best-effort
        if (!cancelled) console.warn('Failed to load sidebar indicators:', error)
      }
    }
    loadIndicators()
    return () => { cancelled = true }
  }, [])

  return (
    <div
      className="flex h-full flex-col flex-shrink-0 transition-all duration-300 sidebar"
      style={{ width: isOpen ? "200px" : "44px" }}
    >
      {/* Logo + collapse toggle */}
      <div className="sidebar-header">
        {isOpen && (
          <Link href="/dashboard" className="sidebar-logo-link">
            <Image
              src="/logo_transparent.png"
              alt="Caliber"
              width={160}
              height={42}
              unoptimized
              className="object-contain sidebar-logo"
            />
          </Link>
        )}
        <button
          onClick={onToggle}
          className="sidebar-toggle"
          style={{ marginLeft: isOpen ? "auto" : "0" }}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen
            ? <ChevronLeft className="sidebar-nav-icon" />
            : <ChevronRight className="sidebar-nav-icon" />
          }
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navigation.map((item, idx) => {
          if ('label' in item) {
            if (!isOpen) {
              return <div key={`label-${idx}`} className="sidebar-divider" />
            }
            return (
              <div key={`label-${idx}`} className="sidebar-section-label">
                {item.label}
              </div>
            )
          }

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

          const badgeBg = isFollowUps ? "#1e0d00" : "#1a0a0a"
          const badgeColor = isFollowUps ? "#ffa94d" : "#ff6b6b"

          return (
            <Link
              key={item.name}
              href={item.href}
              title={!isOpen ? item.name : undefined}
              className={`nav-item${isActive ? " active" : ""}${!isOpen ? " nav-item-collapsed" : ""}`}
            >
              <item.icon
                className={`sidebar-nav-icon${isActive ? " sidebar-nav-icon--active" : ""}`}
              />
              {isOpen && <span className="flex-1">{item.name}</span>}
              {dotColor && (
                <span className="nav-dot" style={{ background: dotColor }} />
              )}
              {badge !== null && (
                <span
                  className="nav-badge"
                  style={{ background: badgeBg, color: badgeColor }}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User / Settings */}
      <div className="sidebar-user" ref={menuRef}>
        {menuOpen && (
          <div className="sidebar-menu">
            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="sidebar-menu-item"
            >
              <Settings />
              {isOpen && <span>Settings</span>}
            </Link>
            <div className="sidebar-divider" />
            <button
              onClick={handleLogout}
              className="sidebar-menu-item sidebar-menu-item--danger"
            >
              <LogOut />
              {isOpen && <span>Log out</span>}
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen(o => !o)}
          title={!isOpen ? userName : undefined}
          className={`nav-item sidebar-user-btn${!isOpen ? " nav-item-collapsed" : ""}`}
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              referrerPolicy="no-referrer"
              className="sidebar-avatar"
            />
          ) : (
            <div className="sidebar-avatar-initials">
              {userInitials}
            </div>
          )}
          {isOpen && (
            <div className="sidebar-username">
              <div className="sidebar-username__name">{userName}</div>
              <div className="sidebar-username__sub">Account</div>
            </div>
          )}
        </button>
      </div>
    </div>
  )
}
