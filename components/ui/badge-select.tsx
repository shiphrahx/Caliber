"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface BadgeSelectOption {
  value: string
  label: string
  className?: string
  style?: React.CSSProperties
}

interface BadgeSelectProps {
  value: string
  options: BadgeSelectOption[]
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function BadgeSelect({
  value,
  options,
  onValueChange,
  placeholder = "Select...",
  className,
}: BadgeSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0, width: 0 })
  const containerRef = React.useRef<HTMLDivElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Calculate dropdown position
  React.useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <>
      <div ref={containerRef} className={cn("relative", className)}>
        {/* Badge Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "inline-flex items-center justify-center rounded-md px-3 py-1 text-[13px] font-medium transition-colors cursor-pointer",
            "hover:opacity-80",
            selectedOption?.className || "bg-gray-100 text-gray-700"
          )}
          style={selectedOption?.style}
        >
          {selectedOption?.label || placeholder}
        </button>
      </div>

      {/* Dropdown Menu - Rendered via Portal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed border z-[9999] min-w-[120px] rounded-md border-[#383838] bg-[#262626] shadow-lg"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            minWidth: `${Math.max(dropdownPosition.width, 120)}px`,
          }}
        >
          <div className="p-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onValueChange(option.value)
                  setIsOpen(false)
                }}
                className={cn(
                  "relative flex w-full items-center rounded-sm px-2 py-1.5 text-[13px] outline-none cursor-pointer",
                  "hover:bg-gray-100 hover:bg-[#292929]",
                  "transition-colors"
                )}
              >
                <span className={cn("flex-1", option.className?.includes("text-") && option.className)}>
                  {option.label}
                </span>
                {value === option.value && (
                  <Check className="ml-2 h-3 w-3 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
