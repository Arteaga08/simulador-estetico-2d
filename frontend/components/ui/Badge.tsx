type BadgeVariant = "active" | "pending" | "completed" | "review" | "cancelled" | "brand"

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  active:    "bg-blue text-white",
  brand:     "text-white",
  pending:   "bg-indigo-muted text-indigo-dark",
  completed: "bg-success-bg text-green-700",
  review:    "bg-warning-bg text-yellow-700",
  cancelled: "bg-error-bg text-red-700",
}

export default function Badge({ variant = "pending", children, className = "" }: BadgeProps) {
  const isGradient = variant === "active" || variant === "brand"

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold
        ${isGradient ? "" : variantStyles[variant]}
        ${className}
      `}
      style={isGradient ? { background: "linear-gradient(135deg, #4FACFE 0%, #667EEA 100%)" } : undefined}
    >
      {children}
    </span>
  )
}
