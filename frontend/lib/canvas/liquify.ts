import type { ControlPoint, NoseBbox } from './types'
import { applyMLSDeformation } from '@/utils/mlsDeformation'

/**
 * Apply MLS As-Rigid-As-Possible deformation (mass-weighted).
 *
 * @param src            Original ImageData (never mutated)
 * @param controlPoints  MLS control point pairs {px,py,qx,qy,w?}
 * @param noseBbox       Region to deform; pixels outside are copied unchanged.
 *                       Pass null for the broca brush (full-image free warp).
 */
export function applyLiquify(
  src: ImageData,
  controlPoints: ControlPoint[],
  noseBbox: NoseBbox | null = null,
): ImageData {
  return applyMLSDeformation(src, controlPoints, noseBbox)
}
