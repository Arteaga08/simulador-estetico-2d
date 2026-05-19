import type { ControlPoint } from './types'

interface Displacement { dx: number; dy: number }

/**
 * Bi-quadratic weighting: w = max(0, 1 - d²/R²)²
 * Returns accumulated displacement at point (px, py) from all control points.
 */
export function computeDisplacement(
  px: number,
  py: number,
  controlPoints: ControlPoint[],
): Displacement {
  let dx = 0
  let dy = 0

  for (const cp of controlPoints) {
    const distSq = (px - cp.x) ** 2 + (py - cp.y) ** 2
    const radiusSq = cp.radius ** 2
    if (distSq >= radiusSq) continue
    const w = (1 - distSq / radiusSq) ** 2
    dx += cp.dx * w
    dy += cp.dy * w
  }

  return { dx, dy }
}

/**
 * Bilinear interpolation of src ImageData at sub-pixel coordinates (sx, sy).
 * Returns [r, g, b, a].
 */
function bilinearSample(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  sx: number,
  sy: number,
): [number, number, number, number] {
  const x0 = Math.floor(sx)
  const y0 = Math.floor(sy)
  const x1 = Math.min(x0 + 1, w - 1)
  const y1 = Math.min(y0 + 1, h - 1)
  const fx = sx - x0
  const fy = sy - y0

  const idx = (x: number, y: number) => (y * w + x) * 4

  const i00 = idx(Math.max(0, x0), Math.max(0, y0))
  const i10 = idx(Math.max(0, x1), Math.max(0, y0))
  const i01 = idx(Math.max(0, x0), Math.max(0, y1))
  const i11 = idx(Math.max(0, x1), Math.max(0, y1))

  return [0, 1, 2, 3].map(c =>
    data[i00 + c] * (1 - fx) * (1 - fy) +
    data[i10 + c] * fx       * (1 - fy) +
    data[i01 + c] * (1 - fx) * fy       +
    data[i11 + c] * fx       * fy
  ) as [number, number, number, number]
}

/**
 * Applies inverse warp liquify to src ImageData.
 * For each destination pixel, computes where it maps back in the source
 * (inverse warp avoids holes).
 */
export function applyLiquify(src: ImageData, controlPoints: ControlPoint[]): ImageData {
  const { width: w, height: h, data } = src
  const dst = new ImageData(w, h)

  if (controlPoints.length === 0) {
    dst.data.set(data)
    return dst
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const { dx, dy } = computeDisplacement(x, y, controlPoints)
      const sx = x - dx
      const sy = y - dy

      const [r, g, b, a] = bilinearSample(data, w, h, sx, sy)
      const dstIdx = (y * w + x) * 4
      dst.data[dstIdx]     = r
      dst.data[dstIdx + 1] = g
      dst.data[dstIdx + 2] = b
      dst.data[dstIdx + 3] = a
    }
  }

  return dst
}
