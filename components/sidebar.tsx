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
      "flex h-full flex-col border-r bg-white bg-[#212121] border-[#383838] transition-all duration-300",
      isOpen ? "w-64" : "w-16"
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center border-[#383838]">
        <Link href="/" className={cn(
          "flex items-center gap-3 hover:bg-[#292929] transition-colors flex-1",
          isOpen ? "px-6" : "px-3 justify-center"
        )}>
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
            className="hover:bg-[#292929] px-3 h-full transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="relative flex-1 space-y-1 p-4">
        {!isOpen && (
          <button
            onClick={onToggle}
            className="flex hover:bg-gray-100 hover:bg-[#292929] items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>

        )}
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-50 bg-[#292929] text-primary-700 text-[#84ffc4]"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 text-gray-300 hover:bg-[#292929] hover:text-gray-100",
                !isOpen && "justify-center"
              )}
              title={!isOpen ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {isOpen && item.name}
            </Link>
          )
        })}
      </nav>

      {/* User Profile → Settings */}
      <div className="border-[#383838] p-4">
        <Link
          href="/settings"
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            pathname === "/settings" ? "bg-[#292929] text-[#84ffc4]" : "text-gray-300 hover:bg-[#292929] hover:text-gray-100",
            !isOpen && "justify-center"
          )}
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
            <div className="flex h-8 w-8 min-w-[2rem] items-center justify-center rounded-full bg-[#292929] text-[#84ffc4] flex-shrink-0">
              <span className="text-sm font-semibold">{userInitials}</span>
            </div>
          )}
          {isOpen && (
            <div className="flex-1 text-left overflow-hidden">
              <div className="text-sm text-gray-100 font-medium truncate">{userName}</div>
              <div className="text-xs text-gray-400">Settings</div>
            </div>
          )}
        </Link>
      </div>
    </div>
  )
}
