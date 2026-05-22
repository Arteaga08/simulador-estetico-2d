import type { NoseLandmarks } from '@/lib/canvas/useFaceLandmarks'

export type FaceView = 'frontal' | 'perfil'

/**
 * Clasifica el tipo de toma (frontal o perfil) a partir de los landmarks.
 *
 * Métrica primaria: distancia horizontal entre las esquinas externas de los
 * ojos (lm33 y lm263) dividida por el ancho del bounding box facial.
 *
 *   Frontal: los ojos se separan amplio (~25-35% del ancho de cara)
 *   Perfil:  los dos ojos colapsan al mismo plano X en proyección 2D (~0-10%)
 *
 * Esto es mucho más confiable que comparar la distancia tip→ojo, porque en
 * perfil estricto MediaPipe estima la posición del ojo oculto detrás de la
 * nariz, dando distancias similares a ambos ojos (ratio ≈ 1, antes
 * clasificaba erróneamente como frontal).
 *
 * Umbral: 0.18 — separa claramente fotos frontales de perfil.
 */
export function classifyFaceView(landmarks: NoseLandmarks): FaceView {
  const anchors = landmarks.anchors

  if (anchors && anchors.length >= 4) {
    const leftEye  = anchors[2]  // lm33
    const rightEye = anchors[3]  // lm263
    const eyeDistance = Math.abs(rightEye.x - leftEye.x)
    const faceWidth = landmarks.faceBoundingBox?.width ?? eyeDistance * 4
    if (faceWidth > 1e-6) {
      const ratio = eyeDistance / faceWidth
      return ratio < 0.18 ? 'perfil' : 'frontal'
    }
  }

  // Fallback: asimetría de nostrils respecto al eje radix→tip.
  // En perfil, uno de los nostrils colapsa cerca del eje, el otro queda lejos.
  const midX = (landmarks.bridge.x + landmarks.tip.x) / 2
  const dL = Math.abs(landmarks.nostrilL.x - midX)
  const dR = Math.abs(landmarks.nostrilR.x - midX)
  const ratio = Math.max(dL, dR) / Math.max(Math.min(dL, dR), 1)
  return ratio >= 2.2 ? 'perfil' : 'frontal'
}
