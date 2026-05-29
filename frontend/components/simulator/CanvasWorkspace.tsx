"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useSimulator } from "./SimulatorContext";
import { useCanvas } from "@/lib/canvas/useCanvas";
import { useFaceLandmarks, RHINION_T, SUBTIP_T } from "@/lib/canvas/useFaceLandmarks";
import type {
  NoseLandmarks,
  DetectionStatus,
} from "@/lib/canvas/useFaceLandmarks";
import { useRhinoplastyEngine } from "@/hooks/useRhinoplastyEngine";
import { useBackgroundRemoval } from "@/lib/canvas/useBackgroundRemoval";
import { CanvasToolbar } from "./CanvasToolbar";
import { HudOverlay } from "./HudOverlay";
import { FacialGridOverlay } from "./FacialGridOverlay";
import { AnnotationLayer } from "./AnnotationLayer";
import { DrawingLayer } from "./DrawingLayer";
import { NoseLandmarksOverlay, type LandmarkKey } from "./NoseLandmarksOverlay";
import { LandmarkDebugOverlay } from "./LandmarkDebugOverlay";
import { PhotoUploadModal } from "./PhotoUploadModal";
import { PhotoQualityBanner } from "./PhotoQualityBanner";
import { PhotoCaptureGuide } from "./PhotoCaptureGuide";
import { classifyFaceView, type FaceView } from "@/utils/viewClassifier";
import { analyzeImageQuality } from "@/lib/canvas/imageQuality";

// ─── Manual placement ─────────────────────────────────────────────────────────

export interface ManualStep {
  key: LandmarkKey;
  label: string;
  hint: string;
}

export const MANUAL_STEPS_FRONTAL: ManualStep[] = [
  {
    key: "bridge",
    label: "Puente nasal (alto)",
    hint: "Entre los ojos, parte alta del puente",
  },
  {
    key: "bridgeMid",
    label: "Puente nasal (medio)",
    hint: "Mitad del dorso de la nariz",
  },
  {
    key: "tip",
    label: "Punta de la nariz",
    hint: "El punto más prominente al frente",
  },
  {
    key: "nostrilL",
    label: "Fosa izquierda",
    hint: "Borde exterior izquierdo (en pantalla)",
  },
  {
    key: "nostrilR",
    label: "Fosa derecha",
    hint: "Borde exterior derecho (en pantalla)",
  },
  {
    key: "base",
    label: "Base / columela",
    hint: "Punto central entre las dos fosas",
  },
];

export const MANUAL_STEPS_PERFIL: ManualStep[] = [
  {
    key: "bridge",
    label: "Nasion (raíz nasal)",
    hint: "El punto MÁS HUNDIDO entre frente y dorso — NO en la ceja. A la altura del lagrimal.",
  },
  {
    key: "bridgeMid",
    label: "Dorso medio (giba)",
    hint: "El punto que MÁS SOBRESALE del dorso hacia adelante — la cima de la joroba. Si el dorso es recto, el punto central entre nasion y punta.",
  },
  {
    key: "tip",
    label: "Pronasal (punta)",
    hint: "El punto más anterior de la nariz",
  },
  {
    key: "nostrilL",
    label: "Aleta visible",
    hint: "Borde inferior de la aleta nasal que se ve en la foto",
  },
  {
    key: "nostrilR",
    label: "Aleta oculta (estimada)",
    hint: "Desplázala hacia atrás ~20-30% del alto de la nariz desde la aleta visible",
  },
  {
    key: "base",
    label: "Subnasal",
    hint: "Donde la columela se une al labio. DEBE quedar más hacia el rostro que la punta (atrás, no delante).",
  },
];

// Backward compat — CanvasToolbar usa MANUAL_STEPS.length para el contador
export const MANUAL_STEPS = MANUAL_STEPS_FRONTAL;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createEmptyLandmarks(W: number, H: number): NoseLandmarks {
  const zero = { x: 0, y: 0 };
  return {
    bridge: zero,
    bridgeMid: zero,
    midDorsum: zero,
    rhinion: zero,
    tip: zero,
    subtip: zero,
    nostrilL: zero,
    nostrilR: zero,
    base: zero,
    visibleAlar: 'both',
    confidence: 0,
    faceBoundingBox: { x: 0, y: 0, width: W, height: H },
    source: "manual",
    anchors: [],
  };
}

function computeFaceBboxFromNose(
  nose: NoseLandmarks,
  W: number,
  H: number,
): NoseLandmarks["faceBoundingBox"] {
  const noseW_raw = Math.abs(nose.nostrilR.x - nose.nostrilL.x);
  const noseH = Math.abs(nose.base.y - nose.bridge.y);
  // En perfil la separación entre nostrils es ~0 — usamos noseH como proxy
  // de ancho facial para que las anclas no se peguen a la nariz.
  const noseW = Math.max(noseW_raw, noseH * 0.6);
  const cx = (nose.nostrilL.x + nose.nostrilR.x) / 2;
  const cy = (nose.bridge.y + nose.base.y) / 2;
  const faceW = Math.max(noseW * 3.5, W * 0.2);
  const faceH = Math.max(noseH * 3.5, H * 0.2);
  return {
    x: Math.max(0, cx - faceW / 2),
    y: Math.max(0, cy - faceH / 2),
    width: Math.min(faceW, W),
    height: Math.min(faceH, H),
  };
}

function eventToCanvasPx(
  e: { clientX: number; clientY: number },
  innerEl: HTMLElement,
  canvas: HTMLCanvasElement,
) {
  // getBoundingClientRect maneja mágicamente la escala y el paneo
  const rect = innerEl.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * sx,
    y: (e.clientY - rect.top) * sy,
  };
}

// ─── Profile nose diagram (anatomical reference during manual placement) ──────

const PROFILE_DIAGRAM_PTS: Record<LandmarkKey, [number, number]> = {
  bridge:    [18, 43],   // Nasion — deepest concavity between forehead and dorsum
  bridgeMid: [36, 70],   // Mid-dorsum / giba apex — most protruding point on dorsum
  rhinion:   [43, 74],   // K-area — keystone bone↔cartilage transition (45% radix→tip)
  tip:       [74, 112],  // Pronasal — most anterior / forward point
  subtip:    [63, 120],  // Sub-tip / break columelar (35% base→tip)
  nostrilL:  [58, 124],  // Visible alar — inferior border of visible nostril
  nostrilR:  [36, 120],  // Hidden alar (estimated) — behind
  base:      [42, 136],  // Subnasal — junction of columella and upper lip
};

function ProfileNoseDiagram({ currentKey }: { currentKey: LandmarkKey }) {
  const [tipX] = PROFILE_DIAGRAM_PTS.tip;
  return (
    <svg
      viewBox="0 0 110 148"
      style={{ width: 88, height: 118, display: "block", flexShrink: 0 }}
      aria-hidden="true"
    >
      {/* Vertical ref from tip — makes clear that subnasal must be BEHIND it */}
      {currentKey === "base" && (
        <line
          x1={tipX} y1={8} x2={tipX} y2={146}
          stroke="rgba(99,102,241,0.4)" strokeWidth={0.8} strokeDasharray="3 2"
        />
      )}

      {/* Forehead stub */}
      <line x1="28" y1="0" x2="28" y2="22" stroke="#9CA3AF" strokeWidth="1.5" />

      {/* External nose profile: forehead → nasion → tip → columella → subnasal */}
      <path
        d="M 28 22 C 26 30 22 36 18 43 C 20 58 36 74 50 88 C 58 96 66 104 74 112 C 70 120 58 130 48 134 C 46 135 44 136 42 136"
        fill="none" stroke="#9CA3AF" strokeWidth="1.5"
      />

      {/* Nostril arch (dashed) */}
      <path
        d="M 42 136 C 40 126 46 118 56 115 C 64 114 70 120 68 126 C 66 130 64 128 58 124"
        fill="none" stroke="#9CA3AF" strokeWidth="1.2" strokeDasharray="2.5 1.8"
      />

      {/* Upper lip reference */}
      <line x1="6" y1="138" x2="44" y2="138" stroke="#9CA3AF" strokeWidth="0.8" strokeDasharray="3 2" />

      {/* Inactive dots */}
      {(Object.entries(PROFILE_DIAGRAM_PTS) as [LandmarkKey, [number, number]][]).map(
        ([key, [x, y]]) => {
          if (key === currentKey) return null;
          return <circle key={key} cx={x} cy={y} r={3} fill="#6B7280" opacity={0.4} />;
        }
      )}

      {/* Active landmark — indigo ring + dot */}
      {(() => {
        const [ax, ay] = PROFILE_DIAGRAM_PTS[currentKey];
        return (
          <g>
            <circle cx={ax} cy={ay} r={7} fill="rgba(99,102,241,0.22)" />
            <circle cx={ax} cy={ay} r={4.5} fill="#4F46E5" />
            <circle cx={ax} cy={ay} r={1.8} fill="white" />
          </g>
        );
      })()}
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CanvasWorkspace() {
  const {
    state,
    setImage,
    setCurrentView,
    setZoomScale,
    setPanOffset,
    setTaggedView,
    setQualityReport,
    setPhotoGuideOpen,
    setBackgroundRemoved,
    setBackgroundProcessing,
    setProcessedImage,
  } = useSimulator();
  const { canvasRef, loadImage } = useCanvas();
  const { removeBackground } = useBackgroundRemoval();
  const {
    detectNoseLandmarks,
    detectionStatus,
    setDetectionStatus,
    deriveAnchorsFromBbox,
  } = useFaceLandmarks();
  const { initWorker, reloadImage, applyRhinoplasty, applyBrushStroke, reset } =
    useRhinoplastyEngine();

  const offscreenRef = useRef<OffscreenCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const noseLandmarksRef = useRef<NoseLandmarks | null>(null);
  const brushStrokesRef = useRef<
    Array<{ px: number; py: number; qx: number; qy: number }>
  >([]);
  const brushActiveRef = useRef(false);
  const panActiveRef = useRef(false);
  const draggingRef = useRef<LandmarkKey | null>(null);

  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [, forceUpdate] = useState(0);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [cursorVisible, setCursorVisible] = useState(false);
  const [manualStep, setManualStep] = useState<number | null>(null);
  const [manualReason, setManualReason] = useState<'detection-failed' | 'user-restart' | null>(null);
  const [manualViewMode, setManualViewMode] = useState<'frontal' | 'perfil' | null>(null);
  // Two-step upload: file is selected first, then the surgeon tags the view
  // in a modal before we process anything.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const activeSteps = manualViewMode === 'perfil' ? MANUAL_STEPS_PERFIL : MANUAL_STEPS_FRONTAL;

  // ─── Cámara (Viewport Pan & Zoom) ─── fuente de verdad en SimulatorContext
  const zoomScale = state.zoomScale;
  const panOffset = state.panOffset;
  const panStartRef = useRef<{
    mx: number;
    my: number;
    ox: number;
    oy: number;
  } | null>(null);

  // Trigger liquify re-apply whenever procedures or landmarks change.
  const triggerApply = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !offscreenRef.current) return;
    if (state.canvasMode === "original") {
      reset();
      return;
    }
    applyRhinoplasty({
      activeProcedures: state.activeProcedures,
      canvasW: canvas.width,
      canvasH: canvas.height,
      nose: noseLandmarksRef.current,
      patientGender: state.patientGender,
    });
  }, [
    state.activeProcedures,
    state.canvasMode,
    state.patientGender,
    applyRhinoplasty,
    reset,
    canvasRef,
  ]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: Math.floor(width), h: Math.floor(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    triggerApply();
  }, [triggerApply]);

  // Step 1: choose a file → store it and let the modal ask the surgeon
  // which anatomical view it is. No image processing happens yet.
  const handleUploadPhoto = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      setPendingFile(file);
    };
    input.click();
  }, []);

  const handleToggleBackground = useCallback(async () => {
    if (!state.imageUrl) return;
    setBackgroundProcessing(true);
    try {
      if (state.backgroundRemoved) {
        const imageData = await loadImage(state.imageUrl);
        await reloadImage(imageData);
        triggerApply();
        setBackgroundRemoved(false);
        return;
      }
      let processedUrl = state.processedImageUrl;
      if (!processedUrl) {
        processedUrl = await removeBackground(state.imageUrl, "#000000");
        setProcessedImage(processedUrl);
      }
      const imageData = await loadImage(processedUrl);
      await reloadImage(imageData);
      triggerApply();
      setBackgroundRemoved(true);
    } catch (err) {
      console.error("[bg-removal] failed", err);
      alert("No pudimos aislar el fondo. Intenta de nuevo con otra foto.");
    } finally {
      setBackgroundProcessing(false);
    }
  }, [
    state.imageUrl,
    state.backgroundRemoved,
    state.processedImageUrl,
    loadImage,
    removeBackground,
    reloadImage,
    triggerApply,
    setBackgroundRemoved,
    setBackgroundProcessing,
    setProcessedImage,
  ]);

  // Step 2: surgeon confirmed the view → run EXIF rotation, detection,
  // quality analysis, and the canvas/worker pipeline.
  const processPendingPhoto = useCallback(
    async (taggedView: FaceView) => {
      const file = pendingFile;
      if (!file) return;
      setPendingFile(null);
      setTaggedView(taggedView);
      setQualityReport(null);

      // EXIF auto-rotation via createImageBitmap. Supported in all evergreen
      // browsers; if unavailable we fall back to the raw blob URL.
      let displayUrl: string
      let analysisSource: HTMLImageElement | ImageBitmap
      try {
        const bitmap = await createImageBitmap(file, {
          imageOrientation: "from-image",
        })
        const oriented = document.createElement("canvas")
        oriented.width = bitmap.width
        oriented.height = bitmap.height
        const octx = oriented.getContext("2d")
        if (!octx) throw new Error("canvas 2d unavailable")
        octx.drawImage(bitmap, 0, 0)
        displayUrl = oriented.toDataURL("image/png")
        analysisSource = bitmap
      } catch (err) {
        console.warn("[upload] EXIF rotation fallback:", err)
        displayUrl = URL.createObjectURL(file)
        analysisSource = new Image()
        ;(analysisSource as HTMLImageElement).src = displayUrl
        await new Promise<void>((r) => {
          ;(analysisSource as HTMLImageElement).onload = () => r()
        })
      }

      try {
        const imageData = await loadImage(displayUrl);
        const imgEl = new Image();
        imgEl.src = displayUrl;
        await new Promise<void>((r) => {
          imgEl.onload = () => r();
        });
        const detected = await detectNoseLandmarks(imgEl);

        const canvas = canvasRef.current!;
        if (detected) {
          noseLandmarksRef.current = detected;
          setCurrentView(classifyFaceView(detected));
          setManualStep(null);
          setManualReason(null);
          setManualViewMode(null);
        } else {
          noseLandmarksRef.current = createEmptyLandmarks(
            canvas.width,
            canvas.height,
          );
          setCurrentView(null);
          setManualStep(0);
          setManualReason('detection-failed');
          setManualViewMode(null);
        }
        forceUpdate((n) => n + 1);
        brushStrokesRef.current = [];

        // Run quality analysis once we know the face bbox (or know detection
        // failed). Always returns a report; banner only shows if warnings.
        const detectedView = detected ? classifyFaceView(detected) : null
        const report = analyzeImageQuality({
          img: analysisSource,
          faceBoundingBox: detected?.faceBoundingBox,
          taggedView,
          detectedView,
        })
        setQualityReport(report)

        const offscreen = canvas.transferControlToOffscreen();
        offscreenRef.current = offscreen;
        await initWorker(offscreen, imageData);

        // Reset Viewport Data
        setImage(displayUrl);
        setPanOffset({ x: 0, y: 0 });
        setZoomScale(1);

        if (detected) triggerApply();
      } catch (err) {
        console.error("Error loading image:", err);
      }
    },
    [
      pendingFile,
      loadImage,
      initWorker,
      setImage,
      canvasRef,
      detectNoseLandmarks,
      triggerApply,
      setCurrentView,
      setTaggedView,
      setQualityReport,
      setPanOffset,
      setZoomScale,
    ],
  );

  const restartManual = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    noseLandmarksRef.current = createEmptyLandmarks(
      canvas.width,
      canvas.height,
    );
    setManualStep(0);
    setManualReason('user-restart');
    setManualViewMode(null);
    setCurrentView(null);
    forceUpdate((n) => n + 1);
    void reset();
  }, [canvasRef, reset]);

  // ── Landmark drag (window-level) ─────────────────────────────────────────

  const handleLandmarkPointerDown = useCallback(
    (key: LandmarkKey, e: React.PointerEvent<SVGCircleElement>) => {
      e.stopPropagation();
      e.preventDefault();
      draggingRef.current = key;
      forceUpdate((n) => n + 1);
    },
    [],
  );

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const key = draggingRef.current;
      if (!key) return;
      const innerEl = innerContainerRef.current;
      const canvas = canvasRef.current;
      if (!innerEl || !canvas || !noseLandmarksRef.current) return;
      const pt = eventToCanvasPx(e, innerEl, canvas);
      if (!pt) return;
      const next: NoseLandmarks = {
        ...noseLandmarksRef.current,
        [key]: { x: pt.x, y: pt.y },
      };
      // Si el médico arrastra el radix o la punta, el rhinion se recalcula
      // automáticamente (45% radix→tip). Si arrastra el rhinion directamente,
      // se respeta su posición manual.
      if (key === "bridge" || key === "tip") {
        next.rhinion = {
          x: next.bridge.x + (next.tip.x - next.bridge.x) * RHINION_T,
          y: next.bridge.y + (next.tip.y - next.bridge.y) * RHINION_T,
        };
      }
      // Sub-tip se recalcula cuando se mueve tip o base (35% base→tip).
      if (key === "tip" || key === "base") {
        next.subtip = {
          x: next.base.x + (next.tip.x - next.base.x) * SUBTIP_T,
          y: next.base.y + (next.tip.y - next.base.y) * SUBTIP_T,
        };
      }
      noseLandmarksRef.current = next;
      forceUpdate((n) => n + 1);
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = null;
      forceUpdate((n) => n + 1);
      triggerApply();
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [canvasRef, triggerApply]);

  // ── Mouse handlers (Viewport Logic) ──────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (manualStep !== null) {
        // Si no se ha elegido el modo de vista, no aceptar clicks aún
        if (manualViewMode === null) return;
        const canvas = canvasRef.current;
        const innerEl = innerContainerRef.current;
        if (!canvas || !innerEl) return;
        const pt = eventToCanvasPx(e, innerEl, canvas);
        if (!pt) return;
        const step = activeSteps[manualStep];
        const base =
          noseLandmarksRef.current ??
          createEmptyLandmarks(canvas.width, canvas.height);
        const updated: NoseLandmarks = {
          ...base,
          [step.key]: { x: pt.x, y: pt.y },
        };

        if (manualStep === activeSteps.length - 1) {
          updated.faceBoundingBox = computeFaceBboxFromNose(
            updated,
            canvas.width,
            canvas.height,
          );
          updated.anchors = deriveAnchorsFromBbox(updated.faceBoundingBox);
          updated.rhinion = {
            x: updated.bridge.x + (updated.tip.x - updated.bridge.x) * RHINION_T,
            y: updated.bridge.y + (updated.tip.y - updated.bridge.y) * RHINION_T,
          };
          updated.subtip = {
            x: updated.base.x + (updated.tip.x - updated.base.x) * SUBTIP_T,
            y: updated.base.y + (updated.tip.y - updated.base.y) * SUBTIP_T,
          };
          noseLandmarksRef.current = updated;
          setCurrentView(manualViewMode);
          setManualStep(null);
          setManualReason(null);
          setManualViewMode(null);
          setDetectionStatus("detected");
          setTimeout(() => {
            forceUpdate((n) => n + 1);
            triggerApply();
          }, 0);
        } else {
          noseLandmarksRef.current = updated;
          setManualStep(manualStep + 1);
          forceUpdate((n) => n + 1);
        }
        e.preventDefault();
        return;
      }

      if (state.activeTool === "broca") {
        brushActiveRef.current = true;
        e.preventDefault();
      } else if (state.activeTool === "pan") {
        panActiveRef.current = true;
        panStartRef.current = {
          mx: e.clientX,
          my: e.clientY,
          ox: panOffset.x,
          oy: panOffset.y,
        };
        e.preventDefault();
      }
    },
    [
      state.activeTool,
      panOffset,
      manualStep,
      canvasRef,
      setDetectionStatus,
      triggerApply,
      deriveAnchorsFromBbox,
      setCurrentView,
      manualViewMode,
      activeSteps,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (manualStep !== null || draggingRef.current) return;

      if (
        state.activeTool === "pan" &&
        panActiveRef.current &&
        panStartRef.current
      ) {
        setPanOffset({
          x: panStartRef.current.ox + e.clientX - panStartRef.current.mx,
          y: panStartRef.current.oy + e.clientY - panStartRef.current.my,
        });
        return;
      }

      if (state.activeTool === "broca") {
        const viewport = innerContainerRef.current?.parentElement;
        if (viewport) {
          const rect = viewport.getBoundingClientRect();
          setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
      }

      if (!brushActiveRef.current || state.activeTool !== "broca") return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const innerEl = innerContainerRef.current;
      if (!innerEl) return;
      const pt = eventToCanvasPx(e, innerEl, canvas);
      if (!pt) return;
      const refSize = Math.min(canvas.width, canvas.height);
      const intensity =
        (state.activeProcedures[state.selectedProcedureIndex]?.intensity ??
          70) / 100;

      const scaleX = canvas.width / innerEl.getBoundingClientRect().width;
      const scaleY = canvas.height / innerEl.getBoundingClientRect().height;
      const radius = refSize * state.brushRadius;

      brushStrokesRef.current = [
        ...brushStrokesRef.current.slice(-30),
        {
          px: pt.x + e.movementX * scaleX * intensity * 1.5,
          py: pt.y + e.movementY * scaleY * intensity * 1.5,
          qx: pt.x,
          qy: pt.y,
        },
      ];

      const anchors = [
        { px: pt.x + radius, py: pt.y, qx: pt.x + radius, qy: pt.y },
        { px: pt.x - radius, py: pt.y, qx: pt.x - radius, qy: pt.y },
        { px: pt.x, py: pt.y + radius, qx: pt.x, qy: pt.y + radius },
        { px: pt.x, py: pt.y - radius, qx: pt.x, qy: pt.y - radius },
      ];
      applyBrushStroke(
        [...brushStrokesRef.current, ...anchors],
        canvas.width,
        canvas.height,
      );
    },
    [
      state.activeTool,
      state.activeProcedures,
      state.selectedProcedureIndex,
      state.brushRadius,
      canvasRef,
      applyBrushStroke,
      manualStep,
      panOffset,
    ],
  );

  const handleMouseUp = useCallback(() => {
    brushActiveRef.current = false;
    panActiveRef.current = false;
    panStartRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    brushActiveRef.current = false;
    panActiveRef.current = false;
    panStartRef.current = null;
    setCursorVisible(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (state.activeTool === "broca" && manualStep === null)
      setCursorVisible(true);
  }, [state.activeTool, manualStep]);

  // ── Brush display radius ─────────────────────────────────────────────────

  const displayRadius = (() => {
    const canvas = canvasRef.current;
    const container = innerContainerRef.current;
    if (!canvas || !container) return 0;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return 0;
    return (
      Math.min(canvas.width, canvas.height) *
      state.brushRadius *
      (rect.width / canvas.width)
    );
  })();

  const canvasCursor =
    manualStep !== null
      ? "crosshair"
      : draggingRef.current
        ? "grabbing"
        : state.activeTool === "broca"
          ? "none"
          : state.activeTool === "pan"
            ? panActiveRef.current
              ? "grabbing"
              : "grab"
            : undefined;

  const canvasWidth = canvasRef.current?.width ?? 0;
  const canvasHeight = canvasRef.current?.height ?? 0;

  const effectiveStatus: DetectionStatus =
    manualStep !== null
      ? "detecting"
      : noseLandmarksRef.current?.source === "manual"
        ? "detected"
        : detectionStatus;

  const hasLandmarks = noseLandmarksRef.current !== null;
  // Keys placed so far: slice activeSteps by manualStep (null = all done → empty, isManualGuided=false so unused)
  const placedKeys: LandmarkKey[] = manualStep !== null
    ? activeSteps.slice(0, manualStep).map(s => s.key)
    : [];

  return (
    <>
    <div
      className="flex flex-col flex-1 overflow-hidden"
      style={{ background: "#F5F3FF" }}
    >
      <CanvasToolbar
        onUploadPhoto={handleUploadPhoto}
        onToggleBackground={handleToggleBackground}
        detectionStatus={effectiveStatus}
        manualStep={manualStep}
        manualReason={manualReason}
        canRestartManual={hasLandmarks}
        onRestartManual={restartManual}
      />

      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(rgba(102,126,234,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(102,126,234,0.04) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <PhotoQualityBanner
          report={state.qualityReport}
          onDismiss={() => setQualityReport(null)}
          onOpenGuide={() => setPhotoGuideOpen(true)}
        />
        {!state.imageUrl && (
          <div className="text-center absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[0.85rem] font-semibold text-text-primary mb-1.5">
              Sin fotografía
            </p>
            <p className="text-[0.75rem] text-[#9CA3AF] mb-4">
              Sube una foto del paciente para comenzar la simulación
            </p>
            <button
              onClick={handleUploadPhoto}
              className="btn-primary pointer-events-auto"
            >
              📷 Subir foto
            </button>
          </div>
        )}

        {/* CONTENEDOR DE EVENTOS */}
        <div
          style={{
            display: state.imageUrl ? "flex" : "none",
            alignItems: "center",
            justifyContent: "center",
            maxWidth: containerSize.w > 0 ? `${containerSize.w}px` : undefined,
            maxHeight: containerSize.h > 0 ? `${containerSize.h}px` : undefined,
            width: "100%",
            height: "100%",
            overflow: "hidden",
            position: "relative",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseEnter}
        >
          {/* VIEWPORT ESTÁTICO (El Marco) */}
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              boxShadow: "0 8px 32px rgba(30,27,75,0.12)",
              cursor: canvasCursor,
              maxWidth: "100%",
              maxHeight: "100%",
              flexShrink: 0,
            }}
          >
            {/* CAPA MÓVIL (El Contenido a escalar y desplazar) */}
            <div
              ref={innerContainerRef}
              style={{
                // La transformación se aplica al contenedor que tiene AMBOS (original e img)
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                transformOrigin: "center center",
                width: "100%",
                height: "100%",
                position: "relative",
                willChange: "transform",
              }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  display: "block",
                  width: "auto",
                  height: "auto",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  margin: "0 auto",
                  visibility:
                    state.canvasMode === "original" ? "hidden" : "visible",
                  clipPath:
                    state.canvasMode === "split"
                      ? "inset(0 0 0 50%)"
                      : undefined,
                }}
              />

              {state.imageUrl && state.canvasMode !== "simulation" && (
                <img
                  src={
                    state.backgroundRemoved && state.processedImageUrl
                      ? state.processedImageUrl
                      : state.imageUrl
                  }
                  alt="Original"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{
                    clipPath:
                      state.canvasMode === "split"
                        ? "inset(0 50% 0 0)"
                        : undefined,
                  }}
                />
              )}

              {state.canvasMode === "split" && state.imageUrl && (
                <>
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none"
                    style={{
                      left: "50%",
                      width: "2px",
                      background: "linear-gradient(180deg, #4FACFE, #667EEA)",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "white",
                      textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                      pointerEvents: "none",
                    }}
                  >
                    Original
                  </span>
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "white",
                      textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                      pointerEvents: "none",
                    }}
                  >
                    Simulación
                  </span>
                </>
              )}

              {state.showLandmarks &&
                noseLandmarksRef.current &&
                canvasWidth > 0 && (
                  <NoseLandmarksOverlay
                    landmarks={noseLandmarksRef.current}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    manualStep={manualStep}
                    placedKeys={placedKeys}
                    onLandmarkPointerDown={handleLandmarkPointerDown}
                  />
                )}

              {state.debugLandmarksVisible &&
                noseLandmarksRef.current &&
                canvasWidth > 0 && (
                  <LandmarkDebugOverlay
                    landmarks={noseLandmarksRef.current}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                  />
                )}

              {state.hudVisible && (
                <HudOverlay width={containerSize.w} height={containerSize.h} />
              )}
              {state.facialGridVisible && (
                <FacialGridOverlay
                  width={containerSize.w}
                  height={containerSize.h}
                />
              )}
              <AnnotationLayer
                width={containerSize.w}
                height={containerSize.h}
              />
              <DrawingLayer width={containerSize.w} height={containerSize.h} />
            </div>

            {/* ARO DEL PINCEL (Fijo a la pantalla, no a la imagen escalada) */}
            {state.activeTool === "broca" &&
              manualStep === null &&
              cursorVisible &&
              cursorPos &&
              displayRadius > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: cursorPos.x - displayRadius,
                    top: cursorPos.y - displayRadius,
                    width: displayRadius * 2,
                    height: displayRadius * 2,
                    borderRadius: "50%",
                    border: "1.5px solid rgba(102, 126, 234, 0.8)",
                    background: "rgba(102, 126, 234, 0.08)",
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                />
              )}
          </div>

          {manualStep !== null && (
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                background: "rgba(17, 24, 39, 0.92)",
                color: "white",
                padding: "12px 14px",
                borderRadius: 10,
                maxWidth: 320,
                zIndex: 30,
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                pointerEvents: "auto",
              }}
            >
              {manualViewMode === null ? (
                // ── Selector de tipo de toma ─────────────────────────────────
                <>
                  {manualReason === 'detection-failed' && (
                    <div
                      style={{
                        fontSize: 12,
                        background: "rgba(202, 138, 4, 0.15)",
                        border: "1px solid rgba(202, 138, 4, 0.4)",
                        color: "#FCD34D",
                        padding: "8px 10px",
                        borderRadius: 6,
                        marginBottom: 10,
                        lineHeight: 1.4,
                      }}
                    >
                      No pudimos detectar la cara automáticamente. Selecciona el tipo de toma para marcar los puntos manualmente.
                    </div>
                  )}
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                    Selecciona el tipo de toma
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 12, lineHeight: 1.4 }}>
                    Los nombres y posiciones de los puntos cambian según el ángulo de la foto.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setManualViewMode('frontal')}
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 600,
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.25)",
                        background: "rgba(255,255,255,0.05)",
                        color: "white",
                        cursor: "pointer",
                      }}
                    >
                      Frontal
                    </button>
                    <button
                      onClick={() => setManualViewMode('perfil')}
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 600,
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.25)",
                        background: "rgba(255,255,255,0.05)",
                        color: "white",
                        cursor: "pointer",
                      }}
                    >
                      Perfil
                    </button>
                  </div>
                  <button
                    onClick={() => { setManualStep(null); setManualReason(null); setManualViewMode(null); }}
                    style={{
                      marginTop: 10,
                      width: "100%",
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "transparent",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                // ── Card de paso con labels según modo seleccionado ──────────
                <>
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.65,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    Paso {manualStep + 1} de {activeSteps.length} · {manualViewMode === 'perfil' ? 'Perfil' : 'Frontal'}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                    {activeSteps[manualStep].label}
                  </div>
                  {manualViewMode === "perfil" ? (
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 8 }}>
                      <div style={{ flex: 1, fontSize: 12, opacity: 0.85, lineHeight: 1.4 }}>
                        {activeSteps[manualStep].hint}
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "6px 6px 4px", border: "1px solid rgba(255,255,255,0.14)", flexShrink: 0 }}>
                        <ProfileNoseDiagram currentKey={activeSteps[manualStep].key} />
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.85,
                        marginTop: 6,
                        lineHeight: 1.4,
                      }}
                    >
                      {activeSteps[manualStep].hint}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={() => setManualStep(Math.max(0, manualStep - 1))}
                      disabled={manualStep === 0}
                      style={{
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "transparent",
                        color: "white",
                        cursor: manualStep === 0 ? "not-allowed" : "pointer",
                        opacity: manualStep === 0 ? 0.4 : 1,
                      }}
                    >
                      ← Anterior
                    </button>
                    <button
                      onClick={() => setManualViewMode(null)}
                      style={{
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "transparent",
                        color: "white",
                        cursor: "pointer",
                      }}
                    >
                      Cambiar tipo
                    </button>
                    <button
                      onClick={() => { setManualStep(null); setManualReason(null); setManualViewMode(null); }}
                      style={{
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "transparent",
                        color: "white",
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    <PhotoUploadModal
      open={pendingFile !== null}
      fileName={pendingFile?.name ?? null}
      onCancel={() => setPendingFile(null)}
      onConfirm={(view) => {
        void processPendingPhoto(view);
      }}
      onOpenGuide={() => setPhotoGuideOpen(true)}
    />
    <PhotoCaptureGuide
      open={state.photoGuideOpen}
      onClose={() => setPhotoGuideOpen(false)}
    />
    </>
  );
}
