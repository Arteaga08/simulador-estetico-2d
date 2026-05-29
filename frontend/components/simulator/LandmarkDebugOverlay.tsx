"use client";

import type { NoseLandmarks } from "@/lib/canvas/useFaceLandmarks";

// Anatomical zone → MediaPipe candidate indices to render.
// The currently-used production index per zone is marked with ★ in the legend
// and given a thicker white halo on canvas so we can spot it instantly.
interface Zone {
  id: string;
  label: string;
  color: string;
  candidates: number[];
  productionIndex: number;
}

const ZONES: Zone[] = [
  {
    id: "radix",
    label: "Radix",
    color: "#F97316",
    candidates: [6, 8, 168, 197],
    productionIndex: 6,
  },
  {
    id: "midDorsum",
    label: "Supratip",
    color: "#A855F7",
    candidates: [4, 5, 195, 197],
    productionIndex: 4,
  },
  {
    id: "tip",
    label: "Punta",
    color: "#EF4444",
    candidates: [1, 4, 19],
    productionIndex: 1,
  },
  {
    id: "subnasal",
    label: "Subnasal",
    color: "#10B981",
    candidates: [2, 94, 164],
    productionIndex: 2,
  },
  {
    id: "alarL",
    label: "Ala izq.",
    color: "#3B82F6",
    candidates: [49, 64, 98, 102, 240],
    productionIndex: 102,
  },
  {
    id: "alarR",
    label: "Ala der.",
    color: "#06B6D4",
    candidates: [279, 294, 327, 331, 460],
    productionIndex: 331,
  },
];

// Lookup: index → zone, for color/legend assignment.
const INDEX_TO_ZONE = new Map<number, Zone>();
for (const z of ZONES) {
  for (const idx of z.candidates) {
    // First zone wins (handles shared indices like 4 between midDorsum & tip,
    // or 197 between radix & midDorsum — they appear once with the first
    // zone's color, which is fine for visual identification).
    if (!INDEX_TO_ZONE.has(idx)) INDEX_TO_ZONE.set(idx, z);
  }
}

interface Props {
  landmarks: NoseLandmarks;
  canvasWidth: number;
  canvasHeight: number;
}

interface PlacedLabel {
  idx: number;
  zone: Zone;
  dot: { x: number; y: number };
  label: { x: number; y: number };
  isProduction: boolean;
}

/** Compute label positions using a radial layout from the nose centroid, with
 *  vertical de-collision: labels at the same angular sector stack vertically. */
function layoutLabels(
  points: Array<{ idx: number; zone: Zone; p: { x: number; y: number } }>,
  radius: number,
  rowHeight: number,
): PlacedLabel[] {
  if (points.length === 0) return [];

  // Centroid of all candidate dots — used as the "push outward" anchor.
  let cx = 0;
  let cy = 0;
  for (const { p } of points) {
    cx += p.x;
    cy += p.y;
  }
  cx /= points.length;
  cy /= points.length;

  // Initial radial placement.
  const placed: PlacedLabel[] = points.map(({ idx, zone, p }) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    return {
      idx,
      zone,
      dot: p,
      label: { x: p.x + ux * radius, y: p.y + uy * radius },
      isProduction: idx === zone.productionIndex,
    };
  });

  // Split into left vs right column based on horizontal direction, then stack
  // vertically inside each column to avoid overlap.
  const left = placed.filter((l) => l.label.x < cx).sort((a, b) => a.label.y - b.label.y);
  const right = placed.filter((l) => l.label.x >= cx).sort((a, b) => a.label.y - b.label.y);

  const decollide = (col: PlacedLabel[]) => {
    for (let i = 1; i < col.length; i++) {
      const prev = col[i - 1].label.y;
      if (col[i].label.y < prev + rowHeight) {
        col[i].label.y = prev + rowHeight;
      }
    }
  };
  decollide(left);
  decollide(right);

  return [...left, ...right];
}

export function LandmarkDebugOverlay({
  landmarks,
  canvasWidth,
  canvasHeight,
}: Props) {
  if (canvasWidth <= 0 || canvasHeight <= 0) return null;
  const candidates = landmarks.debugCandidates;

  // Manual landmark placement (or detection failure) → no raw MediaPipe indices.
  // Show a clear notice instead of silently rendering nothing.
  if (!candidates) {
    const refSize = Math.min(canvasWidth, canvasHeight);
    const fontSize = Math.max(13, refSize * 0.02);
    return (
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ pointerEvents: "none" }}
      >
        <rect
          x={canvasWidth * 0.5 - fontSize * 18}
          y={canvasHeight * 0.05}
          width={fontSize * 36}
          height={fontSize * 3.5}
          rx={fontSize * 0.4}
          fill="rgba(15, 23, 42, 0.88)"
          stroke="#F59E0B"
          strokeWidth={1.5}
        />
        <text
          x={canvasWidth * 0.5}
          y={canvasHeight * 0.05 + fontSize * 1.6}
          fontSize={fontSize}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontWeight={700}
          textAnchor="middle"
          fill="#F59E0B"
        >
          Debug landmarks no disponibles
        </text>
        <text
          x={canvasWidth * 0.5}
          y={canvasHeight * 0.05 + fontSize * 2.85}
          fontSize={fontSize * 0.78}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontWeight={500}
          textAnchor="middle"
          fill="#E5E7EB"
        >
          MediaPipe no detectó el rostro · landmarks colocados manualmente
        </text>
      </svg>
    );
  }

  const refSize = Math.min(canvasWidth, canvasHeight);
  const dotR = Math.max(3.5, refSize * 0.006);
  const stroke = Math.max(1.1, refSize * 0.0016);
  const fontSize = Math.max(11, refSize * 0.016);
  const leaderRadius = refSize * 0.18; // how far out labels are pushed
  const rowHeight = fontSize * 1.25;

  // Flatten candidates into one list (each index appears once, via first zone).
  const points: Array<{ idx: number; zone: Zone; p: { x: number; y: number } }> = [];
  for (const [idxStr, p] of Object.entries(candidates)) {
    const idx = Number(idxStr);
    const zone = INDEX_TO_ZONE.get(idx);
    if (!zone) continue;
    points.push({ idx, zone, p });
  }

  const placed = layoutLabels(points, leaderRadius, rowHeight);

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ pointerEvents: "none" }}
    >
      {/* Leader lines — drawn first so dots and labels sit on top */}
      {placed.map((l) => (
        <line
          key={`leader-${l.idx}`}
          x1={l.dot.x}
          y1={l.dot.y}
          x2={l.label.x}
          y2={l.label.y}
          stroke={l.zone.color}
          strokeWidth={stroke}
          opacity={0.55}
        />
      ))}

      {/* Dots on the face */}
      {placed.map((l) => (
        <circle
          key={`dot-${l.idx}`}
          cx={l.dot.x}
          cy={l.dot.y}
          r={dotR}
          fill={l.zone.color}
          stroke={l.isProduction ? "#FFFFFF" : "rgba(0,0,0,0.7)"}
          strokeWidth={l.isProduction ? stroke * 2.5 : stroke}
          opacity={0.95}
        />
      ))}

      {/* Labels at the end of the leader lines */}
      {placed.map((l) => {
        const labelText = l.isProduction ? `★lm[${l.idx}]` : `lm[${l.idx}]`;
        const isLeftSide = l.label.x < (canvasWidth / 2);
        const anchor: "start" | "end" = isLeftSide ? "end" : "start";
        const padX = dotR * 1.2;
        const tx = l.label.x + (isLeftSide ? -padX : padX);
        return (
          <text
            key={`label-${l.idx}`}
            x={tx}
            y={l.label.y + fontSize * 0.32}
            fontSize={fontSize}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontWeight={l.isProduction ? 800 : 600}
            textAnchor={anchor}
            fill={l.zone.color}
            stroke="rgba(0,0,0,0.9)"
            strokeWidth={fontSize * 0.22}
            paintOrder="stroke"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {labelText}
          </text>
        );
      })}

      {/* Legend (bottom-left) */}
      <g>
        {ZONES.map((zone, i) => {
          const y = canvasHeight - 14 - (ZONES.length - 1 - i) * (fontSize * 1.45);
          return (
            <g key={`legend-${zone.id}`}>
              <circle
                cx={14}
                cy={y - fontSize * 0.32}
                r={dotR}
                fill={zone.color}
                stroke="rgba(0,0,0,0.6)"
                strokeWidth={stroke}
              />
              <text
                x={26}
                y={y}
                fontSize={fontSize * 0.92}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontWeight={700}
                fill="#FFFFFF"
                stroke="rgba(0,0,0,0.9)"
                strokeWidth={fontSize * 0.22}
                paintOrder="stroke"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {zone.label} · ★lm[{zone.productionIndex}]
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
