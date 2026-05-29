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
  PersonSimple,
  Ruler,
  Target,
  Question,
} from "@phosphor-icons/react";
interface CanvasToolbarProps {
  onUploadPhoto: () => void;
  onToggleBackground: () => void;
  detectionStatus?: DetectionStatus;
  manualStep: number | null;
  manualReason?: "detection-failed" | "user-restart" | null;
  canRestartManual: boolean;
  onRestartManual: () => void;
}

const MODES: Array<{ id: CanvasMode; label: string }> = [
  { id: "original", label: "Original" },
  { id: "simulation", label: "Simulación" },
  { id: "split", label: "Split" },
];

// ─── Tokens ──────────────────────────────────────────────────────────────────
const BTN_HEIGHT = 30;

const labeledBtn: React.CSSProperties = {
  height: BTN_HEIGHT,
  padding: "0 10px",
  borderRadius: 7,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12.5,
  fontWeight: 500,
  cursor: "pointer",
  border: "1px solid transparent",
  color: "#6B7280",
  background: "transparent",
  transition:
    "background 160ms ease, color 160ms ease, border-color 160ms ease",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

function toggleStyles(active: boolean, disabled = false): React.CSSProperties {
  return {
    background: active ? "#EEF2FF" : "transparent",
    color: active ? "#4338CA" : "#6B7280",
    borderColor: active ? "#C7D2FE" : "transparent",
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

const Divider = () => (
  <div
    aria-hidden="true"
    style={{
      width: 1,
      height: 20,
      background: "#E5E7EB",
      flexShrink: 0,
      margin: "0 6px",
    }}
  />
);

// Wraps a related group of toggles inside a subtle card so the user can
// see at a glance that they belong together (guías, comparación, etc.).
const ToolGroup = ({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) => (
  <div
    className="flex items-center"
    style={{
      gap: 2,
      padding: 2,
      background: "#F9FAFB",
      border: "1px solid #E5E7EB",
      borderRadius: 9,
      flexShrink: 0,
    }}
    aria-label={label}
    role={label ? "group" : undefined}
  >
    {children}
  </div>
);

function buildPill(
  status: DetectionStatus | undefined,
  manualStep: number | null,
  manualReason?: "detection-failed" | "user-restart" | null,
) {
  if (manualStep !== null) {
    const step = MANUAL_STEPS[manualStep];
    const isAuto = manualReason === "detection-failed";
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
  onToggleBackground,
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
    setFacialGridVisible,
    setDebugLandmarksVisible,
    setPhotoGuideOpen,
  } = useSimulator();

  const pill = buildPill(detectionStatus, manualStep, manualReason);
  const showRestartButton = canRestartManual && manualStep === null;
  const bgDisabled = !state.imageUrl || state.backgroundProcessing;

  return (
    <div
      className="bg-white border-b border-border flex items-center px-4 gap-2 shrink-0"
      style={{ height: 52 }}
    >
      {/* ── Viewport tools (Zoom, Pan) ─────────────────────── */}
      {[
        { Icon: MagnifyingGlassPlus, label: "Zoom", tool: "zoom" as const },
        { Icon: HandGrabbing, label: "Pan", tool: "pan" as const },
      ].map(({ Icon, label, tool }) => {
        const isActive = state.activeTool === tool;
        return (
          <button
            key={label}
            title={`${label} (alterna haciendo clic de nuevo)`}
            onClick={() =>
              setActiveTool(state.activeTool === tool ? "none" : tool)
            }
            style={{ ...labeledBtn, ...toggleStyles(isActive) }}
          >
            <Icon size={15} weight={isActive ? "fill" : "regular"} />
            {label}
          </button>
        );
      })}

      {state.activeTool === "zoom" && (
        <div
          className="flex items-center gap-2 border border-border rounded-lg px-3"
          style={{ height: BTN_HEIGHT, background: "#F9FAFB" }}
        >
          <label className="text-[11px] font-semibold text-text-muted">
            Zoom
          </label>
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.1}
            value={state.zoomScale || 1}
            onChange={(e) => setZoomScale(parseFloat(e.target.value))}
            className="w-24 accent-indigo-500"
          />
        </div>
      )}

      <Divider />

      {/* ── Mode segmented control ─────────────────────────── */}
      <div
        className="flex rounded-lg p-0.5 border border-border"
        style={{ background: "#F9FAFB", flexShrink: 0 }}
        role="radiogroup"
        aria-label="Modo de visualización"
      >
        {MODES.map((mode) => {
          const selected = state.canvasMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setCanvasMode(mode.id)}
              role="radio"
              aria-checked={selected}
              className="px-3 rounded-md text-[12.5px] font-semibold"
              style={{
                height: 26,
                background: selected ? "white" : "transparent",
                color: selected ? "#4338CA" : "#6B7280",
                boxShadow: selected
                  ? "0 1px 2px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(199, 210, 254, 0.6)"
                  : undefined,
                transition: "background 160ms ease, color 160ms ease",
              }}
            >
              {mode.label}
            </button>
          );
        })}
      </div>

      <Divider />

      {/* ── Guías (overlays clínicos) ──────────────────────── */}
      <ToolGroup label="Guías visuales">
        <button
          onClick={() => setHudVisible(!state.hudVisible)}
          title="HUD: plano Frankfort y línea media (ayuda para validar la inclinación de la foto)"
          style={{
            ...labeledBtn,
            height: 26,
            padding: "0 9px",
            ...toggleStyles(state.hudVisible),
          }}
        >
          <GridFour size={14} weight={state.hudVisible ? "fill" : "regular"} />
          HUD
        </button>
        <button
          onClick={toggleLandmarks}
          title={
            state.showLandmarks
              ? "Ocultar puntos de referencia de la nariz"
              : "Mostrar puntos de referencia de la nariz"
          }
          style={{
            ...labeledBtn,
            height: 26,
            padding: "0 9px",
            ...toggleStyles(state.showLandmarks),
          }}
        >
          {state.showLandmarks ? <Eye size={14} /> : <EyeSlash size={14} />}
          Puntos
        </button>
        <button
          onClick={() => setFacialGridVisible(!state.facialGridVisible)}
          title="Canon facial: cuadrícula de tercios y quintos para justificar proporciones"
          style={{
            ...labeledBtn,
            height: 26,
            padding: "0 9px",
            ...toggleStyles(state.facialGridVisible),
          }}
        >
          <Ruler
            size={14}
            weight={state.facialGridVisible ? "fill" : "regular"}
          />
          Canon
        </button>
        {process.env.NODE_ENV !== "production" && (
          <button
            onClick={() =>
              setDebugLandmarksVisible(!state.debugLandmarksVisible)
            }
            title="Debug · candidatos MediaPipe (lm[N]) sobre la cara"
            style={{
              ...labeledBtn,
              height: 26,
              padding: "0 9px",
              ...toggleStyles(state.debugLandmarksVisible),
            }}
          >
            <Target
              size={14}
              weight={state.debugLandmarksVisible ? "fill" : "regular"}
            />
            Debug
          </button>
        )}
      </ToolGroup>

      {/* ── Brush slider (contextual) ──────────────────────── */}
      {state.activeTool === "broca" && (
        <div
          className="flex items-center gap-2 border border-border rounded-lg px-3"
          style={{ height: BTN_HEIGHT, background: "#F9FAFB" }}
        >
          <label className="text-[11px] font-semibold text-text-muted">
            Pincel
          </label>
          <input
            type="range"
            min={0.03}
            max={0.18}
            step={0.005}
            value={state.brushRadius}
            onChange={(e) => setBrushRadius(parseFloat(e.target.value))}
            className="w-24 accent-indigo-500"
          />
        </div>
      )}

      {/* ── Estado del análisis (siempre visible tras Guías) ── */}
      {pill && (
        <span
          className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
          style={{ background: pill.bg, color: pill.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: pill.dot }} />
          {pill.label}
        </span>
      )}

      {state.currentView && detectionStatus === "detected" && (
        <span
          className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
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

      {showRestartButton && (
        <button
          onClick={onRestartManual}
          title="Recolocar los puntos de referencia de la nariz"
          className="whitespace-nowrap shrink-0"
          style={{
            ...labeledBtn,
            height: 26,
            padding: "0 10px",
            background: "white",
            border: "1px solid #E5E7EB",
            color: "#6B7280",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 13, lineHeight: 1 }}>↻</span>
          Recolocar puntos
        </button>
      )}

      {/* Spacer — empuja acciones de imagen a la derecha */}
      <div className="flex-1" />

      {/* ── Right-aligned actions ──────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleBackground}
          disabled={bgDisabled}
          title={
            state.backgroundProcessing
              ? "Procesando…"
              : state.backgroundRemoved
                ? "Restaurar fondo original"
                : "Aislar al sujeto y reemplazar fondo por negro"
          }
          style={{
            ...labeledBtn,
            ...toggleStyles(state.backgroundRemoved, bgDisabled),
          }}
        >
          <PersonSimple
            size={15}
            weight={state.backgroundRemoved ? "fill" : "regular"}
          />
          {state.backgroundProcessing
            ? "Procesando…"
            : state.backgroundRemoved
              ? "Fondo aislado"
              : "Sin fondo"}
        </button>

        <button
          onClick={() => setPhotoGuideOpen(true)}
          title="Cómo tomar una buena foto (protocolo fotográfico)"
          style={labeledBtn}
        >
          <Question size={15} />
          Ayuda
        </button>

        <button
          onClick={onUploadPhoto}
          className="flex items-center gap-1.5 px-3 rounded-md text-[13px] font-semibold whitespace-nowrap"
          style={{
            height: BTN_HEIGHT,
            background: "#4F46E5",
            color: "white",
            border: "1px solid #4338CA",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
            transition: "background 160ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#4338CA";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#4F46E5";
          }}
        >
          <Camera size={14} weight="fill" /> Subir foto
        </button>
      </div>
    </div>
  );
}
