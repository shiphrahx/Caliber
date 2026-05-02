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
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Teams", href: "/teams", icon: Users },
  { name: "People", href: "/people", icon: UserCircle },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Meetings", href: "/meetings", icon: Calendar },
  // { name: "Career Goals", href: "/career-goals", icon: Target },
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
          return (
            <Link
              key={item.name}
              href={item.href}
              title={!isOpen ? item.name : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: isOpen ? "4px 7px" : "4px 6px",
                borderRadius: "4px",
                marginBottom: "1px",
                fontSize: "var(--text-meta)",
                fontFamily: "var(--font-sans)",
                color: isActive ? "var(--text-1)" : "var(--text-2)",
                background: isActive ? "var(--surf-3)" : "transparent",
                borderRight: isActive ? "2px solid #00f058" : "2px solid transparent",
                textDecoration: "none",
                justifyContent: isOpen ? "flex-start" : "center",
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--surf-2)"
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"
              }}
            >
              <item.icon
                style={{
                  width: "12px",
                  height: "12px",
                  flexShrink: 0,
                  opacity: isActive ? 1 : 0.5,
                }}
              />
              {isOpen && item.name}
            </Link>
          )
        })}
      </nav>

      {/* User / Settings */}
      <div style={{ padding: "8px 10px" }}>
        <Link
          href="/settings"
          title={!isOpen ? "Settings" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "4px 7px",
            borderRadius: "4px",
            fontSize: "var(--text-meta)",
            fontFamily: "var(--font-sans)",
            color: pathname === "/settings" ? "var(--text-1)" : "var(--text-2)",
            background: pathname === "/settings" ? "var(--surf-3)" : "transparent",
            borderRight: pathname === "/settings" ? "2px solid #00f058" : "2px solid transparent",
            textDecoration: "none",
            justifyContent: isOpen ? "flex-start" : "center",
          }}
          onMouseEnter={e => {
            if (pathname !== "/settings") (e.currentTarget as HTMLElement).style.background = "var(--surf-2)"
          }}
          onMouseLeave={e => {
            if (pathname !== "/settings") (e.currentTarget as HTMLElement).style.background = "transparent"
          }}
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
