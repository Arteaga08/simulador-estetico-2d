export interface Point {
  x: number;
  y: number;
}

export interface DorsumAxis {
  dorsum: Point;
  normal: Point;
  length: number;
}

export interface NoseBboxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LandmarkSet {
  bridge: Point;
  bridgeMid: Point;
  tip: Point;
  nostrilL: Point;
  nostrilR: Point;
  base: Point;
}

// Nueva firma de utilidad espacial
export function getFaceOrientationAngle(
  glabela: Point,
  basePoint: Point,
): number;

export function getTVL(
  glabela: Point,
  basePoint: Point,
): { origin: Point; dir: Point; angle: number };

// Modificado para aceptar la corrección de postura craneal
export function getNasalDorsumAxis(
  radix: Point,
  pronasal: Point,
  headAngle: number,
): DorsumAxis;

export function getNasolabialAngle(subnasal: Point, pronasal: Point): number;

export function getTipProjection(
  pronasal: Point,
  tvl: { origin: Point; dir: Point },
): number;

export function getNasofrontalAngle(
  nasion: Point,
  radix: Point,
  pronasal: Point,
): number;

export function rotateTipAroundSubnasal(
  pronasal: Point,
  subnasal: Point,
  deltaAngleRad: number,
): Point;

export function computeNoseBbox(
  landmarks: LandmarkSet,
  canvasW: number,
  canvasH: number,
  marginFactor?: number,
): NoseBboxRect;
