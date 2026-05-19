export interface ControlPoint {
  /** Normalized canvas coordinates [0, 1] */
  x: number
  y: number
  /** Displacement in pixels */
  dx: number
  dy: number
  /** Radius of influence in pixels */
  radius: number
}

export interface LiquifyConfig {
  width: number
  height: number
  controlPoints: ControlPoint[]
}

export type WorkerInMessage =
  | { type: 'INIT'; canvas: OffscreenCanvas; imageData: ImageData }
  | { type: 'APPLY'; config: LiquifyConfig }
  | { type: 'RESET' }

export type WorkerOutMessage =
  | { type: 'READY' }
  | { type: 'DONE' }
  | { type: 'ERROR'; message: string }
