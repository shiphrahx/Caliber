import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <div className="has-[:focus-visible]:[background:linear-gradient(90deg,rgb(0,255,229)_0%,rgb(0,240,88)_100%)] has-[:disabled]:opacity-50 bg-[#383838] rounded-md p-[1.5px] w-full">
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-[5px] bg-[#262626] px-3 py-2 text-sm text-gray-100 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none disabled:cursor-not-allowed [&[type=date]]:pr-2",
            className
          )}
          ref={ref}
          suppressHydrationWarning
          {...props}
        />
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
