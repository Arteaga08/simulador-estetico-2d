import { type ButtonHTMLAttributes, forwardRef } from "react"

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "white"
type Size = "sm" | "md" | "lg" | "xl"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantStyles: Record<Variant, string> = {
  primary:   "bg-indigo text-white hover:bg-indigo-dark",
  secondary: "bg-indigo-light text-indigo-dark hover:bg-indigo-muted",
  outline:   "border border-indigo text-indigo hover:bg-indigo-muted bg-transparent",
  ghost:     "text-indigo hover:bg-indigo-muted bg-transparent",
  danger:    "bg-error-bg text-red-700 hover:bg-red-100",
  white:     "bg-white text-indigo hover:bg-indigo-muted",
}

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-[8px]",
  md: "h-10 px-4 text-[14px] rounded-[10px]",
  lg: "h-11 px-5 text-[15px] rounded-[12px]",
  xl: "h-12 px-6 text-[15px] rounded-[12px]",
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-2 font-semibold
          transition-colors duration-150 cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]} ${sizeStyles[size]} ${className}
        `}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"

export default Button
