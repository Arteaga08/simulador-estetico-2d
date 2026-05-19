export type Procedimiento =
  | 'RINOPLASTIA'
  | 'LIFTING_CEJAS'
  | 'AUMENTO_MENTON'
  | 'AUMENTO_LABIOS'
  | 'LIFTING_CUELLO'
  | 'BLEFAROPLASTIA'
  | 'SUAVIZADO_PIEL'
  | 'FEMINIZACION_FACIAL'

export type TecnicaSesion =
  | 'QUIRURGICO'
  | 'RINOMODELACION'
  | 'ENDOSCOPICO'
  | 'IMPLANTE'
  | 'FILLER'
  | 'LIPOSUCCION'
  | 'SUPERIOR'
  | 'INFERIOR'
  | 'COMPLETO'
  | 'LASER'
  | 'MICRONEEDLING'

export interface SliderDef {
  id: string
  label: string
  min: number
  max: number
  step: number
  defaultValue: number
  /** When true and technique is RINOMODELACION, clamp min to 0 */
  blockedNegativeInRinomodelacion?: boolean
}

export interface ActiveProcedure {
  procedimiento: Procedimiento
  tecnica: TecnicaSesion
  sliderValues: Record<string, number>
  intensity: number          // 0–100
  presetId: string | null
}

export type CanvasMode = 'original' | 'simulation' | 'split'

export interface AnnotationPin {
  id: string
  x: number                  // 0–1 relative to canvas
  y: number
  label: string
}

export interface DrawingStroke {
  id: string
  points: Array<{ x: number; y: number }>
  color: string
  width: number
}

export interface SimulatorState {
  sessionId: string | null
  patientId: string | null
  imageUrl: string | null
  activeProcedures: ActiveProcedure[]
  selectedProcedureIndex: number
  canvasMode: CanvasMode
  hudVisible: boolean
  pins: AnnotationPin[]
  strokes: DrawingStroke[]
  activeTool: 'none' | 'pin' | 'hud' | 'angle' | 'draw'
  notes: string
  isSaving: boolean
}
