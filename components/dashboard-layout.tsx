"use client"

import { useState } from "react"
import { Sidebar } from "./sidebar"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className="relative flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
