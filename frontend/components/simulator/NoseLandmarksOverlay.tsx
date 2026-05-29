"use client";

import type { NoseLandmarks } from "@/lib/canvas/useFaceLandmarks";

export type LandmarkKey =
  | "bridge"
  | "bridgeMid"
  | "rhinion"
  | "tip"
  | "subtip"
  | "nostrilL"
  | "nostrilR"
  | "base";

interface Props {
  landmarks: NoseLandmarks;
  canvasWidth: number;
  canvasHeight: number;
  manualStep: number | null;
  placedKeys: LandmarkKey[]; // keys that have been placed so far in guided mode
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
  "rhinion",
  "tip",
  "subtip",
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
  bridge: { text: "Radix", dx: 1.8, dy: -0.4, anchor: "start" },
  bridgeMid: { text: "Supratip", dx: 1.8, dy: 0.4, anchor: "start" },
  rhinion: { text: "Rhinion (K)", dx: 1.8, dy: 0.4, anchor: "start" },
  tip: { text: "Tip", dx: 1.8, dy: 0.4, anchor: "start" },
  subtip: { text: "Sub-tip", dx: 1.8, dy: 0.4, anchor: "start" },
  nostrilL: { text: "Alar-facial", dx: -1.8, dy: 0.4, anchor: "end" },
  nostrilR: { text: "Alar-facial", dx: 1.8, dy: 0.4, anchor: "start" },
  base: { text: "Subnasal", dx: 1.8, dy: 1.0, anchor: "start" },
};

export function NoseLandmarksOverlay({
  landmarks,
  canvasWidth,
  canvasHeight,
  manualStep,
  placedKeys,
  onLandmarkPointerDown,
}: Props) {
  if (canvasWidth <= 0 || canvasHeight <= 0) return null;

  // In manual mode, only show the keys that have actually been placed.
  // In auto/post-manual mode, show all landmarks.
  const isManualGuided = manualStep !== null;
  const baseKeys: LandmarkKey[] = isManualGuided ? placedKeys : ORDER;

  // En perfil, ocultar el alar NO visible (el del lado opuesto a cámara).
  // visibleAlar viene de MediaPipe via análisis Z. 'both' = vista frontal.
  const visibleAlar = landmarks.visibleAlar ?? 'both';
  const visibleKeys: LandmarkKey[] = baseKeys.filter(k => {
    if (visibleAlar === 'L' && k === 'nostrilR') return false;
    if (visibleAlar === 'R' && k === 'nostrilL') return false;
    return true;
  });

  const has = (key: LandmarkKey) => visibleKeys.includes(key);

  // Stroke scales with canvas size so dots don't disappear on huge images
  const refSize = Math.min(canvasWidth, canvasHeight);
  const dotR = Math.max(8, refSize * 0.014);
  const stroke = Math.max(2, refSize * 0.003);
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

      {/* Algorithm-target markers (read-only feedback for surgeon verification).
          Constants mirror surgicalLimits.ts (gibaApexSrc at 55% bridge→bridgeMid,
          columella ghost at 55% base→tip). Keep in sync if those values change. */}
      {!isManualGuided && has("bridge") && has("bridgeMid") && (() => {
        const gx = landmarks.bridge.x + 0.55 * (landmarks.bridgeMid.x - landmarks.bridge.x);
        const gy = landmarks.bridge.y + 0.55 * (landmarks.bridgeMid.y - landmarks.bridge.y);
        return (
          <g>
            <circle
              cx={gx}
              cy={gy}
              r={dotR * 0.65}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={stroke}
              strokeDasharray={`${refSize * 0.005} ${refSize * 0.004}`}
            />
            <text
              x={gx + dotR * 1.4}
              y={gy - dotR * 0.4}
              fontSize={fontSize * 0.85}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontWeight={700}
              textAnchor="start"
              fill="#F59E0B"
              stroke="rgba(0,0,0,0.75)"
              strokeWidth={fontSize * 0.18}
              paintOrder="stroke"
              style={{ pointerEvents: "none", userSelect: "none", letterSpacing: 0.5 }}
            >
              GIBA ÁPEX
            </text>
          </g>
        );
      })()}

      {!isManualGuided && has("base") && has("tip") && (() => {
        const cx = landmarks.base.x + 0.55 * (landmarks.tip.x - landmarks.base.x);
        const cy = landmarks.base.y + 0.55 * (landmarks.tip.y - landmarks.base.y);
        return (
          <g>
            <circle
              cx={cx}
              cy={cy}
              r={dotR * 0.65}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={stroke}
              strokeDasharray={`${refSize * 0.005} ${refSize * 0.004}`}
            />
            <text
              x={cx + dotR * 1.4}
              y={cy + dotR * 0.4}
              fontSize={fontSize * 0.85}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontWeight={700}
              textAnchor="start"
              fill="#F59E0B"
              stroke="rgba(0,0,0,0.75)"
              strokeWidth={fontSize * 0.18}
              paintOrder="stroke"
              style={{ pointerEvents: "none", userSelect: "none", letterSpacing: 0.5 }}
            >
              COLUMELA
            </text>
          </g>
        );
      })()}

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
