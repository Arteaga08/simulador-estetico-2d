/**
 * MLS control point pair.
 *   (px, py) = displaced / target position  (destination space for backward warp)
 *   (qx, qy) = original / source position
 *   Anchor point: px === qx && py === qy (zero displacement, prevents tissue drift)
 *
 *   w = hydrodynamic mass. Multiplies the MLS distance weight so heavier points
 *       dominate the warp field. Omitted → 1.0 (backward-compatible with brush).
 *       Calibration: 1.0 = passive anchor · 2.5 = local pivot · 5.0-7.0 = active.
 */
export interface ControlPoint {
  px: number
  py: number
  qx: number
  qy: number
  w?: number
}

export interface NoseBbox {
  x: number
  y: number
  width: number
  height: number
}

export interface LiquifyConfig {
  width:  number
  height: number
  controlPoints: ControlPoint[]
  /** Nose bounding box — MLS deformation only applied inside this region.
   *  Pixels outside are copied verbatim. null = full image (broca brush). */
  noseBbox: NoseBbox | null
}

export type WorkerInMessage =
  | { type: 'INIT'; canvas: OffscreenCanvas; imageData: ImageData }
  | { type: 'APPLY'; config: LiquifyConfig }
  | { type: 'RESET' }

export type WorkerOutMessage =
  | { type: 'READY' }
  | { type: 'DONE' }
  | { type: 'ERROR'; message: string }
