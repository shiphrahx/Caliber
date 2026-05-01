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
  FolderKanban,
  Calendar,
  Target,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Teams", href: "/teams", icon: Users },
  { name: "People", href: "/people", icon: UserCircle },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Meetings", href: "/meetings", icon: Calendar },
  { name: "Career Goals", href: "/career-goals", icon: Target },
]


interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [userName, setUserName] = useState("User")
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [userInitials, setUserInitials] = useState("U")

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

  return (
    <div className={cn(
      "flex h-full flex-col transition-all duration-300",
      "border-r",
      isOpen ? "w-64" : "w-16"
    )}
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center">
        <Link href="/" className={cn(
          "flex items-center gap-3 transition-colors flex-1",
          isOpen ? "px-6" : "px-3 justify-center"
        )}
          style={{ ["--tw-hover-bg" as string]: "var(--bg-surface-2)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-surface-2)")}
          onMouseLeave={e => (e.currentTarget.style.background = "")}
        >
          <Image
            src="/logo_transparent.png"
            alt="Cadence"
            width={isOpen ? 140 : 35}
            height={35}
            className={cn(
              "object-contain flex-shrink-0",
              isOpen ? "h-[35px] w-auto" : "h-[35px] w-[35px]"
            )}
          />
        </Link>
        {isOpen && (
          <button
            onClick={onToggle}
            className="px-3 h-full transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-surface-2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "")}
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="relative flex-1 space-y-0.5 p-3">
        {!isOpen && (
          <button
            onClick={onToggle}
            className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors w-full justify-center"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-surface-2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "")}
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md transition-colors",
                !isOpen && "justify-center"
              )}
              style={{
                fontSize: "13px",
                padding: "6px 16px",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                background: isActive ? "var(--bg-surface-3)" : "transparent",
                borderRight: isActive ? "2px solid #84cc16" : "2px solid transparent",
                fontWeight: 400,
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--bg-surface-2)"
                  e.currentTarget.style.color = "var(--text-primary)"
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent"
                  e.currentTarget.style.color = "var(--text-secondary)"
                }
              }}
              title={!isOpen ? item.name : undefined}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {isOpen && item.name}
            </Link>
          )
        })}
      </nav>

      {/* User Profile → Settings */}
      <div className="p-3">
        <Link
          href="/settings"
          className={cn(
            "flex w-full items-center gap-3 rounded-md transition-colors",
            !isOpen && "justify-center"
          )}
          style={{
            padding: "6px 12px",
            color: pathname === "/settings" ? "var(--text-primary)" : "var(--text-secondary)",
            background: pathname === "/settings" ? "var(--bg-surface-3)" : "transparent",
            fontSize: "13px",
          }}
          onMouseEnter={e => {
            if (pathname !== "/settings") {
              e.currentTarget.style.background = "var(--bg-surface-2)"
              e.currentTarget.style.color = "var(--text-primary)"
            }
          }}
          onMouseLeave={e => {
            if (pathname !== "/settings") {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "var(--text-secondary)"
            }
          }}
          title={!isOpen ? "Settings" : undefined}
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              referrerPolicy="no-referrer"
              className="h-8 w-8 min-w-[2rem] rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="flex h-8 w-8 min-w-[2rem] items-center justify-center rounded-full flex-shrink-0"
              style={{ background: "var(--bg-surface-3)", color: "#84cc16" }}
            >
              <span style={{ fontSize: "13px", fontWeight: 500 }}>{userInitials}</span>
            </div>
          )}
          {isOpen && (
            <div className="flex-1 text-left overflow-hidden">
              <div className="truncate" style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 400 }}>{userName}</div>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Settings</div>
            </div>
          )}
        </Link>
      </div>
    </div>
  )
}
