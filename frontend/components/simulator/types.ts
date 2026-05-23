export type Procedimiento =
  | "RINOPLASTIA"
  | "LIFTING_CEJAS"
  | "AUMENTO_MENTON"
  | "AUMENTO_LABIOS"
  | "LIFTING_CUELLO"
  | "BLEFAROPLASTIA"
  | "SUAVIZADO_PIEL"
  | "FEMINIZACION_FACIAL";

export type TecnicaSesion =
  | "QUIRURGICO"
  | "RINOMODELACION"
  | "ENDOSCOPICO"
  | "IMPLANTE"
  | "FILLER"
  | "LIPOSUCCION"
  | "SUPERIOR"
  | "INFERIOR"
  | "COMPLETO"
  | "LASER"
  | "MICRONEEDLING";

import type { FaceView } from "@/utils/viewClassifier";

export interface SliderDef {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  /** When true and technique is RINOMODELACION, clamp min to 0 */
  blockedNegativeInRinomodelacion?: boolean;
  /** Views where this slider is geometrically valid. Omitted = valid in all views. */
  validInViews?: FaceView[];
}

export interface ActiveProcedure {
  procedimiento: Procedimiento;
  tecnica: TecnicaSesion;
  sliderValues: Record<string, number>;
  intensity: number; // 0–100
  presetId: string | null;
}

export type CanvasTool =
  | "none"
  | "pan"
  | "pin"
  | "hud"
  | "angle"
  | "draw"
  | "broca"
  | "zoom";

export interface AnnotationPin {
  id: string;
  x: number; // 0–1 relative to canvas
  y: number;
  label: string;
}

export type CanvasMode = "original" | "simulation" | "split";

export interface DrawingStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
}

export type PatientGender = "F" | "M";

export interface SimulatorState {
  sessionId: string | null;
  patientId: string | null;
  imageUrl: string | null;
  activeProcedures: ActiveProcedure[];
  selectedProcedureIndex: number;
  canvasMode: CanvasMode; // <--- Ya exportado
  hudVisible: boolean;
  pins: AnnotationPin[];
  strokes: DrawingStroke[];
  activeTool: CanvasTool; // <--- Usando el tipo que ya definiste arriba
  notes: string;
  isSaving: boolean;
  brushRadius: number;
  showLandmarks: boolean;
  currentView: FaceView | null;
  patientGender: PatientGender;
  zoomScale: number; // <--- No olvides agregarlo aquí también
  panOffset: { x: number; y: number };
}
