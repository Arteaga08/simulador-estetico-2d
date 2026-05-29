"use client";

interface FacialGridOverlayProps {
  width: number;
  height: number;
}

const STROKE = "rgba(99,102,241,0.28)";
const LABEL_FILL = "#6366F1";

export function FacialGridOverlay({ width, height }: FacialGridOverlayProps) {
  if (width === 0 || height === 0) return null;

  // Regla de los tercios (3 zonas verticales): trichion, glabela, subnasal, mentón
  const thirds = [1 / 3, 2 / 3];
  // Regla de los quintos (5 zonas horizontales): líneas a 1/5, 2/5, 3/5, 4/5
  const fifths = [1 / 5, 2 / 5, 3 / 5, 4 / 5];

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
    >
      {thirds.map((t, i) => (
        <g key={`h-${i}`}>
          <line
            x1={width * 0.04}
            y1={height * t}
            x2={width * 0.96}
            y2={height * t}
            stroke={STROKE}
            strokeWidth={1}
            strokeDasharray="4 6"
          />
          <text
            x={width * 0.05}
            y={height * t - 4}
            fill={LABEL_FILL}
            fontSize={9}
            fontWeight={600}
            opacity={0.55}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {i === 0 ? "⅓" : "⅔"}
          </text>
        </g>
      ))}

      {fifths.map((f, i) => (
        <g key={`v-${i}`}>
          <line
            x1={width * f}
            y1={height * 0.04}
            x2={width * f}
            y2={height * 0.96}
            stroke={STROKE}
            strokeWidth={1}
            strokeDasharray="4 6"
          />
          <text
            x={width * f + 3}
            y={height * 0.05}
            fill={LABEL_FILL}
            fontSize={9}
            fontWeight={600}
            opacity={0.45}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {`${i + 1}/5`}
          </text>
        </g>
      ))}
    </svg>
  );
}
