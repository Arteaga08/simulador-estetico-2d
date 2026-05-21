"use client";

import type { NoseLandmarks } from "@/lib/canvas/useFaceLandmarks";

export type LandmarkKey =
  | "bridge"
  | "bridgeMid"
  | "tip"
  | "nostrilL"
  | "nostrilR"
  | "base";

interface Props {
  landmarks: NoseLandmarks;
  canvasWidth: number;
  canvasHeight: number;
  manualStep: number | null;
  placedSteps: number; // how many manual steps have been completed (for guided mode rendering)
  onLandmarkPointerDown: (
    key: LandmarkKey,
    e: React.PointerEvent<SVGCircleElement>,
  ) => void;
}

const COLORS = {
  stroke: "#4338CA",
  fill: "#FFFFFF",
  line: "#667EEA",
};

const ORDER: LandmarkKey[] = [
  "bridge",
  "bridgeMid",
  "tip",
  "nostrilL",
  "nostrilR",
  "base",
];

// Anatomical label + side offset for verification. The offset (dx, dy) is
// expressed in dot-radius units and pushes the text away from the face so the
// landmark itself stays visually unobstructed.
const LABELS: Record<
  LandmarkKey,
  { text: string; dx: number; dy: number; anchor: "start" | "end" | "middle" }
> = {
  bridge: { text: "Radix (lm6)", dx: 1.8, dy: -0.4, anchor: "start" },
  bridgeMid: { text: "Supratip (lm4)", dx: 1.8, dy: 0.4, anchor: "start" },
  tip: { text: "Tip (lm1)", dx: 1.8, dy: 0.4, anchor: "start" },
  nostrilL: { text: "AlarL (lm102)", dx: -1.8, dy: 0.4, anchor: "end" },
  nostrilR: { text: "AlarR (lm331)", dx: 1.8, dy: 0.4, anchor: "start" },
  base: { text: "Subnasal (lm2)", dx: 1.8, dy: 1.0, anchor: "start" },
};

export function NoseLandmarksOverlay({
  landmarks,
  canvasWidth,
  canvasHeight,
  manualStep,
  placedSteps,
  onLandmarkPointerDown,
}: Props) {
  if (canvasWidth <= 0 || canvasHeight <= 0) return null;

  // In manual mode, only show landmarks that have been placed (index < placedSteps)
  // In auto/post-manual mode, show all six
  const isManualGuided = manualStep !== null;
  const visibleKeys: LandmarkKey[] = isManualGuided
    ? ORDER.slice(0, placedSteps)
    : ORDER;

  const has = (key: LandmarkKey) => visibleKeys.includes(key);

  // Stroke scales with canvas size so dots don't disappear on huge images
  const refSize = Math.min(canvasWidth, canvasHeight);
  const dotR = Math.max(6, refSize * 0.012);
  const stroke = Math.max(1.5, refSize * 0.0025);
  const dash = `${refSize * 0.008} ${refSize * 0.005}`;
  const fontSize = Math.max(11, refSize * 0.018);

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ pointerEvents: "none" }}
    >
      {/* Connecting lines — only when both endpoints are placed */}
      {has("bridge") && has("tip") && (
        <line
          x1={landmarks.bridge.x}
          y1={landmarks.bridge.y}
          x2={landmarks.tip.x}
          y2={landmarks.tip.y}
          stroke={COLORS.line}
          strokeWidth={stroke}
          strokeDasharray={dash}
          opacity="0.45"
        />
      )}
      {has("nostrilL") && has("nostrilR") && (
        <line
          x1={landmarks.nostrilL.x}
          y1={landmarks.nostrilL.y}
          x2={landmarks.nostrilR.x}
          y2={landmarks.nostrilR.y}
          stroke={COLORS.line}
          strokeWidth={stroke}
          strokeDasharray={dash}
          opacity="0.45"
        />
      )}

      {/* Draggable landmark dots + anatomical labels (for verification) */}
      {ORDER.map((key) => {
        if (!has(key)) return null;
        const p = landmarks[key];
        const label = LABELS[key];
        const tx = p.x + label.dx * dotR;
        const ty = p.y + label.dy * dotR;
        return (
          <g key={key}>
            <circle
              cx={p.x}
              cy={p.y}
              r={dotR + stroke * 1.5}
              fill="rgba(67, 56, 202, 0.10)"
              style={{ pointerEvents: "none" }}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={dotR}
              fill={COLORS.fill}
              stroke={COLORS.stroke}
              strokeWidth={stroke}
              style={{ cursor: "grab", pointerEvents: "auto" }}
              onPointerDown={(e) => onLandmarkPointerDown(key, e)}
            />
            <text
              x={tx}
              y={ty}
              fontSize={fontSize}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontWeight={600}
              textAnchor={label.anchor}
              fill="#FFFFFF"
              stroke="rgba(0,0,0,0.75)"
              strokeWidth={fontSize * 0.25}
              paintOrder="stroke"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {label.text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
