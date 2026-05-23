"use client";

import { useSimulator } from "./SimulatorContext";
import type { CanvasMode } from "./types";
import type { DetectionStatus } from "@/lib/canvas/useFaceLandmarks";
import { MANUAL_STEPS } from "./CanvasWorkspace";
import {
  MagnifyingGlassPlus,
  HandGrabbing,
  GridFour,
  Camera,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";

interface CanvasToolbarProps {
  onUploadPhoto: () => void;
  detectionStatus?: DetectionStatus;
  manualStep: number | null;
  manualReason?: 'detection-failed' | 'user-restart' | null;
  canRestartManual: boolean;
  onRestartManual: () => void;
}

const MODES: Array<{ id: CanvasMode; label: string }> = [
  { id: "original", label: "Original" },
  { id: "simulation", label: "Simulación" },
  { id: "split", label: "Split" },
];

const iconBtn = {
  base: {
    height: "26px",
    padding: "0 8px",
    borderRadius: "6px",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    border: "1px solid transparent",
    color: "#9CA3AF",
    background: "transparent",
    transition: "background 150ms var(--ease-out), color 150ms var(--ease-out)",
  } as React.CSSProperties,
};

function buildPill(
  status: DetectionStatus | undefined,
  manualStep: number | null,
  manualReason?: 'detection-failed' | 'user-restart' | null,
) {
  if (manualStep !== null) {
    const step = MANUAL_STEPS[manualStep];
    // Si entró a manual por fallo de detección, usar color ámbar para diferenciar
    const isAuto = manualReason === 'detection-failed';
    return {
      bg: isAuto ? "#FEF3C7" : "#DBEAFE",
      color: isAuto ? "#92400E" : "#1E40AF",
      dot: isAuto ? "#D97706" : "#2563EB",
      label: isAuto
        ? `Marca manual: ${step.label} (${manualStep + 1}/${MANUAL_STEPS.length})`
        : `Coloca: ${step.label} (${manualStep + 1}/${MANUAL_STEPS.length})`,
    };
  }
  if (!status || status === "idle") return null;
  if (status === "detecting")
    return {
      bg: "#FEF9C3",
      color: "#854D0E",
      dot: "#CA8A04",
      label: "Detectando…",
    };
  if (status === "detected")
    return {
      bg: "#DCFCE7",
      color: "#15803D",
      dot: "#16A34A",
      label: "Rostro detectado",
    };
  return {
    bg: "#FEE2E2",
    color: "#B91C1C",
    dot: "#DC2626",
    label: "Rostro no detectado",
  };
}

export function CanvasToolbar({
  onUploadPhoto,
  detectionStatus,
  manualStep,
  manualReason,
  canRestartManual,
  onRestartManual,
}: CanvasToolbarProps) {
  const {
    state,
    setCanvasMode,
    setHudVisible,
    setActiveTool,
    setBrushRadius,
    toggleLandmarks,
    setZoomScale,
  } = useSimulator();

  const pill = buildPill(detectionStatus, manualStep, manualReason);
  const showRestartButton = canRestartManual && manualStep === null;

  return (
    <div className="h-10 bg-white border-b border-border flex items-center px-3 gap-1.5 shrink-0">
      {/* View tools */}
      {[
        { Icon: MagnifyingGlassPlus, label: "Zoom", tool: "zoom" as const },
        { Icon: HandGrabbing, label: "Pan", tool: "pan" as const },
      ].map(({ Icon, label, tool }) => {
        const isActive = state.activeTool === tool;
        return (
          <button
            key={label}
            title={label}
            onClick={() =>
              setActiveTool(state.activeTool === tool ? "none" : tool)
            }
            style={{
              ...iconBtn.base,
              background: isActive ? "#EEF2FF" : "transparent",
              color: isActive ? "#4338CA" : "#9CA3AF",
              border: isActive ? "1px solid #C7D2FE" : "1px solid transparent",
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        );
      })}

      {/* Zoom slider */}
      {state.activeTool === "zoom" && (
        <div
          className="flex items-center gap-2 border border-border rounded-lg px-2.5"
          style={{ height: "26px" }}
        >
          <label className="text-[11px] font-semibold text-[#9CA3AF]">
            Zoom
          </label>
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.1}
            value={state.zoomScale || 1}
            onChange={(e) => setZoomScale(parseFloat(e.target.value))}
            className="w-20 accent-indigo-500"
          />
        </div>
      )}

      <div className="w-px bg-border mx-0.5" style={{ height: "16px" }} />

      {/* Mode toggle */}
      <div
        className="flex rounded-lg p-0.5 border border-border"
        style={{ background: "#F9FAFB" }}
      >
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setCanvasMode(mode.id)}
            className="px-2.5 rounded-md text-[12px] font-semibold"
            style={{
              height: "22px",
              background:
                state.canvasMode === mode.id ? "white" : "transparent",
              color: state.canvasMode === mode.id ? "#4338CA" : "#9CA3AF",
            }}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* HUD & Landmarks */}
      <button
        onClick={() => setHudVisible(!state.hudVisible)}
        title="HUD"
        style={{
          ...iconBtn.base,
          background: state.hudVisible ? "#EEF2FF" : "transparent",
          color: state.hudVisible ? "#4338CA" : "#9CA3AF",
          border: state.hudVisible ? "1px solid #C7D2FE" : "1px solid transparent",
        }}
      >
        <GridFour size={13} />
        HUD
      </button>

      <button
        onClick={toggleLandmarks}
        title="Puntos"
        style={{
          ...iconBtn.base,
          background: state.showLandmarks ? "#EEF2FF" : "transparent",
          color: state.showLandmarks ? "#4338CA" : "#9CA3AF",
          border: state.showLandmarks ? "1px solid #C7D2FE" : "1px solid transparent",
        }}
      >
        {state.showLandmarks ? <Eye size={13} /> : <EyeSlash size={13} />}
        Puntos
      </button>

      {/* Brush slider */}
      {state.activeTool === "broca" && (
        <div
          className="flex items-center gap-2 border border-border rounded-lg px-2.5"
          style={{ height: "26px" }}
        >
          <label className="text-[11px] font-semibold text-[#9CA3AF]">
            Pincel
          </label>
          <input
            type="range"
            min={0.03}
            max={0.18}
            step={0.005}
            value={state.brushRadius}
            onChange={(e) => setBrushRadius(parseFloat(e.target.value))}
            className="w-20 accent-indigo-500"
          />
        </div>
      )}

      {/* Pills & Actions */}
      {pill && (
        <span
          className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: pill.bg, color: pill.color }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: pill.dot }}
          />{" "}
          {pill.label}
        </span>
      )}

      {/* View indicator pill (frontal/perfil) */}
      {state.currentView && detectionStatus === "detected" && (
        <span
          className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: state.currentView === "perfil" ? "#EDE9FE" : "#E0F2FE",
            color: state.currentView === "perfil" ? "#6D28D9" : "#0369A1",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: state.currentView === "perfil" ? "#7C3AED" : "#0284C7" }}
          />
          {state.currentView === "perfil" ? "Vista perfil" : "Vista frontal"}
        </span>
      )}

      {/* Recolocar puntos */}
      {showRestartButton && (
        <button
          onClick={onRestartManual}
          title="Recolocar los puntos de referencia de la nariz"
          style={{
            ...iconBtn.base,
            background: "white",
            border: "1px solid #E5E7EB",
            color: "#6B7280",
            fontSize: 11,
            height: 22,
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 13, lineHeight: 1 }}>↻</span>
          Recolocar puntos
        </button>
      )}

      <div className="ml-auto">
        <button
          onClick={onUploadPhoto}
          className="flex items-center gap-1.5 px-2.5 rounded-md text-[13px] font-medium border border-border bg-white text-text-muted"
          style={{ height: "26px" }}
        >
          <Camera size={13} /> Subir foto
        </button>
      </div>
    </div>
  );
}
