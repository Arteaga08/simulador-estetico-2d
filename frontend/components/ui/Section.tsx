import { type HTMLAttributes } from "react"

interface SectionProps extends HTMLAttributes<HTMLElement> {
  dark?: boolean
  alt?: boolean
  noPad?: boolean
  fullBleed?: boolean
}

export default function Section({
  dark,
  alt,
  noPad,
  fullBleed,
  className = "",
  children,
  ...props
}: SectionProps) {
  const bg = dark
    ? "bg-blue-dark"
    : alt
    ? "bg-bg-surface-alt"
    : "bg-bg-surface"

  return (
    <section
      className={`${bg} ${noPad ? "" : "py-24"} ${className}`}
      {...props}
    >
      {fullBleed ? children : (
        <div className="container-landing">{children}</div>
      )}
    </section>
  )
}
