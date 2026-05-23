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
  | { name: string; href: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }
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
      className="flex h-full flex-col flex-shrink-0 transition-all duration-300"
      style={{
        width: isOpen ? "200px" : "44px",
        background: "var(--surf)",
        borderRight: "1px solid var(--border-1)",
      }}
    >
      {/* Logo + collapse toggle */}
      <div style={{ display: "flex", alignItems: "center", height: "72px", padding: "12px 10px", gap: "6px" }}>
        {isOpen && (
          <Link href="/dashboard" style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <Image
              src="/logo_transparent.png"
              alt="Caliber"
              width={160}
              height={42}
              unoptimized
              className="object-contain"
              style={{ height: "42px", width: "auto" }}
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
        {navigation.map((item, idx) => {
          if ('label' in item) {
            if (!isOpen) {
              return (
                <div key={`label-${idx}`} style={{
                  height: "1px",
                  background: "var(--border-1)",
                  margin: "4px 0",
                }} />
              )
            }
            return (
              <div key={`label-${idx}`} style={{
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-3)",
                padding: "10px 4px 4px",
                fontWeight: 500,
                userSelect: "none",
              }}>
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
                  background: badgeBg,
                  color: badgeColor,
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
      <div style={{ padding: "8px 10px", position: "relative" }} ref={menuRef}>
        {menuOpen && (
          <div style={{
            position: "absolute",
            bottom: "calc(100% + 4px)",
            left: "8px",
            right: "8px",
            background: "var(--surf-2, #1e1e1e)",
            border: "1px solid var(--border-1)",
            borderRadius: "8px",
            overflow: "hidden",
            zIndex: 200,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}>
            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 12px",
                fontSize: "var(--text-meta, 12px)",
                color: "var(--text-2)",
                textDecoration: "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-3, #2a2a2a)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <Settings style={{ width: "13px", height: "13px", flexShrink: 0 }} />
              {isOpen && <span>Settings</span>}
            </Link>
            <div style={{ height: "1px", background: "var(--border-1)" }} />
            <button
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 12px",
                width: "100%",
                fontSize: "var(--text-meta, 12px)",
                color: "#e05555",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-3, #2a2a2a)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <LogOut style={{ width: "13px", height: "13px", flexShrink: 0 }} />
              {isOpen && <span>Log out</span>}
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen(o => !o)}
          title={!isOpen ? userName : undefined}
          className={`nav-item${!isOpen ? " nav-item-collapsed" : ""}`}
          style={{ marginBottom: 0, width: "100%", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
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
              <div style={{ fontSize: "var(--text-overline)", color: "var(--text-3)" }}>Account</div>
            </div>
          )}
        </button>
      </div>
    </div>
  )
}
