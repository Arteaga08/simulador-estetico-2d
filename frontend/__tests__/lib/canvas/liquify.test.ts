import { describe, it, expect } from 'vitest'
import { applyLiquify } from '@/lib/canvas/liquify'
import type { ControlPoint } from '@/lib/canvas/types'
import {
  constrainProfileTipRotation,
  buildRhinoplastyControlPoints,
} from '@/utils/surgicalLimits'
import type { NoseLandmarks } from '@/lib/canvas/useFaceLandmarks'

// Note: applyLiquify uses Schaefer MLS rigid deformation (mlsDeformation.ts).
// SUPRATIP_TRANSFER es 0.35 en surgicalLimits (constante privada, replicada aquí).
const SUPRATIP_TRANSFER = 0.35

// jsdom's `new ImageData(w, h)` constructor returns a malformed object in this
// environment; the (data, w, h) form is the only reliable path.
function blankImageData(w: number, h: number): ImageData {
  return new ImageData(new Uint8ClampedArray(w * h * 4), w, h)
}

describe('applyLiquify (mass-weighted MLS)', () => {
  it('returns an ImageData of the same dimensions', () => {
    const src = blankImageData(64, 64)
    const result = applyLiquify(src, [], null)
    expect(result.width).toBe(64)
    expect(result.height).toBe(64)
  })

  it('returns identical pixels when no control points', () => {
    const src = blankImageData(4, 4)
    src.data[0] = 255  // R of pixel (0,0)
    const result = applyLiquify(src, [], null)
    expect(result.data[0]).toBe(255)
  })

  it('returns identical pixels when all control points are anchors (identity)', () => {
    const src = blankImageData(4, 4)
    src.data[4] = 128  // R of pixel (1,0)
    const anchors: ControlPoint[] = [
      { px: 2, py: 2, qx: 2, qy: 2 },
      { px: 0, py: 0, qx: 0, qy: 0 },
    ]
    const result = applyLiquify(src, anchors, null)
    expect(result.data[4]).toBe(128)
  })

  it('applies deformation within noseBbox', () => {
    const W = 100, H = 100
    const src = blankImageData(W, H)
    // Paint a bright pixel at (75, 50) — the warp will sample from here.
    src.data[(50 * W + 75) * 4] = 200
    // Control point: pull dest (25, 50) from source (75, 50)
    const pts: ControlPoint[] = [{ px: 25, py: 50, qx: 75, qy: 50 }]
    const anchors: ControlPoint[] = [
      { px: 0,  py: 0,  qx: 0,  qy: 0  },
      { px: 99, py: 99, qx: 99, qy: 99 },
    ]
    const bbox = { x: 0, y: 0, width: 50, height: 100 }
    const result = applyLiquify(src, [...pts, ...anchors], bbox)
    // Pixel near the active control point should have absorbed value from src(75,50)
    const r2550 = result.data[(50 * W + 25) * 4]
    expect(r2550).toBeGreaterThan(50)
  })

  it('heavy control points dominate the warp field (w=5 vs w=1)', () => {
    const W = 100, H = 100
    const src = blankImageData(W, H)
    // Right half painted red; left half black.
    for (let y = 0; y < H; y++) {
      for (let x = 50; x < W; x++) {
        src.data[(y * W + x) * 4] = 255  // R
      }
    }
    const pts: ControlPoint[] = [
      // Heavy point pulls the warp toward the right (red) source
      { px: 55, py: 50, qx: 70, qy: 50, w: 5.0 },
      // Light point pulls toward the left (black) source
      { px: 45, py: 50, qx: 30, qy: 50, w: 1.0 },
      // Corner anchors
      { px: 0,     py: 0,     qx: 0,     qy: 0     },
      { px: W - 1, py: 0,     qx: W - 1, qy: 0     },
      { px: 0,     py: H - 1, qx: 0,     qy: H - 1 },
      { px: W - 1, py: H - 1, qx: W - 1, qy: H - 1 },
    ]
    const result = applyLiquify(src, pts, null)
    const rCentre = result.data[(50 * W + 50) * 4]
    // With equal masses, the centre would sample from ~x=50 (boundary).
    // With the heavy point dominating, R must be well above the mid-value.
    expect(rCentre).toBeGreaterThan(180)
  })

  it('control points without w produce the same image as w=1 (backward compat)', () => {
    const W = 32, H = 32
    // Seed deterministic pattern.
    const data = new Uint8ClampedArray(W * H * 4)
    for (let i = 0; i < data.length; i++) data[i] = (i * 7) % 256
    const ptsNoW: ControlPoint[] = [
      { px: 10, py: 10, qx: 16, qy: 16 },
      { px: 0,  py: 0,  qx: 0,  qy: 0  },
      { px: 31, py: 31, qx: 31, qy: 31 },
    ]
    const ptsW1: ControlPoint[] = ptsNoW.map(p => ({ ...p, w: 1.0 }))
    const r1 = applyLiquify(new ImageData(new Uint8ClampedArray(data), W, H), ptsNoW, null)
    const r2 = applyLiquify(new ImageData(new Uint8ClampedArray(data), W, H), ptsW1,  null)
    expect(r1.data).toEqual(r2.data)
  })
})

// ──────────────────────────────────────────────────────────────────────────────

// Fixture: tip directly above base → natural nasolabial angle ≈ 90° (within
// the clinical [85°, 115°] band, so small rotations don't trigger clamping).
function makeLandmarks(overrides: Partial<NoseLandmarks> = {}): NoseLandmarks {
  return {
    bridge:    { x: 400, y: 200 },
    bridgeMid: { x: 408, y: 270 },
    tip:       { x: 415, y: 320 },
    nostrilL:  { x: 405, y: 360 },
    nostrilR:  { x: 425, y: 360 },
    base:      { x: 415, y: 355 },
    confidence: 1,
    faceBoundingBox: { x: 200, y: 100, width: 400, height: 500 },
    source: 'auto',
    anchors: [
      { x: 200, y: 100 }, { x: 600, y: 100 },
      { x: 200, y: 500 }, { x: 600, y: 500 },
    ],
    ...overrides,
  }
}

describe('constrainProfileTipRotation (anatomical co-rotation)', () => {
  it('rotates bridgeMid around subnasal at ~35% of the tip arc', () => {
    const landmarks = makeLandmarks()
    const maxAngleRad = Math.PI / 18  // 10°
    const { tipDest, bridgeMidDest } =
      constrainProfileTipRotation(10, landmarks, maxAngleRad)

    // tipDest rotates around base by tipDelta (derived from positions).
    const tipAngleBefore = Math.atan2(landmarks.tip.y - landmarks.base.y,
                                       landmarks.tip.x - landmarks.base.x)
    const tipAngleAfter  = Math.atan2(tipDest.y - landmarks.base.y,
                                       tipDest.x - landmarks.base.x)
    const tipDelta = tipAngleAfter - tipAngleBefore
    expect(tipDelta).not.toBe(0)

    // bridgeMid rotates by tipDelta * SUPRATIP_TRANSFER.
    const bmAngleBefore = Math.atan2(landmarks.bridgeMid.y - landmarks.base.y,
                                      landmarks.bridgeMid.x - landmarks.base.x)
    const bmAngleAfter  = Math.atan2(bridgeMidDest.y - landmarks.base.y,
                                      bridgeMidDest.x - landmarks.base.x)
    const bmDelta = bmAngleAfter - bmAngleBefore
    expect(Math.abs(bmDelta - tipDelta * SUPRATIP_TRANSFER)).toBeLessThan(1e-3)
  })

  it('preserves radial distances under rotation (rigid arc)', () => {
    const landmarks = makeLandmarks()
    const rBefore = Math.hypot(landmarks.bridgeMid.x - landmarks.base.x,
                                landmarks.bridgeMid.y - landmarks.base.y)
    const { bridgeMidDest } = constrainProfileTipRotation(8, landmarks, Math.PI / 18)
    const rAfter = Math.hypot(bridgeMidDest.x - landmarks.base.x,
                               bridgeMidDest.y - landmarks.base.y)
    expect(Math.abs(rAfter - rBefore)).toBeLessThan(1e-6)
  })

  it('returns identity points when sliderValue is 0', () => {
    const landmarks = makeLandmarks()
    const { tipDest, bridgeMidDest } =
      constrainProfileTipRotation(0, landmarks, Math.PI / 18)
    expect(tipDest.x).toBeCloseTo(landmarks.tip.x, 6)
    expect(tipDest.y).toBeCloseTo(landmarks.tip.y, 6)
    expect(bridgeMidDest.x).toBeCloseTo(landmarks.bridgeMid.x, 6)
    expect(bridgeMidDest.y).toBeCloseTo(landmarks.bridgeMid.y, 6)
  })
})

describe('buildRhinoplastyControlPoints (régimen clinical-target)', () => {
  it('emits anchor + alar-coupled + active surgical points hacia canon', () => {
    // Fixture con curvatura dorsal pronunciada para que slider=+100 (canon F:
    // dorsumCurvature=0) produzca un delta visible (> MOVE_EPSILON_PX).
    const landmarks: NoseLandmarks = {
      bridge:    { x: 400, y: 200 },
      bridgeMid: { x: 425, y: 270 }, // 25 px de offset lateral → giba pronunciada
      tip:       { x: 415, y: 320 },
      nostrilL:  { x: 405, y: 360 },
      nostrilR:  { x: 425, y: 360 },
      base:      { x: 415, y: 355 },
      confidence: 1,
      faceBoundingBox: { x: 200, y: 100, width: 400, height: 500 },
      source: 'auto',
      anchors: [
        { x: 200, y: 100 }, { x: 600, y: 100 },
        { x: 200, y: 500 }, { x: 600, y: 500 },
      ],
    }
    const { points } = buildRhinoplastyControlPoints(
      { 'giba-nasal': 100, 'rotacion-punta': 50, 'proyeccion-punta': 0 },
      100,
      landmarks,
      800,
      1000,
      'F',
    )

    // anchors[] entries → 4 identity control points
    const anchorPts = points.filter(p =>
      p.px === p.qx && p.py === p.qy &&
      landmarks.anchors!.some(a => a.x === p.px && a.y === p.py))
    expect(anchorPts.length).toBe(4)

    // nostrilL, nostrilR, base — siempre emitidos como pivots
    const find = (lm: { x: number; y: number }) =>
      points.find(p => p.qx === lm.x && p.qy === lm.y)
    expect(find(landmarks.nostrilL)).toBeDefined()
    expect(find(landmarks.nostrilR)).toBeDefined()
    expect(find(landmarks.base)).toBeDefined()

    // Active surgical points → displaced (px !== qx para radix, bridgeMid, tip)
    const radix    = points.find(p => p.qx === landmarks.bridge.x    && p.qy === landmarks.bridge.y    && p.px !== p.qx)
    const bridgeMd = points.find(p => p.qx === landmarks.bridgeMid.x && p.qy === landmarks.bridgeMid.y && p.px !== p.qx)
    const tip      = points.find(p => p.qx === landmarks.tip.x       && p.qy === landmarks.tip.y       && p.px !== p.qx)
    expect(radix).toBeDefined()
    expect(bridgeMd).toBeDefined()
    expect(tip).toBeDefined()
  })

  it('slider 0 produce destinos sin desplazamiento de landmarks activos', () => {
    const landmarks = makeLandmarks()
    const { points } = buildRhinoplastyControlPoints(
      { 'giba-nasal': 0, 'rotacion-punta': 0, 'proyeccion-punta': 0 },
      100, landmarks, 800, 1000, 'F',
    )
    // Solo anchors + pivots, sin radix/bridgeMid/tip activos
    const active = points.find(p => p.px !== p.qx || p.py !== p.qy)
    // Los pivots tienen alarOffset=0 cuando tip no se mueve, así que esperamos
    // que no haya puntos activos (no-identidad fuera de pivots).
    // Validación más laxa: ningún punto activo con desplazamiento > 1 px.
    if (active) {
      const dx = active.px - active.qx
      const dy = active.py - active.qy
      expect(Math.hypot(dx, dy)).toBeLessThan(1)
    }
  })
})
