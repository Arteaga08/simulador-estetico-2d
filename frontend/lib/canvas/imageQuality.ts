import type { FaceView } from '@/utils/viewClassifier'
import {
  PHOTO_STANDARD,
  QUALITY_LABELS,
  QUALITY_TIPS,
} from '@/lib/clinicalPhotoStandard'

export type QualityCode =
  | 'low-resolution'
  | 'unusual-aspect'
  | 'face-too-small'
  | 'face-too-large'
  | 'too-dark'
  | 'too-bright'
  | 'uneven-lighting'
  | 'complex-background'
  | 'view-mismatch'
  | 'no-face-detected'

export type QualitySeverity = 'info' | 'warning'

export interface QualityWarning {
  code: QualityCode
  severity: QualitySeverity
  label: string
  tip: string
}

export interface QualityReport {
  ok: boolean
  warnings: QualityWarning[]
}

interface AnalyzeArgs {
  img: HTMLImageElement | ImageBitmap
  faceBoundingBox?: { x: number; y: number; width: number; height: number }
  taggedView?: FaceView | null
  detectedView?: FaceView | null
}

const ANALYZE_MAX_DIM = 256

/** Build a small luma sample of the image for histogram / std checks. Larger
 *  images are downsampled to keep the analysis under ~5ms. */
function sampleLuma(
  img: HTMLImageElement | ImageBitmap,
): { data: Uint8Array; w: number; h: number } | null {
  const W = img.width
  const H = img.height
  if (W === 0 || H === 0) return null
  const scale = Math.min(1, ANALYZE_MAX_DIM / Math.max(W, H))
  const w = Math.max(1, Math.round(W * scale))
  const h = Math.max(1, Math.round(H * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(img as CanvasImageSource, 0, 0, w, h)
  let raw: ImageData
  try {
    raw = ctx.getImageData(0, 0, w, h)
  } catch {
    // Cross-origin or tainted canvas — give up silently.
    return null
  }
  const luma = new Uint8Array(w * h)
  for (let i = 0, j = 0; i < raw.data.length; i += 4, j++) {
    // BT.601 luma weights.
    luma[j] = (raw.data[i] * 299 + raw.data[i + 1] * 587 + raw.data[i + 2] * 114) / 1000
  }
  return { data: luma, w, h }
}

function median(arr: Uint8Array | number[]): number {
  const a = Array.from(arr).sort((x, y) => x - y)
  return a[Math.floor(a.length / 2)] ?? 0
}

function meanStd(arr: Uint8Array | number[]): { mean: number; std: number } {
  let sum = 0
  for (const v of arr) sum += v
  const mean = sum / arr.length
  let sq = 0
  for (const v of arr) sq += (v - mean) ** 2
  return { mean, std: Math.sqrt(sq / arr.length) }
}

function makeWarning(code: QualityCode, severity: QualitySeverity): QualityWarning {
  return {
    code,
    severity,
    label: QUALITY_LABELS[code] ?? code,
    tip: QUALITY_TIPS[code] ?? '',
  }
}

/**
 * Inspect an uploaded image and return a list of soft warnings about its
 * quality. Never throws. Never blocks. Callers display warnings but always
 * allow the surgeon to continue.
 */
export function analyzeImageQuality(args: AnalyzeArgs): QualityReport {
  const { img, faceBoundingBox, taggedView, detectedView } = args
  const warnings: QualityWarning[] = []

  const W = img.width
  const H = img.height

  // 1. Resolution
  if (Math.min(W, H) < PHOTO_STANDARD.minResolution) {
    warnings.push(makeWarning('low-resolution', 'warning'))
  }

  // 2. Aspect ratio
  const aspect = Math.max(W, H) / Math.max(1, Math.min(W, H))
  if (aspect > PHOTO_STANDARD.maxAspectRatio) {
    warnings.push(makeWarning('unusual-aspect', 'info'))
  }

  // 3. Face framing (requires face bbox)
  if (faceBoundingBox) {
    const faceFraction = faceBoundingBox.height / Math.max(1, H)
    if (faceFraction < PHOTO_STANDARD.minFaceFraction) {
      warnings.push(makeWarning('face-too-small', 'warning'))
    } else if (faceFraction > PHOTO_STANDARD.maxFaceFraction) {
      warnings.push(makeWarning('face-too-large', 'info'))
    }
  } else {
    warnings.push(makeWarning('no-face-detected', 'warning'))
  }

  // 4. Brightness + uniformity + background complexity (single pass over luma)
  const sample = sampleLuma(img)
  if (sample) {
    const { data, w, h } = sample
    const med = median(data)
    const [minMed, maxMed] = PHOTO_STANDARD.brightnessMedianRange
    if (med < minMed) warnings.push(makeWarning('too-dark', 'warning'))
    else if (med > maxMed) warnings.push(makeWarning('too-bright', 'warning'))

    const overall = meanStd(data)
    if (overall.mean > 0 && overall.std / overall.mean > PHOTO_STANDARD.brightnessUniformityMax) {
      warnings.push(makeWarning('uneven-lighting', 'info'))
    }

    // Background complexity: sample border pixels (outermost 10%) that fall
    // outside the face bounding box, if known. Map face bbox into the
    // downsampled coords.
    const borderPx = Math.max(2, Math.round(Math.min(w, h) * 0.1))
    const scaleX = w / W
    const scaleY = h / H
    const bbX = faceBoundingBox ? faceBoundingBox.x * scaleX : -1
    const bbY = faceBoundingBox ? faceBoundingBox.y * scaleY : -1
    const bbX2 = faceBoundingBox ? (faceBoundingBox.x + faceBoundingBox.width) * scaleX : -1
    const bbY2 = faceBoundingBox ? (faceBoundingBox.y + faceBoundingBox.height) * scaleY : -1
    const borderSamples: number[] = []
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const inBorder =
          x < borderPx || x >= w - borderPx || y < borderPx || y >= h - borderPx
        if (!inBorder) continue
        if (
          faceBoundingBox &&
          x >= bbX && x <= bbX2 && y >= bbY && y <= bbY2
        ) {
          continue
        }
        borderSamples.push(data[y * w + x])
      }
    }
    if (borderSamples.length > 50) {
      const bg = meanStd(borderSamples)
      if (bg.std > PHOTO_STANDARD.backgroundComplexityMax) {
        warnings.push(makeWarning('complex-background', 'info'))
      }
    }
  }

  // 5. View mismatch
  if (taggedView && detectedView && taggedView !== detectedView) {
    warnings.push(makeWarning('view-mismatch', 'warning'))
  }

  return {
    ok: warnings.length === 0,
    warnings,
  }
}
