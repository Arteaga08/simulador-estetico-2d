interface SliderControlProps {
  id: string
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  accent?: 'primary' | 'intensity'
}

function formatValue(v: number): string {
  if (v > 0) return `+${v}`
  if (v < 0) return `−${Math.abs(v)}`
  return '0'
}

export function SliderControl({
  id, label, min, max, step, value, onChange, disabled = false, accent = 'primary',
}: SliderControlProps) {
  const pct = ((value - min) / (max - min)) * 100

  const fillGradient = accent === 'intensity'
    ? 'linear-gradient(to right, #a78bfa, #667EEA)'
    : 'linear-gradient(to right, #4FACFE, #667EEA)'

  const valColor = accent === 'intensity' ? '#7C3AED' : '#4338CA'
  const thumbBorder = accent === 'intensity' ? '#a78bfa' : '#667EEA'

  return (
    <div className="mb-3.5">
      <div className="flex justify-between items-baseline mb-1.5">
        <label htmlFor={id} className="text-[0.73rem] text-[#374151] font-medium">
          {label}
        </label>
        <span
          style={{ color: valColor }}
          className="text-[0.7rem] font-bold"
          aria-live="polite"
        >
          {formatValue(value)}
        </span>
      </div>
      <div className="relative h-4 flex items-center">
        {/* Track background */}
        <div className="w-full h-1 rounded-full bg-[#E9D5FF] relative overflow-hidden">
          {/* Fill */}
          <div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{ width: `${pct}%`, background: fillGradient }}
          />
        </div>
        {/* Native range input (transparent overlay for interaction) */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={e => onChange(Number(e.target.value))}
          onKeyDown={e => {
            if (disabled) return
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
              e.preventDefault()
              onChange(Math.min(max, value + step))
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
              e.preventDefault()
              onChange(Math.max(min, value - step))
            }
          }}
          className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label={label}
        />
        {/* Custom thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white pointer-events-none"
          style={{
            left: `${pct}%`,
            border: `2px solid ${thumbBorder}`,
            boxShadow: '0 1px 4px rgba(102,126,234,0.3)',
          }}
        />
      </div>
    </div>
  )
}
