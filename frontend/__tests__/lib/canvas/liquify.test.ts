import { describe, it, expect } from 'vitest'
import { computeDisplacement, applyLiquify } from '@/lib/canvas/liquify'

describe('computeDisplacement', () => {
  it('returns zero displacement when no control points', () => {
    const d = computeDisplacement(100, 100, [])
    expect(d).toEqual({ dx: 0, dy: 0 })
  })

  it('returns full displacement at control point center', () => {
    const d = computeDisplacement(100, 100, [{
      x: 100, y: 100, dx: 10, dy: 5, radius: 50,
    }])
    expect(d.dx).toBeCloseTo(10)
    expect(d.dy).toBeCloseTo(5)
  })

  it('returns zero displacement outside radius', () => {
    const d = computeDisplacement(0, 0, [{
      x: 200, y: 200, dx: 10, dy: 5, radius: 50,
    }])
    expect(d.dx).toBe(0)
    expect(d.dy).toBe(0)
  })

  it('blends two overlapping control points', () => {
    const d = computeDisplacement(100, 100, [
      { x: 100, y: 100, dx: 10, dy: 0, radius: 50 },
      { x: 100, y: 100, dx: 0,  dy: 10, radius: 50 },
    ])
    expect(d.dx).toBeCloseTo(10)
    expect(d.dy).toBeCloseTo(10)
  })
})

describe('applyLiquify', () => {
  it('returns an ImageData of the same dimensions', () => {
    const src = new ImageData(64, 64)
    const result = applyLiquify(src, [])
    expect(result.width).toBe(64)
    expect(result.height).toBe(64)
  })

  it('returns identical pixels when no control points', () => {
    const src = new ImageData(4, 4)
    src.data[0] = 255  // R of pixel (0,0)
    const result = applyLiquify(src, [])
    expect(result.data[0]).toBe(255)
  })
})
