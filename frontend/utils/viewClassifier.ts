import type { NoseLandmarks } from '@/lib/canvas/useFaceLandmarks'

export type FaceView = 'frontal' | 'tres-cuartos' | 'perfil'

/**
 * Clasifica el tipo de toma (frontal, ¾, perfil) a partir de los landmarks.
 *
 * Estrategia: comparar la distancia X del tip a cada esquina externa del ojo.
 * - Frontal: ambos ojos casi equidistantes (ratio ≈ 1)
 * - ¾: un ojo cerca, el otro lejos (ratio 1.5–3.5)
 * - Perfil: un ojo apenas visible o detrás del tip (ratio > 3.5)
 *
 * Las esquinas externas vienen como anchors[2] (lm33, ojo izq) y anchors[3]
 * (lm263, ojo der) en useFaceLandmarks.ts. Si los anchors no están disponibles,
 * se cae a una heurística basada en la asimetría de los nostrils.
 */
export function classifyFaceView(landmarks: NoseLandmarks): FaceView {
  const anchors = landmarks.anchors
  const tipX = landmarks.tip.x

  if (anchors && anchors.length >= 4) {
    const leftEye  = anchors[2]
    const rightEye = anchors[3]
    const dL = Math.abs(tipX - leftEye.x)
    const dR = Math.abs(rightEye.x - tipX)
    const ratio = Math.max(dL, dR) / Math.max(Math.min(dL, dR), 1)
    if (ratio < 1.5) return 'frontal'
    if (ratio < 3.5) return 'tres-cuartos'
    return 'perfil'
  }

  // Fallback: asimetría de nostrils respecto al eje radix→tip
  const midX = (landmarks.bridge.x + landmarks.tip.x) / 2
  const dL = Math.abs(landmarks.nostrilL.x - midX)
  const dR = Math.abs(landmarks.nostrilR.x - midX)
  const ratio = Math.max(dL, dR) / Math.max(Math.min(dL, dR), 1)
  if (ratio < 1.4) return 'frontal'
  if (ratio < 3.0) return 'tres-cuartos'
  return 'perfil'
}
