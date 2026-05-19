import { type InputHTMLAttributes, forwardRef } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  label?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, label, hint, className = "", id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-[13px] font-semibold text-text-primary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`
            h-11 w-full px-3.5 rounded-[12px] text-[14px] text-text-primary
            bg-white outline-none transition-shadow duration-150
            placeholder:text-text-placeholder
            ${error
              ? "border-[1.5px] border-error shadow-none focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]"
              : "border-[1.5px] border-border focus:border-indigo focus:shadow-[0_0_0_3px_rgba(102,126,234,0.12)]"
            }
            ${className}
          `}
          {...props}
        />
        {hint && (
          <span className={`text-[12px] ${error ? "text-error" : "text-text-muted"}`}>
            {hint}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

export default Input
