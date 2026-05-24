import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "text-[13px] text-gray-900 font-semibold shadow-sm hover:opacity-90 transition-opacity [background:linear-gradient(90deg,hsl(174,100%,50%)_0%,hsl(142,100%,47%)_100%)]",
        outline:
          "text-sm border border-[#383838] bg-[#212121] hover:bg-[#292929] text-gray-200",
        destructive:
          "text-sm bg-red-700 text-white shadow-sm hover:bg-red-600",
        secondary:
          "text-sm bg-[#292929] text-gray-200 shadow-sm hover:bg-[#333333]",
        ghost: "text-sm hover:bg-[#292929]",
        link: "text-sm text-primary-dark-400 underline-offset-4 hover:underline cursor-pointer",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
