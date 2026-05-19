'use client'

interface HudOverlayProps {
  width: number
  height: number
}

export function HudOverlay({ width, height }: HudOverlayProps) {
  if (width === 0 || height === 0) return null

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Horizontal midline (Frankfort plane approximation) */}
      <line
        x1={width * 0.1} y1={height * 0.38}
        x2={width * 0.9} y2={height * 0.38}
        stroke="rgba(79,172,254,0.4)" strokeWidth="1" strokeDasharray="4 3"
      />
      <circle cx={width * 0.1} cy={height * 0.38} r={3} fill="#4FACFE" />
      <circle cx={width * 0.9} cy={height * 0.38} r={3} fill="#4FACFE" />

      {/* Vertical midline */}
      <line
        x1={width * 0.5} y1={height * 0.05}
        x2={width * 0.5} y2={height * 0.95}
        stroke="rgba(79,172,254,0.25)" strokeWidth="1" strokeDasharray="4 3"
      />

      {/* Frankfort label */}
      <rect x={width * 0.5 - 36} y={height * 0.38 - 14} width={72} height={13} rx={3} fill="rgba(255,255,255,0.9)" />
      <text
        x={width * 0.5} y={height * 0.38 - 4}
        textAnchor="middle" fill="#4FACFE"
        fontSize="8" fontWeight="600" fontFamily="Inter, system-ui, sans-serif"
      >
        Plano Frankfort
      </text>
    </svg>
  )
}
